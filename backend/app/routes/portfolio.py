"""Portfolio API routes: positions, trade execution, history."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.database import get_db
from app.models import PortfolioOut, PositionOut, SnapshotOut, TradeOut, TradeRequest

router = APIRouter()

USER_ID = "default"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_portfolio(price_cache) -> PortfolioOut:
    """Build the current portfolio state from DB + price cache."""
    async with get_db() as db:
        row = await (
            await db.execute(
                "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
            )
        ).fetchone()
        cash = row["cash_balance"] if row else 10000.0

        rows = await (
            await db.execute(
                "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ?",
                (USER_ID,),
            )
        ).fetchall()

    positions = []
    total_value = cash

    for r in rows:
        ticker, qty, avg_cost = r["ticker"], r["quantity"], r["avg_cost"]
        update = price_cache.get(ticker)
        current_price = update.price if update else None
        if current_price is not None:
            unrealized_pnl = round((current_price - avg_cost) * qty, 4)
            pct_change = round((current_price - avg_cost) / avg_cost * 100, 4) if avg_cost else 0.0
            total_value += current_price * qty
        else:
            unrealized_pnl = None
            pct_change = None

        positions.append(
            PositionOut(
                ticker=ticker,
                quantity=qty,
                avg_cost=avg_cost,
                current_price=current_price,
                unrealized_pnl=unrealized_pnl,
                pct_change=pct_change,
            )
        )

    return PortfolioOut(cash_balance=cash, positions=positions, total_value=round(total_value, 4))


@router.get("/api/portfolio", response_model=PortfolioOut)
async def get_portfolio(request: Request):
    return await _get_portfolio(request.app.state.price_cache)


@router.post("/api/portfolio/trade", response_model=TradeOut)
async def execute_trade(body: TradeRequest, request: Request):
    """Execute a market order at the current cached price."""
    price_cache = request.app.state.price_cache

    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be > 0")
    if body.side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")

    ticker = body.ticker.upper()
    update = price_cache.get(ticker)
    if update is None:
        raise HTTPException(status_code=404, detail=f"No price available for {ticker}")

    price = update.price
    now = _now()
    trade_id = str(uuid.uuid4())

    async with get_db() as db:
        row = await (
            await db.execute(
                "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
            )
        ).fetchone()
        cash = row["cash_balance"]

        if body.side == "buy":
            cost = price * body.quantity
            if cash < cost:
                raise HTTPException(status_code=400, detail="Insufficient cash")
            new_cash = cash - cost

            pos = await (
                await db.execute(
                    "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                    (USER_ID, ticker),
                )
            ).fetchone()

            if pos:
                old_qty = pos["quantity"]
                old_avg = pos["avg_cost"]
                new_qty = old_qty + body.quantity
                new_avg = (old_avg * old_qty + price * body.quantity) / new_qty
                await db.execute(
                    "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? "
                    "WHERE user_id = ? AND ticker = ?",
                    (new_qty, new_avg, now, USER_ID, ticker),
                )
            else:
                await db.execute(
                    "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), USER_ID, ticker, body.quantity, price, now),
                )

        else:  # sell
            pos = await (
                await db.execute(
                    "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                    (USER_ID, ticker),
                )
            ).fetchone()
            if not pos or pos["quantity"] < body.quantity:
                raise HTTPException(status_code=400, detail="Insufficient shares")

            new_cash = cash + price * body.quantity
            new_qty = pos["quantity"] - body.quantity

            if new_qty < 1e-9:
                await db.execute(
                    "DELETE FROM positions WHERE user_id = ? AND ticker = ?",
                    (USER_ID, ticker),
                )
            else:
                await db.execute(
                    "UPDATE positions SET quantity = ?, updated_at = ? "
                    "WHERE user_id = ? AND ticker = ?",
                    (new_qty, now, USER_ID, ticker),
                )

        await db.execute(
            "UPDATE users_profile SET cash_balance = ? WHERE user_id = ?",
            (new_cash, USER_ID),
        )
        await db.execute(
            "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (trade_id, USER_ID, ticker, body.side, body.quantity, price, now),
        )
        await db.commit()

    try:
        await _insert_snapshot(price_cache)
    except Exception:
        pass  # snapshot failure must not roll back a committed trade

    return TradeOut(
        ticker=ticker,
        side=body.side,
        quantity=body.quantity,
        price=price,
        executed_at=now,
    )


@router.get("/api/portfolio/history", response_model=list[SnapshotOut])
async def portfolio_history():
    async with get_db() as db:
        rows = await (
            await db.execute(
                "SELECT total_value, recorded_at FROM portfolio_snapshots "
                "WHERE user_id = ? ORDER BY recorded_at",
                (USER_ID,),
            )
        ).fetchall()
    return [SnapshotOut(total_value=r["total_value"], recorded_at=r["recorded_at"]) for r in rows]


async def _insert_snapshot(price_cache) -> None:
    """Compute total portfolio value and store a snapshot."""
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
            (str(uuid.uuid4()), USER_ID, round(total, 4), _now()),
        )
        await db.commit()
