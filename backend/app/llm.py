"""LLM integration via LiteLLM → OpenRouter (Cerebras inference)."""

from __future__ import annotations

import json
import os
from typing import Any

import litellm

_MODEL = "openrouter/openai/gpt-oss-120b"

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

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "message": {"type": "string"},
        "trades": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "side": {"type": "string", "enum": ["buy", "sell"]},
                    "quantity": {"type": "number"},
                },
                "required": ["ticker", "side", "quantity"],
            },
        },
        "watchlist_changes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "action": {"type": "string", "enum": ["add", "remove"]},
                },
                "required": ["ticker", "action"],
            },
        },
    },
    "required": ["message"],
}

_MOCK_RESPONSE = {
    "message": "I'm analyzing your portfolio. Everything looks good! Your positions are well-diversified.",
    "trades": [],
    "watchlist_changes": [],
}


def _is_mock() -> bool:
    return os.environ.get("LLM_MOCK", "").lower() == "true"


def _api_key() -> str | None:
    return os.environ.get("OPENROUTER_API_KEY", "").strip() or None


async def call_llm(portfolio_context: str, history: list[dict], user_message: str) -> dict[str, Any]:
    """Call the LLM and return parsed structured response dict."""
    if _is_mock():
        return _MOCK_RESPONSE

    key = _api_key()
    if not key:
        return {
            "message": "AI chat is unavailable: OPENROUTER_API_KEY is not configured. "
                       "Set it in your .env file to enable the assistant.",
            "trades": [],
            "watchlist_changes": [],
        }

    messages = [
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
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "chat_response", "schema": _RESPONSE_SCHEMA, "strict": True},
        },
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
