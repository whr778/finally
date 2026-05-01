"""Tests for portfolio snapshot background tasks (app/snapshots.py)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio

from app.database import get_db, init_db
from app.market.cache import PriceCache
from app.snapshots import (
    NY_TZ,
    aggregate_end_of_day,
    insert_snapshot,
    next_market_close,
)


@pytest_asyncio.fixture
async def db(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "test.db"))
    await init_db()
    yield


async def _insert_raw_snapshot(value: float, recorded_at: datetime) -> None:
    async with get_db() as conn:
        await conn.execute(
            "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
            "VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), "default", value, recorded_at.isoformat()),
        )
        await conn.commit()


async def _all_snapshots() -> list[dict]:
    async with get_db() as conn:
        rows = await (
            await conn.execute(
                "SELECT total_value, recorded_at FROM portfolio_snapshots "
                "WHERE user_id = 'default' ORDER BY recorded_at"
            )
        ).fetchall()
    return [dict(r) for r in rows]


class TestNextMarketClose:
    def test_before_close_same_day(self):
        # Wednesday at 10:00 ET
        now = datetime(2026, 5, 6, 10, 0, tzinfo=NY_TZ)
        nxt = next_market_close(now)
        assert nxt == datetime(2026, 5, 6, 16, 0, tzinfo=NY_TZ)

    def test_after_close_next_day(self):
        # Wednesday at 17:00 ET -> next is Thursday 16:00
        now = datetime(2026, 5, 6, 17, 0, tzinfo=NY_TZ)
        nxt = next_market_close(now)
        assert nxt == datetime(2026, 5, 7, 16, 0, tzinfo=NY_TZ)

    def test_friday_after_close_skips_to_monday(self):
        # Friday at 17:00 ET -> next is Monday 16:00
        now = datetime(2026, 5, 8, 17, 0, tzinfo=NY_TZ)  # Friday
        nxt = next_market_close(now)
        assert nxt.weekday() == 0  # Monday
        assert nxt == datetime(2026, 5, 11, 16, 0, tzinfo=NY_TZ)

    def test_saturday_skips_to_monday(self):
        now = datetime(2026, 5, 9, 10, 0, tzinfo=NY_TZ)  # Saturday
        nxt = next_market_close(now)
        assert nxt == datetime(2026, 5, 11, 16, 0, tzinfo=NY_TZ)

    def test_sunday_skips_to_monday(self):
        now = datetime(2026, 5, 10, 10, 0, tzinfo=NY_TZ)  # Sunday
        nxt = next_market_close(now)
        assert nxt == datetime(2026, 5, 11, 16, 0, tzinfo=NY_TZ)


class TestInsertSnapshot:
    @pytest.mark.asyncio
    async def test_records_cash_only_when_no_positions(self, db):
        cache = PriceCache()
        await insert_snapshot(cache)
        rows = await _all_snapshots()
        assert len(rows) == 1
        assert rows[0]["total_value"] == pytest.approx(10000.0)

    @pytest.mark.asyncio
    async def test_includes_position_market_value(self, db):
        cache = PriceCache()
        cache.update("AAPL", 200.0)

        async with get_db() as conn:
            await conn.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), "default", "AAPL", 5.0, 190.0, "2026-05-01T00:00:00+00:00"),
            )
            await conn.commit()

        await insert_snapshot(cache)
        rows = await _all_snapshots()
        assert len(rows) == 1
        # 10000 cash + 5 * 200 = 11000
        assert rows[0]["total_value"] == pytest.approx(11000.0)

    @pytest.mark.asyncio
    async def test_skips_positions_without_price(self, db):
        cache = PriceCache()  # no prices set

        async with get_db() as conn:
            await conn.execute(
                "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), "default", "AAPL", 5.0, 190.0, "2026-05-01T00:00:00+00:00"),
            )
            await conn.commit()

        await insert_snapshot(cache)
        rows = await _all_snapshots()
        # Cash only — position skipped because no price
        assert rows[0]["total_value"] == pytest.approx(10000.0)


class TestAggregateEndOfDay:
    @pytest.mark.asyncio
    async def test_collapses_multiple_intraday_into_one_eod(self, db):
        # Three snapshots all during NY day 2026-05-06
        ny_day = datetime(2026, 5, 6, 12, 0, tzinfo=NY_TZ)
        for i, value in enumerate([10000.0, 10100.0, 10250.0]):
            await _insert_raw_snapshot(
                value, (ny_day + timedelta(hours=i)).astimezone(timezone.utc)
            )

        close_ny = datetime(2026, 5, 6, 16, 0, tzinfo=NY_TZ)
        close_utc = close_ny.astimezone(timezone.utc)
        await aggregate_end_of_day(close_ny.date(), close_utc)

        rows = await _all_snapshots()
        assert len(rows) == 1
        # Last value of the day was 10250
        assert rows[0]["total_value"] == pytest.approx(10250.0)
        assert rows[0]["recorded_at"] == close_utc.isoformat()

    @pytest.mark.asyncio
    async def test_does_not_touch_other_days(self, db):
        # Two snapshots on Monday, one on Tuesday
        mon = datetime(2026, 5, 4, 12, 0, tzinfo=NY_TZ)
        tue = datetime(2026, 5, 5, 12, 0, tzinfo=NY_TZ)
        await _insert_raw_snapshot(100.0, mon.astimezone(timezone.utc))
        await _insert_raw_snapshot(200.0, (mon + timedelta(hours=1)).astimezone(timezone.utc))
        await _insert_raw_snapshot(999.0, tue.astimezone(timezone.utc))

        close_mon = datetime(2026, 5, 4, 16, 0, tzinfo=NY_TZ)
        await aggregate_end_of_day(close_mon.date(), close_mon.astimezone(timezone.utc))

        rows = await _all_snapshots()
        # 1 EOD for Monday (200.0) + 1 untouched Tuesday row (999.0)
        assert len(rows) == 2
        values = sorted(r["total_value"] for r in rows)
        assert values == pytest.approx([200.0, 999.0])

    @pytest.mark.asyncio
    async def test_no_op_when_day_has_no_snapshots(self, db):
        # One snapshot on Tuesday only
        tue = datetime(2026, 5, 5, 12, 0, tzinfo=NY_TZ)
        await _insert_raw_snapshot(500.0, tue.astimezone(timezone.utc))

        # Aggregate Monday (no snapshots) — should be no-op
        close_mon = datetime(2026, 5, 4, 16, 0, tzinfo=NY_TZ)
        await aggregate_end_of_day(close_mon.date(), close_mon.astimezone(timezone.utc))

        rows = await _all_snapshots()
        assert len(rows) == 1
        assert rows[0]["total_value"] == pytest.approx(500.0)

    @pytest.mark.asyncio
    async def test_handles_naive_timestamp_as_utc(self, db):
        # Some legacy rows might be naive; the aggregator treats them as UTC.
        ny_day_iso = "2026-05-06"
        # 12:00 UTC on 2026-05-06 is 08:00 ET, same NY date
        async with get_db() as conn:
            await conn.execute(
                "INSERT INTO portfolio_snapshots (id, user_id, total_value, recorded_at) "
                "VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), "default", 123.0, "2026-05-06T12:00:00"),
            )
            await conn.commit()

        close_ny = datetime(2026, 5, 6, 16, 0, tzinfo=NY_TZ)
        await aggregate_end_of_day(close_ny.date(), close_ny.astimezone(timezone.utc))

        rows = await _all_snapshots()
        assert len(rows) == 1
        assert rows[0]["total_value"] == pytest.approx(123.0)
        assert ny_day_iso in rows[0]["recorded_at"] or "2026-05-06" in rows[0]["recorded_at"]
