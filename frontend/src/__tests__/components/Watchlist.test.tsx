import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Watchlist from "@/components/Watchlist";
import type { WatchlistEntry, PriceUpdate } from "@/types";

const TICKERS: WatchlistEntry[] = [
  { ticker: "AAPL", price: 190, previous_price: 188, change_percent: 1.06, direction: "up" },
  { ticker: "GOOGL", price: 175, previous_price: 176, change_percent: -0.57, direction: "down" },
  { ticker: "MSFT", price: 380, previous_price: 380, change_percent: 0, direction: "flat" },
];

const PRICES: Record<string, PriceUpdate> = {
  AAPL: { ticker: "AAPL", price: 192, previous_price: 190, timestamp: 1, change: 2, change_percent: 1.05, direction: "up" },
};

function buildProps(overrides = {}) {
  return {
    tickers: TICKERS,
    prices: PRICES,
    sparklines: {},
    flashed: new Set<string>(),
    selectedTicker: null as string | null,
    onSelect: jest.fn(),
    onAdd: jest.fn().mockResolvedValue(undefined),
    onRemove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("Watchlist", () => {
  it("renders watchlist header", () => {
    render(<Watchlist {...buildProps()} />);
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("renders all ticker rows", () => {
    render(<Watchlist {...buildProps()} />);
    expect(screen.getByTestId("watchlist-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("watchlist-row-GOOGL")).toBeInTheDocument();
    expect(screen.getByTestId("watchlist-row-MSFT")).toBeInTheDocument();
  });

  it("calls onSelect when row is clicked", () => {
    const onSelect = jest.fn();
    render(<Watchlist {...buildProps({ onSelect })} />);
    fireEvent.click(screen.getByTestId("watchlist-row-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("highlights selected ticker with blue background", () => {
    render(<Watchlist {...buildProps({ selectedTicker: "AAPL" })} />);
    const row = screen.getByTestId("watchlist-row-AAPL");
    // Selected row gets a blue-tinted background (rgba with blue values)
    expect(row.getAttribute("style")).toContain("rgba(32, 157, 215");
  });

  it("non-selected rows have transparent background", () => {
    render(<Watchlist {...buildProps({ selectedTicker: "AAPL" })} />);
    const row = screen.getByTestId("watchlist-row-GOOGL");
    expect(row.style.background).toBe("transparent");
  });

  it("calls onRemove when X button is clicked", () => {
    const onRemove = jest.fn().mockResolvedValue(undefined);
    render(<Watchlist {...buildProps({ onRemove })} />);
    fireEvent.click(screen.getByTestId("remove-AAPL"));
    expect(onRemove).toHaveBeenCalledWith("AAPL");
  });

  it("remove button click does not propagate to row", () => {
    const onSelect = jest.fn();
    render(<Watchlist {...buildProps({ onSelect })} />);
    fireEvent.click(screen.getByTestId("remove-AAPL"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies flash-up class for flashed up ticker", () => {
    render(<Watchlist {...buildProps({ flashed: new Set(["AAPL"]) })} />);
    const row = screen.getByTestId("watchlist-row-AAPL");
    expect(row.className).toContain("flash-up");
  });

  it("applies flash-down class for flashed down ticker", () => {
    render(<Watchlist {...buildProps({ flashed: new Set(["GOOGL"]) })} />);
    const row = screen.getByTestId("watchlist-row-GOOGL");
    expect(row.className).toContain("flash-down");
  });

  it("has no flash class for non-flashed tickers", () => {
    render(<Watchlist {...buildProps({ flashed: new Set<string>() })} />);
    const row = screen.getByTestId("watchlist-row-AAPL");
    expect(row.className).not.toContain("flash");
  });

  it("shows add ticker input and button", () => {
    render(<Watchlist {...buildProps()} />);
    expect(screen.getByTestId("ticker-input")).toBeInTheDocument();
    expect(screen.getByTestId("add-btn")).toBeInTheDocument();
  });

  it("calls onAdd with uppercased ticker", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockResolvedValue(undefined);
    render(<Watchlist {...buildProps({ onAdd })} />);

    await user.type(screen.getByTestId("ticker-input"), "tsla");
    fireEvent.submit(screen.getByTestId("ticker-input").closest("form")!);

    expect(onAdd).toHaveBeenCalledWith("TSLA");
  });

  it("clears input after successful add", async () => {
    const user = userEvent.setup();
    render(<Watchlist {...buildProps()} />);
    await user.type(screen.getByTestId("ticker-input"), "NVDA");
    await user.click(screen.getByTestId("add-btn"));
    // Wait for async state update
    await screen.findByTestId("ticker-input");
    expect(screen.getByTestId("ticker-input")).toHaveValue("");
  });

  it("shows error when onAdd throws", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockRejectedValue(new Error("Already in watchlist"));
    render(<Watchlist {...buildProps({ onAdd })} />);

    await user.type(screen.getByTestId("ticker-input"), "AAPL");
    fireEvent.submit(screen.getByTestId("ticker-input").closest("form")!);

    await screen.findByTestId("add-error");
    expect(screen.getByTestId("add-error")).toHaveTextContent("Already in watchlist");
  });

  it("does not call onAdd with empty input", async () => {
    const onAdd = jest.fn();
    render(<Watchlist {...buildProps({ onAdd })} />);
    fireEvent.submit(screen.getByTestId("ticker-input").closest("form")!);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("uses live price from prices map if available", () => {
    render(<Watchlist {...buildProps()} />);
    // AAPL has a live price of 192 in PRICES, overriding the 190 in TICKERS
    const row = screen.getByTestId("watchlist-row-AAPL");
    expect(row).toHaveTextContent("192.00");
  });

  it("falls back to entry price when no live price", () => {
    render(<Watchlist {...buildProps({ prices: {} })} />);
    // GOOGL has no live price, should show entry price 175
    const row = screen.getByTestId("watchlist-row-GOOGL");
    expect(row).toHaveTextContent("175.00");
  });

  it("renders sparklines area for each row", () => {
    render(<Watchlist {...buildProps({ sparklines: { AAPL: [190, 191, 192] } })} />);
    // Sparkline SVG should be rendered inside the watchlist row
    const row = screen.getByTestId("watchlist-row-AAPL");
    expect(row.querySelector("svg")).toBeInTheDocument();
  });
});
