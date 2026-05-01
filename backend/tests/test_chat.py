"""Integration tests for the /api/chat endpoint.

Tests run with LLM_MOCK=true by default (set in conftest at module level here),
and patch app.routes.chat.call_llm to inject deterministic LLM responses.
"""

from __future__ import annotations

import os

import pytest

from app.database import get_db


@pytest.fixture(autouse=True)
def _mock_env(monkeypatch):
    """Force LLM_MOCK=true for all chat tests so call_llm has no network path."""
    monkeypatch.setenv("LLM_MOCK", "true")


def _patch_llm(monkeypatch, payload: dict) -> None:
    """Replace call_llm with an async function that returns `payload`."""

    async def fake(_ctx: str, _hist: list, _msg: str) -> dict:
        return payload

    monkeypatch.setattr("app.routes.chat.call_llm", fake)


class TestChatBasic:
    async def test_chat_returns_message(self, client, monkeypatch):
        _patch_llm(monkeypatch, {"message": "Hello!", "trades": [], "watchlist_changes": []})
        resp = await client.post("/api/chat", json={"content": "hi"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Hello!"
        assert data["trades_executed"] == []
        assert data["watchlist_changes"] == []

    async def test_chat_persists_user_and_assistant_messages(self, client, monkeypatch):
        _patch_llm(monkeypatch, {"message": "Reply.", "trades": [], "watchlist_changes": []})
        await client.post("/api/chat", json={"content": "hello"})

        async with get_db() as db:
            rows = await (
                await db.execute(
                    "SELECT role, content FROM chat_messages WHERE user_id='default' "
                    "ORDER BY created_at ASC"
                )
            ).fetchall()

        assert len(rows) == 2
        assert rows[0]["role"] == "user"
        assert rows[0]["content"] == "hello"
        assert rows[1]["role"] == "assistant"
        assert rows[1]["content"] == "Reply."

    async def test_chat_loads_recent_history(self, client, monkeypatch):
        captured: dict = {}

        async def fake(ctx: str, hist: list, msg: str) -> dict:
            captured["history"] = hist
            captured["message"] = msg
            return {"message": "ok", "trades": [], "watchlist_changes": []}

        monkeypatch.setattr("app.routes.chat.call_llm", fake)

        # First message establishes history
        await client.post("/api/chat", json={"content": "first"})
        # Second call should see the first exchange in history
        await client.post("/api/chat", json={"content": "second"})

        roles = [h["role"] for h in captured["history"]]
        contents = [h["content"] for h in captured["history"]]
        assert "user" in roles and "assistant" in roles
        assert "first" in contents
        assert captured["message"] == "second"


class TestChatTradeExecution:
    async def test_chat_executes_buy_trade(self, client, monkeypatch):
        _patch_llm(
            monkeypatch,
            {
                "message": "Bought 2 AAPL.",
                "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 2}],
                "watchlist_changes": [],
            },
        )
        resp = await client.post("/api/chat", json={"content": "buy 2 AAPL"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["trades_executed"]) == 1
        trade = data["trades_executed"][0]
        assert trade["ticker"] == "AAPL"
        assert trade["side"] == "buy"
        assert trade["quantity"] == pytest.approx(2.0)
        assert trade["success"] is True
        assert trade["price"] == pytest.approx(190.50)

        portfolio = (await client.get("/api/portfolio")).json()
        position = next(p for p in portfolio["positions"] if p["ticker"] == "AAPL")
        assert position["quantity"] == pytest.approx(2.0)
        assert portfolio["cash_balance"] == pytest.approx(10000.0 - 2 * 190.50)

    async def test_chat_trade_failure_is_reported(self, client, monkeypatch):
        _patch_llm(
            monkeypatch,
            {
                "message": "Trying to sell what you don't own.",
                "trades": [{"ticker": "AAPL", "side": "sell", "quantity": 1}],
                "watchlist_changes": [],
            },
        )
        resp = await client.post("/api/chat", json={"content": "sell 1 AAPL"})
        assert resp.status_code == 200
        trade = resp.json()["trades_executed"][0]
        assert trade["success"] is False
        assert "shares" in (trade["error"] or "").lower()

    async def test_chat_trade_unknown_ticker_fails_gracefully(self, client, monkeypatch):
        _patch_llm(
            monkeypatch,
            {
                "message": "Trying ZZZZ.",
                "trades": [{"ticker": "ZZZZ", "side": "buy", "quantity": 1}],
                "watchlist_changes": [],
            },
        )
        resp = await client.post("/api/chat", json={"content": "buy ZZZZ"})
        assert resp.status_code == 200
        trade = resp.json()["trades_executed"][0]
        assert trade["success"] is False


class TestChatWatchlistChanges:
    async def test_chat_adds_to_watchlist(self, client, monkeypatch, fake_market_source):
        _patch_llm(
            monkeypatch,
            {
                "message": "Added PYPL.",
                "trades": [],
                "watchlist_changes": [{"ticker": "PYPL", "action": "add"}],
            },
        )
        resp = await client.post("/api/chat", json={"content": "add PYPL"})
        assert resp.status_code == 200
        change = resp.json()["watchlist_changes"][0]
        assert change["ticker"] == "PYPL"
        assert change["action"] == "add"
        assert change["success"] is True
        assert "PYPL" in fake_market_source.added

        listing = (await client.get("/api/watchlist")).json()
        assert any(e["ticker"] == "PYPL" for e in listing)

    async def test_chat_removes_from_watchlist(self, client, monkeypatch, fake_market_source):
        _patch_llm(
            monkeypatch,
            {
                "message": "Removed AAPL.",
                "trades": [],
                "watchlist_changes": [{"ticker": "AAPL", "action": "remove"}],
            },
        )
        resp = await client.post("/api/chat", json={"content": "remove AAPL"})
        assert resp.status_code == 200
        change = resp.json()["watchlist_changes"][0]
        assert change["success"] is True
        assert "AAPL" in fake_market_source.removed


class TestChatPersistsActions:
    async def test_assistant_message_includes_actions_json(self, client, monkeypatch):
        _patch_llm(
            monkeypatch,
            {
                "message": "Bought.",
                "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 1}],
                "watchlist_changes": [],
            },
        )
        await client.post("/api/chat", json={"content": "buy 1 AAPL"})

        async with get_db() as db:
            row = await (
                await db.execute(
                    "SELECT actions FROM chat_messages "
                    "WHERE user_id='default' AND role='assistant' "
                    "ORDER BY created_at DESC LIMIT 1"
                )
            ).fetchone()

        import json as _json

        assert row["actions"] is not None
        actions = _json.loads(row["actions"])
        assert actions["trades"][0]["ticker"] == "AAPL"


class TestChatMockMode:
    async def test_chat_mock_mode_returns_canned_response(self, client):
        # No call_llm patch — should hit the real call_llm with LLM_MOCK=true
        assert os.environ.get("LLM_MOCK", "").lower() == "true"
        resp = await client.post("/api/chat", json={"content": "hello"})
        assert resp.status_code == 200
        assert "portfolio" in resp.json()["message"].lower()

    async def test_chat_mock_mode_buy_intent_executes_trade(self, client):
        # AAPL is pre-seeded in price_cache_with_prices fixture at 190.50
        resp = await client.post("/api/chat", json={"content": "please buy 2 AAPL"})
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["trades_executed"]) == 1
        assert body["trades_executed"][0]["ticker"] == "AAPL"
        assert body["trades_executed"][0]["side"] == "buy"
        assert body["trades_executed"][0]["success"] is True

    async def test_chat_mock_mode_watchlist_add_intent(self, client):
        resp = await client.post("/api/chat", json={"content": "add PYPL to my watchlist"})
        assert resp.status_code == 200
        body = resp.json()
        assert any(
            c["ticker"] == "PYPL" and c["action"] == "add"
            for c in body["watchlist_changes"]
        )


class TestChatMissingApiKey:
    async def test_missing_key_returns_descriptive_message(self, client, monkeypatch):
        # Disable mock and clear key — call_llm should return a descriptive message dict
        monkeypatch.setenv("LLM_MOCK", "false")
        monkeypatch.setenv("OPENROUTER_API_KEY", "")
        resp = await client.post("/api/chat", json={"content": "hello"})
        assert resp.status_code == 200
        msg = resp.json()["message"]
        assert "OPENROUTER_API_KEY" in msg
