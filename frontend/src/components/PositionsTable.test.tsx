import { render, screen } from "@testing-library/react";
import { PositionsTable } from "./PositionsTable";
import type { Position, PriceMap, PriceUpdate } from "@/types";

function makePrice(ticker: string, price: number, prev: number = price): PriceUpdate {
  const change = price - prev;
  return {
    ticker,
    price,
    previous_price: prev,
    timestamp: 0,
    change,
    change_percent: prev ? (change / prev) * 100 : 0,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
}

const aapl: Position = {
  ticker: "AAPL",
  quantity: 10,
  avg_cost: 150,
  current_price: 160,
  unrealized_pnl: 100,
  pct_change: 6.6667,
};

const tsla: Position = {
  ticker: "TSLA",
  quantity: 5,
  avg_cost: 200,
  current_price: 180,
  unrealized_pnl: -100,
  pct_change: -10,
};

describe("PositionsTable", () => {
  it("renders empty state when there are no positions", () => {
    render(<PositionsTable positions={[]} />);
    expect(screen.getByTestId("positions-empty")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row per position with all required columns", () => {
    render(<PositionsTable positions={[aapl, tsla]} />);
    expect(screen.getByTestId("position-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-TSLA")).toBeInTheDocument();
    expect(screen.getByText("Ticker")).toBeInTheDocument();
    expect(screen.getByText("Qty")).toBeInTheDocument();
    expect(screen.getByText("Avg Cost")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("P&L")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("uses position.current_price when no live prices are provided", () => {
    render(<PositionsTable positions={[aapl]} />);
    expect(screen.getByTestId("position-price-AAPL")).toHaveTextContent("$160.00");
    expect(screen.getByTestId("position-pnl-AAPL")).toHaveTextContent("+$100.00");
    expect(screen.getByTestId("position-pct-AAPL")).toHaveTextContent("+6.67%");
  });

  it("overrides current price with live SSE prices and recomputes P&L and %", () => {
    const prices: PriceMap = { AAPL: makePrice("AAPL", 200, 160) };
    render(<PositionsTable positions={[aapl]} prices={prices} />);
    expect(screen.getByTestId("position-price-AAPL")).toHaveTextContent("$200.00");
    // (200 - 150) * 10 = 500
    expect(screen.getByTestId("position-pnl-AAPL")).toHaveTextContent("+$500.00");
    // (200 - 150) / 150 * 100 = 33.33%
    expect(screen.getByTestId("position-pct-AAPL")).toHaveTextContent("+33.33%");
  });

  it("formats negative P&L with a minus sign and red styling", () => {
    render(<PositionsTable positions={[tsla]} />);
    const pnl = screen.getByTestId("position-pnl-TSLA");
    expect(pnl).toHaveTextContent("-$100.00");
    expect(pnl).toHaveClass("negative");
    const pct = screen.getByTestId("position-pct-TSLA");
    expect(pct).toHaveTextContent("-10.00%");
    expect(pct).toHaveClass("negative");
  });

  it("applies positive class for non-negative P&L", () => {
    render(<PositionsTable positions={[aapl]} />);
    expect(screen.getByTestId("position-pnl-AAPL")).toHaveClass("positive");
    expect(screen.getByTestId("position-pct-AAPL")).toHaveClass("positive");
  });

  it("renders em-dash placeholders when no price is available", () => {
    const noPrice: Position = {
      ticker: "NEW",
      quantity: 1,
      avg_cost: 50,
      current_price: null,
      unrealized_pnl: null,
      pct_change: null,
    };
    render(<PositionsTable positions={[noPrice]} />);
    expect(screen.getByTestId("position-price-NEW")).toHaveTextContent("—");
    expect(screen.getByTestId("position-pnl-NEW")).toHaveTextContent("—");
    expect(screen.getByTestId("position-pct-NEW")).toHaveTextContent("—");
    expect(screen.getByTestId("position-pnl-NEW")).toHaveClass("muted");
  });

  it("falls back to position.current_price when SSE map lacks the ticker", () => {
    const prices: PriceMap = { TSLA: makePrice("TSLA", 220) };
    render(<PositionsTable positions={[aapl, tsla]} prices={prices} />);
    expect(screen.getByTestId("position-price-AAPL")).toHaveTextContent("$160.00");
    expect(screen.getByTestId("position-price-TSLA")).toHaveTextContent("$220.00");
  });

  it("treats avg_cost of zero as no percentage change", () => {
    const free: Position = {
      ticker: "FREE",
      quantity: 1,
      avg_cost: 0,
      current_price: 10,
      unrealized_pnl: 10,
      pct_change: null,
    };
    render(<PositionsTable positions={[free]} />);
    expect(screen.getByTestId("position-pnl-FREE")).toHaveTextContent("+$10.00");
    expect(screen.getByTestId("position-pct-FREE")).toHaveTextContent("—");
  });
});
