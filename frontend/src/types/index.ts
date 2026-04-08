/** Shared TypeScript types matching the backend Pydantic models. */

export interface PriceUpdate {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: number;
  change: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
}

export type PriceMap = Record<string, PriceUpdate>;

export interface Position {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  unrealized_pnl: number | null;
  pct_change: number | null;
}

export interface Portfolio {
  cash_balance: number;
  positions: Position[];
  total_value: number;
}

export interface TradeRequest {
  ticker: string;
  side: "buy" | "sell";
  quantity: number;
}

export interface TradeResult {
  ticker: string;
  side: string;
  quantity: number;
  price: number;
  executed_at: string;
}

export interface WatchlistEntry {
  ticker: string;
  price: number | null;
  previous_price: number | null;
  change_percent: number | null;
  direction: string | null;
}

export interface Snapshot {
  recorded_at: string;
  total_value: number;
}

export interface ChatTradeResult {
  ticker: string;
  side: string;
  quantity: number;
  price: number;
  success: boolean;
  error?: string | null;
}

export interface ChatWatchlistResult {
  ticker: string;
  action: string;
  success: boolean;
  error?: string | null;
}

export interface ChatResponse {
  message: string;
  trades_executed: ChatTradeResult[];
  watchlist_changes: ChatWatchlistResult[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  trades_executed?: ChatTradeResult[];
  watchlist_changes?: ChatWatchlistResult[];
}
