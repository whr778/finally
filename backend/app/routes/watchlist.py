"""Watchlist API routes: get, add, remove tickers."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.database import get_db
from app.models import WatchlistAddRequest, WatchlistEntry

router = APIRouter()

USER_ID = "default"
_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/api/watchlist", response_model=list[WatchlistEntry])
async def get_watchlist(request: Request):
    price_cache = request.app.state.price_cache
    async with get_db() as db:
        rows = await (
            await db.execute(
                "SELECT ticker FROM watchlist WHERE user_id = ? ORDER BY added_at",
                (USER_ID,),
            )
        ).fetchall()

    entries = []
    for r in rows:
        ticker = r["ticker"]
        update = price_cache.get(ticker)
        entries.append(
            WatchlistEntry(
                ticker=ticker,
                price=update.price if update else None,
                previous_price=update.previous_price if update else None,
                change_percent=update.change_percent if update else None,
                direction=update.direction if update else None,
            )
        )
    return entries


@router.post("/api/watchlist", response_model=WatchlistEntry, status_code=201)
async def add_to_watchlist(body: WatchlistAddRequest, request: Request):
    ticker = body.ticker.strip().upper()
    if not _TICKER_RE.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")

    async with get_db() as db:
        existing = await (
            await db.execute(
                "SELECT id FROM watchlist WHERE user_id = ? AND ticker = ?",
                (USER_ID, ticker),
            )
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail=f"{ticker} is already on your watchlist")

        await db.execute(
            "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), USER_ID, ticker, _now()),
        )
        await db.commit()

    await request.app.state.market_source.add_ticker(ticker)

    price_cache = request.app.state.price_cache
    update = price_cache.get(ticker)
    return WatchlistEntry(
        ticker=ticker,
        price=update.price if update else None,
        previous_price=update.previous_price if update else None,
        change_percent=update.change_percent if update else None,
        direction=update.direction if update else None,
    )


@router.delete("/api/watchlist/{ticker}", status_code=204)
async def remove_from_watchlist(ticker: str, request: Request):
    ticker = ticker.upper()
    async with get_db() as db:
        result = await db.execute(
            "DELETE FROM watchlist WHERE user_id = ? AND ticker = ?",
            (USER_ID, ticker),
        )
        await db.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"{ticker} not on watchlist")

    await request.app.state.market_source.remove_ticker(ticker)
