"""FinAlly FastAPI application."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Load .env from the project root (one level above backend/).
# No-op if vars are already set (e.g., Docker --env-file).
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from app.database import get_db, init_db
from app.market import PriceCache, create_market_data_source, create_stream_router
from app.routes.chat import router as chat_router
from app.routes.health import router as health_router
from app.routes.portfolio import router as portfolio_router, _insert_snapshot
from app.routes.watchlist import router as watchlist_router

# Path where the Next.js static export is placed (Dockerfile copies it here).
_STATIC_DIR = Path(__file__).parent.parent / "static"

# Create price_cache at module level so the stream router can reference it
# and the lifespan can assign it to app.state for portfolio routes.
_price_cache = PriceCache()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database, start market data source on startup; stop on shutdown."""
    await init_db()

    app.state.price_cache = _price_cache

    async with get_db() as db:
        rows = await (
            await db.execute("SELECT ticker FROM watchlist WHERE user_id = 'default'")
        ).fetchall()
        initial_tickers = [r["ticker"] for r in rows]

    source = create_market_data_source(_price_cache)
    app.state.market_source = source
    await source.start(initial_tickers)

    snapshot_task = asyncio.create_task(_snapshot_loop(_price_cache))

    yield

    snapshot_task.cancel()
    await source.stop()


async def _snapshot_loop(price_cache: PriceCache) -> None:
    """Record a portfolio snapshot every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        try:
            await _insert_snapshot(price_cache)
        except Exception:
            pass


app = FastAPI(title="FinAlly API", version="0.1.0", lifespan=lifespan)

app.include_router(health_router)
app.include_router(portfolio_router)
app.include_router(watchlist_router)
app.include_router(chat_router)
app.include_router(create_stream_router(_price_cache))

# Serve the Next.js static export when present (production / Docker).
# API routes above take priority; this catch-all handles the SPA and assets.
if _STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_STATIC_DIR), html=True), name="static")
