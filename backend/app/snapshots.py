"""Portfolio snapshot background tasks.

Two tasks run via the FastAPI lifespan:

1. ``intraday_snapshot_loop`` — every 30 seconds, compute the user's total
   portfolio value (cash + sum of position market values) and insert a row
   into ``portfolio_snapshots``.

2. ``end_of_day_loop`` — at 16:00 America/New_York Mon-Fri, collapse all of
   the day's intraday rows into a single end-of-day snapshot and delete the
   intraday rows for that NY trading day.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.database import get_db

USER_ID = "default"
NY_TZ = ZoneInfo("America/New_York")
SNAPSHOT_INTERVAL_SECONDS = 30
MARKET_CLOSE_HOUR = 16  # 4:00 PM ET


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def insert_snapshot(price_cache) -> None:
    """Compute total portfolio value and insert one snapshot row."""
    async with get_db() as db:
        row = await (
            await db.execute(
                "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
            )
        ).fetchone()
        cash = row["cash_balance"] if row else 0.0

        rows = await (
            await db.execute(
                "SELECT ticker, quantity FROM positions WHERE user_id = ?", (USER_ID,)
            )
        ).fetchall()

        total = cash
        for r in rows:
            p = price_cache.get_price(r["ticker"])
            if p:
                total += p * r["quantity"]

        await db.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
            "VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, round(total, 4), _now_iso()),
        )
        await db.commit()


async def aggregate_end_of_day(trading_day: date, close_time_utc: datetime) -> None:
    """Collapse intraday snapshots for ``trading_day`` (NY tz) into one EOD row.

    The EOD row uses the last intraday value of the day and ``close_time_utc``
    as its ``recorded_at``. If no intraday rows exist for the day, do nothing.
    """
    target_iso = trading_day.isoformat()

    async with get_db() as db:
        rows = await (
            await db.execute(
                "SELECT id, total_value, recorded_at FROM portfolio_snapshots "
                "WHERE user_id = ? ORDER BY recorded_at",
                (USER_ID,),
            )
        ).fetchall()

        ids_to_delete: list[str] = []
        last_value: float | None = None
        for r in rows:
            recorded = datetime.fromisoformat(r["recorded_at"])
            if recorded.tzinfo is None:
                recorded = recorded.replace(tzinfo=timezone.utc)
            if recorded.astimezone(NY_TZ).date().isoformat() == target_iso:
                ids_to_delete.append(r["id"])
                last_value = r["total_value"]

        if not ids_to_delete or last_value is None:
            return

        await db.executemany(
            "DELETE FROM portfolio_snapshots WHERE id = ?",
            [(i,) for i in ids_to_delete],
        )
        await db.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
            "VALUES (?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                USER_ID,
                last_value,
                close_time_utc.astimezone(timezone.utc).isoformat(),
            ),
        )
        await db.commit()


def next_market_close(now_ny: datetime) -> datetime:
    """Return the next 16:00 America/New_York on a weekday (Mon-Fri)."""
    candidate = now_ny.replace(hour=MARKET_CLOSE_HOUR, minute=0, second=0, microsecond=0)
    if candidate <= now_ny:
        candidate = candidate + timedelta(days=1)
    while candidate.weekday() >= 5:  # 5=Sat, 6=Sun
        candidate = candidate + timedelta(days=1)
    return candidate


async def intraday_snapshot_loop(price_cache) -> None:
    """Insert a snapshot every ``SNAPSHOT_INTERVAL_SECONDS``."""
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
        try:
            await insert_snapshot(price_cache)
        except Exception:
            # Background task must not die; next tick will retry.
            pass


async def end_of_day_loop() -> None:
    """Sleep until the next NY market close, then aggregate that day."""
    while True:
        now_ny = datetime.now(NY_TZ)
        next_close = next_market_close(now_ny)
        sleep_seconds = (next_close - now_ny).total_seconds()
        await asyncio.sleep(max(sleep_seconds, 1.0))
        try:
            close_utc = next_close.astimezone(timezone.utc)
            await aggregate_end_of_day(next_close.date(), close_utc)
        except Exception:
            pass


def start_snapshot_tasks(price_cache) -> list[asyncio.Task]:
    """Start both background tasks; return the task handles for cancellation."""
    return [
        asyncio.create_task(intraday_snapshot_loop(price_cache)),
        asyncio.create_task(end_of_day_loop()),
    ]
