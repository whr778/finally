"""Integration tests for FastAPI endpoints.

Tests run against a real SQLite database (temp file) and a mock price cache.
No background tasks are started — prices are seeded directly into the cache.
"""

from __future__ import annotations

import pytest


class TestHealth:
    async def test_health_returns_ok(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestPortfolio:
    async def test_get_portfolio_returns_structure(self, client):
        resp = await client.get("/api/portfolio")
        assert resp.status_code == 200
        data = resp.json()
        assert "cash_balance" in data
        assert "positions" in data
        assert "total_value" in data

    async def test_initial_cash_balance_is_10000(self, client):
        resp = await client.get("/api/portfolio")
        assert resp.status_code == 200
        assert resp.json()["cash_balance"] == pytest.approx(10000.0)

    async def test_initial_positions_are_empty(self, client):
        resp = await client.get("/api/portfolio")
        assert resp.status_code == 200
        assert resp.json()["positions"] == []

    async def test_total_value_equals_cash_when_no_positions(self, client):
        resp = await client.get("/api/portfolio")
        data = resp.json()
        assert data["total_value"] == pytest.approx(data["cash_balance"])


class TestTrade:
    async def test_buy_reduces_cash_and_creates_position(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 10},
        )
        assert resp.status_code == 200
        trade = resp.json()
        assert trade["ticker"] == "AAPL"
        assert trade["side"] == "buy"
        assert trade["quantity"] == 10
        assert trade["price"] == pytest.approx(190.50)

        portfolio = (await client.get("/api/portfolio")).json()
        assert portfolio["cash_balance"] == pytest.approx(10000.0 - 10 * 190.50)
        position = next((p for p in portfolio["positions"] if p["ticker"] == "AAPL"), None)
        assert position is not None
        assert position["quantity"] == pytest.approx(10.0)

    async def test_buy_requires_sufficient_cash(self, client):
        # Try to buy more than we can afford
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 100000},
        )
        assert resp.status_code == 400
        assert "cash" in resp.json()["detail"].lower()

    async def test_sell_increases_cash_and_removes_position(self, client):
        # First buy
        await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 5},
        )
        # Then sell all
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "sell", "quantity": 5},
        )
        assert resp.status_code == 200

        portfolio = (await client.get("/api/portfolio")).json()
        assert portfolio["cash_balance"] == pytest.approx(10000.0)
        assert not any(p["ticker"] == "AAPL" for p in portfolio["positions"])

    async def test_sell_requires_sufficient_shares(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "sell", "quantity": 1},
        )
        assert resp.status_code == 400
        assert "shares" in resp.json()["detail"].lower()

    async def test_trade_invalid_side_rejected(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "hold", "quantity": 1},
        )
        assert resp.status_code == 400

    async def test_trade_zero_quantity_rejected(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 0},
        )
        assert resp.status_code == 400

    async def test_trade_unknown_ticker_rejected(self, client):
        # ZZZZ has no price in the cache
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "ZZZZ", "side": "buy", "quantity": 1},
        )
        assert resp.status_code == 404

    async def test_fractional_share_buy(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 0.5},
        )
        assert resp.status_code == 200
        assert resp.json()["quantity"] == pytest.approx(0.5)

    async def test_avg_cost_updates_on_second_buy(self, client):
        await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 5},
        )
        await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 5},
        )
        portfolio = (await client.get("/api/portfolio")).json()
        position = next(p for p in portfolio["positions"] if p["ticker"] == "AAPL")
        assert position["quantity"] == pytest.approx(10.0)
        assert position["avg_cost"] == pytest.approx(190.50)

    async def test_trade_response_includes_executed_at(self, client):
        resp = await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 1},
        )
        assert "executed_at" in resp.json()


