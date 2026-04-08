"""Pytest configuration and shared fixtures for API integration tests."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import get_db, init_db
from app.market.cache import PriceCache


@pytest_asyncio.fixture
async def seeded_db(tmp_path, monkeypatch):
    """Patch DB_PATH to a fresh per-test SQLite file and seed it."""
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    yield db_file


@pytest.fixture
def price_cache_with_prices():
    """A PriceCache pre-loaded with test prices."""
    cache = PriceCache()
    cache.update("AAPL", 190.50)
    cache.update("GOOGL", 175.00)
    cache.update("TSLA", 250.00)
    return cache


@pytest_asyncio.fixture
async def client(seeded_db, price_cache_with_prices, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient for the FastAPI app with a test database and mock price cache."""
    from app.main import app

    # Override the app's price_cache with our test instance
    app.state.price_cache = price_cache_with_prices

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
