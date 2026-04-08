"""Chat API route: send a message, get AI response, auto-execute actions."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app.database import get_db
from app.llm import call_llm
from app.models import (
    ChatOut,
    ChatRequest,
    ChatTradeResult,
    ChatWatchlistResult,
)

router = APIRouter()

USER_ID = "default"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _portfolio_context(price_cache) -> str:
    """Build a text summary of the current portfolio for the LLM prompt."""
    async with get_db() as db:
        row = await (
            await db.execute(
                "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
            )
        ).fetchone()
        cash = row["cash_balance"] if row else 10000.0

        positions = await (
            await db.execute(
                "SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ?", (USER_ID,)
            )
        ).fetchall()

        watchlist = await (
            await db.execute(
                "SELECT ticker FROM watchlist WHERE user_id = ?", (USER_ID,)
            )
        ).fetchall()

    lines = [f"Cash: ${cash:,.2f}"]
    total = cash
    for p in positions:
        ticker, qty, avg = p["ticker"], p["quantity"], p["avg_cost"]
        update = price_cache.get(ticker)
        if update:
            pnl = (update.price - avg) * qty
            total += update.price * qty
            lines.append(
                f"  {ticker}: {qty} shares @ avg ${avg:.2f}, "
                f"current ${update.price:.2f}, P&L ${pnl:+.2f}"
            )
        else:
            lines.append(f"  {ticker}: {qty} shares @ avg ${avg:.2f}")

    lines.insert(1, f"Total portfolio value: ${total:,.2f}")
    lines.append("Watchlist: " + ", ".join(r["ticker"] for r in watchlist))
    return "\n".join(lines)


async def _load_history(limit: int = 5) -> list[dict]:
    async with get_db() as db:
        rows = await (
            await db.execute(
                "SELECT role, content FROM chat_messages WHERE user_id = ? "
                "ORDER BY created_at DESC LIMIT ?",
                (USER_ID, limit * 2),
            )
        ).fetchall()
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]


async def _save_message(role: str, content: str, actions: dict | None = None) -> None:
    async with get_db() as db:
        await db.execute(
            "INSERT INTO chat_messages (id, user_id, role, content, actions, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                str(uuid.uuid4()),
                USER_ID,
                role,
                content,
                json.dumps(actions) if actions else None,
                _now(),
            ),
        )
        await db.commit()


@router.post("/api/chat", response_model=ChatOut)
async def chat(body: ChatRequest, request: Request):
    price_cache = request.app.state.price_cache
    market_source = request.app.state.market_source

    context = await _portfolio_context(price_cache)
    history = await _load_history()

    await _save_message("user", body.content)

    llm_resp = await call_llm(context, history, body.content)

    trades_executed: list[ChatTradeResult] = []
    watchlist_changes: list[ChatWatchlistResult] = []

    # Auto-execute trades
    for trade in llm_resp.get("trades") or []:
        ticker = trade["ticker"].upper()
        side = trade["side"]
        quantity = float(trade["quantity"])
        try:
            update = price_cache.get(ticker)
            if update is None:
                raise ValueError(f"No price available for {ticker}")
            price = update.price
            now = _now()
            async with get_db() as db:
                row = await (
                    await db.execute(
                        "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
                    )
                ).fetchone()
                cash = row["cash_balance"]

                if side == "buy":
                    cost = price * quantity
                    if cash < cost:
                        raise ValueError("Insufficient cash")
                    new_cash = cash - cost
                    pos = await (
                        await db.execute(
                            "SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                            (USER_ID, ticker),
                        )
                    ).fetchone()
                    if pos:
                        new_qty = pos["quantity"] + quantity
                        new_avg = (pos["avg_cost"] * pos["quantity"] + price * quantity) / new_qty
                        await db.execute(
                            "UPDATE positions SET quantity=?, avg_cost=?, updated_at=? "
                            "WHERE user_id=? AND ticker=?",
                            (new_qty, new_avg, now, USER_ID, ticker),
                        )
                    else:
                        await db.execute(
                            "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                            "VALUES (?, ?, ?, ?, ?, ?)",
                            (str(uuid.uuid4()), USER_ID, ticker, quantity, price, now),
                        )
                else:
                    pos = await (
                        await db.execute(
                            "SELECT quantity FROM positions WHERE user_id = ? AND ticker = ?",
                            (USER_ID, ticker),
                        )
                    ).fetchone()
                    if not pos or pos["quantity"] < quantity:
                        raise ValueError("Insufficient shares")
                    new_cash = cash + price * quantity
                    new_qty = pos["quantity"] - quantity
                    if new_qty < 1e-9:
                        await db.execute(
                            "DELETE FROM positions WHERE user_id=? AND ticker=?",
                            (USER_ID, ticker),
                        )
                    else:
                        await db.execute(
                            "UPDATE positions SET quantity=?, updated_at=? "
                            "WHERE user_id=? AND ticker=?",
                            (new_qty, now, USER_ID, ticker),
                        )

                await db.execute(
                    "UPDATE users_profile SET cash_balance=? WHERE user_id=?",
                    (new_cash, USER_ID),
                )
                await db.execute(
                    "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (str(uuid.uuid4()), USER_ID, ticker, side, quantity, price, now),
                )
                await db.commit()

            trades_executed.append(
                ChatTradeResult(ticker=ticker, side=side, quantity=quantity, price=price, success=True)
            )
        except Exception as e:
            trades_executed.append(
                ChatTradeResult(ticker=ticker, side=side, quantity=quantity, price=0.0, success=False, error=str(e))
            )

    # Auto-execute watchlist changes
    for change in llm_resp.get("watchlist_changes") or []:
        ticker = change["ticker"].upper()
        action = change["action"]
        try:
            if action == "add":
                async with get_db() as db:
                    existing = await (
                        await db.execute(
                            "SELECT id FROM watchlist WHERE user_id=? AND ticker=?",
                            (USER_ID, ticker),
                        )
                    ).fetchone()
                    if not existing:
                        await db.execute(
                            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                            (str(uuid.uuid4()), USER_ID, ticker, _now()),
                        )
                        await db.commit()
                        await market_source.add_ticker(ticker)
            else:
                async with get_db() as db:
                    await db.execute(
                        "DELETE FROM watchlist WHERE user_id=? AND ticker=?",
                        (USER_ID, ticker),
                    )
                    await db.commit()
                await market_source.remove_ticker(ticker)

            watchlist_changes.append(ChatWatchlistResult(ticker=ticker, action=action, success=True))
        except Exception as e:
            watchlist_changes.append(
                ChatWatchlistResult(ticker=ticker, action=action, success=False, error=str(e))
            )

    actions = None
    if trades_executed or watchlist_changes:
        actions = {
            "trades": [t.model_dump() for t in trades_executed],
            "watchlist_changes": [w.model_dump() for w in watchlist_changes],
        }

    await _save_message("assistant", llm_resp.get("message", ""), actions)

    return ChatOut(
        message=llm_resp.get("message", ""),
        trades_executed=trades_executed,
        watchlist_changes=watchlist_changes,
    )