class TestWatchlist:
    async def test_get_watchlist_returns_seeded_defaults(self, client):
        resp = await client.get("/api/watchlist")
        assert resp.status_code == 200
        data = resp.json()
        tickers = [e["ticker"] for e in data]
        assert "AAPL" in tickers
        assert "GOOGL" in tickers

    async def test_get_watchlist_includes_added_at_and_price(self, client):
        resp = await client.get("/api/watchlist")
        data = resp.json()
        aapl = next(e for e in data if e["ticker"] == "AAPL")
        assert aapl["added_at"] is not None
        assert aapl["price"] == pytest.approx(190.50)
        assert aapl["previous_price"] == pytest.approx(190.50)
        assert aapl["direction"] == "flat"

    async def test_get_watchlist_unknown_ticker_has_null_price(self, client):
        # ZZZZ is not in the price cache; if it were on the watchlist it should still appear
        # First add it via DB to bypass validation, simulating an out-of-sync cache.
        import uuid
        from datetime import datetime, timezone

        from app.database import get_db

        async with get_db() as db:
            await db.execute(
                "INSERT INTO watchlist (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), "default", "ZZZZ", datetime.now(timezone.utc).isoformat()),
            )
            await db.commit()

        resp = await client.get("/api/watchlist")
        zzzz = next(e for e in resp.json() if e["ticker"] == "ZZZZ")
        assert zzzz["price"] is None
        assert zzzz["direction"] is None

    async def test_post_watchlist_adds_ticker(self, client, fake_market_source):
        resp = await client.post("/api/watchlist", json={"ticker": "PYPL"})
        assert resp.status_code == 201
        body = resp.json()
        assert body["ticker"] == "PYPL"
        assert body["added_at"] is not None
        assert "PYPL" in fake_market_source.added

        listing = (await client.get("/api/watchlist")).json()
        assert any(e["ticker"] == "PYPL" for e in listing)

    async def test_post_watchlist_lowercase_is_normalized(self, client):
        resp = await client.post("/api/watchlist", json={"ticker": "pypl"})
        assert resp.status_code == 201
        assert resp.json()["ticker"] == "PYPL"

    async def test_post_watchlist_rejects_invalid_format(self, client):
        resp = await client.post("/api/watchlist", json={"ticker": "TOOLONG"})
        assert resp.status_code == 400

    async def test_post_watchlist_rejects_duplicate(self, client):
        resp = await client.post("/api/watchlist", json={"ticker": "AAPL"})
        assert resp.status_code == 409

    async def test_post_watchlist_rejects_unknown_in_massive_mode(
        self, seeded_db, price_cache_with_prices, monkeypatch
    ):
        from httpx import ASGITransport, AsyncClient

        from app.main import app
        from tests.conftest import FakeMarketSource

        strict_source = FakeMarketSource(price_cache_with_prices, known_tickers={"AAPL", "GOOGL"})
        app.state.price_cache = price_cache_with_prices
        app.state.market_source = strict_source

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            resp = await ac.post("/api/watchlist", json={"ticker": "FAKE"})
            assert resp.status_code == 400
            assert "FAKE" in resp.json()["detail"]

    async def test_delete_watchlist_removes_ticker(self, client, fake_market_source):
        resp = await client.delete("/api/watchlist/AAPL")
        assert resp.status_code == 204
        assert "AAPL" in fake_market_source.removed

        listing = (await client.get("/api/watchlist")).json()
        assert not any(e["ticker"] == "AAPL" for e in listing)

    async def test_delete_watchlist_unknown_ticker_404(self, client):
        resp = await client.delete("/api/watchlist/ZZZZ")
        assert resp.status_code == 404


class TestPortfolioHistory:
    async def test_history_returns_list(self, client):
        resp = await client.get("/api/portfolio/history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_history_has_snapshot_after_trade(self, client):
        await client.post(
            "/api/portfolio/trade",
            json={"ticker": "AAPL", "side": "buy", "quantity": 1},
        )
        resp = await client.get("/api/portfolio/history")
        snapshots = resp.json()
        assert len(snapshots) >= 1
        assert "total_value" in snapshots[0]
        assert "recorded_at" in snapshots[0]
