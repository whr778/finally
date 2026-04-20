export interface PriceData {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: number;
  change: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
}

export interface PositionData {
  ticker: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  unrealized_pnl: number | null;
  pct_change: number | null;
}

export interface PortfolioData {
  cash_balance: number;
  positions: PositionData[];
  total_value: number;
}

export interface WatchlistEntryData {
  ticker: string;
  price: number | null;
  previous_price: number | null;
  change_percent: number | null;
  direction: string | null;
}
