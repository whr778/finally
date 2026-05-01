"""Tests for database lazy init, schema, and seeding."""

from __future__ import annotations

from pathlib import Path

import aiosqlite
import pytest

from app.database import DEFAULT_TICKERS, init_db

EXPECTED_TABLES = {
    "users_profile",
    "watchlist",
    "positions",
    "trades",
    "portfolio_snapshots",
    "chat_messages",
}


@pytest.fixture
def fresh_db_path(tmp_path, monkeypatch):
    db_file = tmp_path / "fresh.db"
    monkeypatch.setenv("DB_PATH", str(db_file))
    return db_file


async def _table_names(db_file: Path) -> set[str]:
    async with aiosqlite.connect(str(db_file)) as db:
        rows = await (
            await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        ).fetchall()
        return {r[0] for r in rows}


async def test_init_db_creates_file(fresh_db_path):
    assert not fresh_db_path.exists()
    await init_db()
    assert fresh_db_path.exists()


async def test_init_db_creates_all_tables(fresh_db_path):
    await init_db()
    assert EXPECTED_TABLES.issubset(await _table_names(fresh_db_path))


async def test_init_db_seeds_default_user(fresh_db_path):
    await init_db()
    async with aiosqlite.connect(str(fresh_db_path)) as db:
        row = await (
            await db.execute("SELECT cash_balance FROM users_profile WHERE id = 'default'")
        ).fetchone()
    assert row is not None
    assert row[0] == 10000.0


async def test_init_db_seeds_default_watchlist(fresh_db_path):
    await init_db()
    async with aiosqlite.connect(str(fresh_db_path)) as db:
        rows = await (
            await db.execute("SELECT ticker FROM watchlist WHERE user_id = 'default'")
        ).fetchall()
    tickers = sorted(r[0] for r in rows)
    assert tickers == sorted(DEFAULT_TICKERS)


async def test_init_db_is_idempotent(fresh_db_path):
    await init_db()
    await init_db()
    await init_db()
    async with aiosqlite.connect(str(fresh_db_path)) as db:
        users = await (await db.execute("SELECT COUNT(*) FROM users_profile")).fetchone()
        watch = await (await db.execute("SELECT COUNT(*) FROM watchlist")).fetchone()
    assert users[0] == 1
    assert watch[0] == len(DEFAULT_TICKERS)
