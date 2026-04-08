"""Pydantic request and response models."""

from __future__ import annotations

from pydantic import BaseModel


# --- Requests ---


class TradeRequest(BaseModel):
    ticker: str
    side: str  # "buy" or "sell"
    quantity: float


class WatchlistAddRequest(BaseModel):
    ticker: str


class ChatRequest(BaseModel):
    content: str


# --- Responses ---


class PositionOut(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    current_price: float | None
    unrealized_pnl: float | None
    pct_change: float | None


class PortfolioOut(BaseModel):
    cash_balance: float
    positions: list[PositionOut]
    total_value: float


class TradeOut(BaseModel):
    ticker: str
    side: str
    quantity: float
    price: float
    executed_at: str


class WatchlistEntry(BaseModel):
    ticker: str
    price: float | None
    previous_price: float | None
    change_percent: float | None
    direction: str | None


class SnapshotOut(BaseModel):
    recorded_at: str
    total_value: float


class ChatTradeResult(BaseModel):
    ticker: str
    side: str
    quantity: float
    price: float
    success: bool
    error: str | None = None


class ChatWatchlistResult(BaseModel):
    ticker: str
    action: str
    success: bool
    error: str | None = None


class ChatOut(BaseModel):
    message: str
    trades_executed: list[ChatTradeResult] = []
    watchlist_changes: list[ChatWatchlistResult] = []
