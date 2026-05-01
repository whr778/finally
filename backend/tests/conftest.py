"""Pytest configuration and shared fixtures for API integration tests."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.database import init_db
from app.market.cache import PriceCache
from app.market.interface import MarketDataSource


class FakeMarketSource(MarketDataSource):
    """Test double for the market data source.

    Records add/remove calls. validate_ticker accepts any symbol in
    `known_tickers`; defaults to accepting everything.
    """

    def __init__(self, cache: PriceCache, known_tickers: set[str] | None = None) -> None:
        self._cache = cache
        self._known = known_tickers
        self._tickers: list[str] = []
        self.added: list[str] = []
        self.removed: list[str] = []

    async def start(self, tickers: list[str]) -> None:
        self._tickers = list(tickers)

    async def stop(self) -> None:
        pass

    async def add_ticker(self, ticker: str) -> None:
        self.added.append(ticker)
        if ticker not in self._tickers:
            self._tickers.append(ticker)

    async def remove_ticker(self, ticker: str) -> None:
        self.removed.append(ticker)
        self._tickers = [t for t in self._tickers if t != ticker]
        self._cache.remove(ticker)

    def get_tickers(self) -> list[str]:
        return list(self._tickers)

    async def validate_ticker(self, ticker: str) -> bool:
        return self._known is None or ticker.upper() in self._known


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


@pytest.fixture
def fake_market_source(price_cache_with_prices):
    """Fake market source used by watchlist tests."""
    return FakeMarketSource(price_cache_with_prices)


@pytest_asyncio.fixture
async def client(
    seeded_db, price_cache_with_prices, fake_market_source, monkeypatch
) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient for the FastAPI app with a test database and mock price cache."""
    from app.main import app

    # Override the app's state with our test instances
    app.state.price_cache = price_cache_with_prices
    app.state.market_source = fake_market_source

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
