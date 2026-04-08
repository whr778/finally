"""SQLite database with lazy initialization via aiosqlite."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

DEFAULT_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS users_profile (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    cash_balance REAL DEFAULT 10000.0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    added_at TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS positions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    quantity REAL,
    avg_cost REAL,
    updated_at TEXT,
    UNIQUE(user_id, ticker)
);

CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    ticker TEXT,
    side TEXT,
    quantity REAL,
    price REAL,
    executed_at TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    total_value REAL,
    recorded_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    role TEXT,
    content TEXT,
    actions TEXT,
    created_at TEXT
);
"""


def _db_path() -> str:
    env_path = os.environ.get("DB_PATH", "").strip()
    if env_path:
        return env_path
    backend_dir = Path(__file__).parent.parent
    return str((backend_dir / "../db/finally.db").resolve())


async def init_db() -> None:
    """Create tables and seed default data if the database is empty."""
    db_file = _db_path()
    Path(db_file).parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(db_file) as db:
        await db.executescript(_SCHEMA)
        await db.commit()

        row = await (await db.execute("SELECT COUNT(*) FROM users_profile")).fetchone()
        if row[0] == 0:
            await _seed(db)
            await db.commit()


async def _seed(db: aiosqlite.Connection) -> None:
    """Insert the default user profile and watchlist."""
    from datetime import datetime, timezone
    import uuid

    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO users_profile (id, user_id, cash_balance, created_at) VALUES (?, ?, ?, ?)",
        ("default", "default", 10000.0, now),
    )
    for ticker in DEFAULT_TICKERS:
        await db.execute(
            "INSERT OR IGNORE INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
            (str(uuid.uuid4()), "default", ticker, now),
        )


@asynccontextmanager
async def get_db():
    """Async context manager yielding an aiosqlite connection."""
    async with aiosqlite.connect(_db_path()) as db:
        db.row_factory = aiosqlite.Row
        yield db
