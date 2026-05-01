"""LLM integration via LiteLLM → OpenRouter (Cerebras inference provider)."""

from __future__ import annotations

import os
import re
from typing import Any

import litellm
from pydantic import BaseModel, Field

_MODEL = "openrouter/openai/gpt-oss-120b"
_EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

_SYSTEM_PROMPT = """You are FinAlly, an AI trading assistant for a simulated portfolio workstation.

You have access to the user's real-time portfolio data provided in each message.
Your job is to:
- Analyze portfolio composition, risk concentration, and P&L
- Answer questions about the user's holdings and market data
- Suggest and execute trades when asked (or when the user agrees)
- Manage the watchlist proactively

Rules:
- Be concise and data-driven
- Only execute trades the user explicitly requests or agrees to
- Always respond with valid JSON matching the required schema
"""


class ChatTrade(BaseModel):
    ticker: str
    side: str = Field(description="'buy' or 'sell'")
    quantity: float


class ChatWatchlistChange(BaseModel):
    ticker: str
    action: str = Field(description="'add' or 'remove'")


class ChatLLMResponse(BaseModel):
    message: str
    trades: list[ChatTrade] = Field(default_factory=list)
    watchlist_changes: list[ChatWatchlistChange] = Field(default_factory=list)


_MOCK_DEFAULT_MESSAGE = (
    "I'm analyzing your portfolio. Everything looks good — your positions are diversified."
)

_MOCK_TRADE_RE = re.compile(r"\b(buy|sell)\s+(\d+(?:\.\d+)?)\s+([A-Z]{1,5})\b", re.IGNORECASE)
_MOCK_WATCH_ADD_RE = re.compile(r"\b(?:add|watch)\s+([A-Z]{1,5})\b", re.IGNORECASE)
_MOCK_WATCH_REMOVE_RE = re.compile(r"\b(?:remove|drop|unwatch)\s+([A-Z]{1,5})\b", re.IGNORECASE)


def _build_mock_response(user_message: str) -> dict[str, Any]:
    """Deterministic test response. Parses simple intents from the user message
    so E2E tests can exercise inline trade/watchlist execution.
    """
    trades: list[dict[str, Any]] = []
    watchlist_changes: list[dict[str, Any]] = []

    for side, qty, ticker in _MOCK_TRADE_RE.findall(user_message):
        trades.append({"ticker": ticker.upper(), "side": side.lower(), "quantity": float(qty)})
    for ticker in _MOCK_WATCH_ADD_RE.findall(user_message):
        if not _MOCK_TRADE_RE.search(user_message):
            watchlist_changes.append({"ticker": ticker.upper(), "action": "add"})
    for ticker in _MOCK_WATCH_REMOVE_RE.findall(user_message):
        watchlist_changes.append({"ticker": ticker.upper(), "action": "remove"})

    return {
        "message": _MOCK_DEFAULT_MESSAGE,
        "trades": trades,
        "watchlist_changes": watchlist_changes,
    }


def _is_mock() -> bool:
    return os.environ.get("LLM_MOCK", "").lower() == "true"


def _api_key() -> str | None:
    return os.environ.get("OPENROUTER_API_KEY", "").strip() or None


async def call_llm(portfolio_context: str, history: list[dict], user_message: str) -> dict[str, Any]:
    """Call the LLM and return parsed structured response dict.

    Returns a descriptive message dict (not an exception) when the API key is missing,
    so the chat endpoint can still return a useful payload to the client.
    """
    if _is_mock():
        return _build_mock_response(user_message)

    key = _api_key()
    if not key:
        return {
            "message": (
                "AI chat is unavailable: OPENROUTER_API_KEY is not configured. "
                "Set it in your .env file to enable the assistant."
            ),
            "trades": [],
            "watchlist_changes": [],
        }

    messages: list[dict] = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": f"Current portfolio state:\n{portfolio_context}"},
    ]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    response = await litellm.acompletion(
        model=_MODEL,
        messages=messages,
        api_key=key,
        response_format=ChatLLMResponse,
        reasoning_effort="low",
        extra_body=_EXTRA_BODY,
    )

    raw = response.choices[0].message.content
    parsed = ChatLLMResponse.model_validate_json(raw)
    return parsed.model_dump()
