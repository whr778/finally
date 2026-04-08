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
