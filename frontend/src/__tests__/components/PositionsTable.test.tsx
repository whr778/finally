import { render, screen, fireEvent } from "@testing-library/react";
import PositionsTable from "@/components/PositionsTable";
import type { Position } from "@/types";

const POSITIONS: Position[] = [
  { ticker: "AAPL", quantity: 10, avg_cost: 180, current_price: 190, unrealized_pnl: 100, pct_change: 5.56 },
  { ticker: "TSLA", quantity: 5, avg_cost: 260, current_price: 240, unrealized_pnl: -100, pct_change: -7.69 },
  { ticker: "MSFT", quantity: 3, avg_cost: 370, current_price: 370, unrealized_pnl: 0, pct_change: 0 },
];

describe("PositionsTable", () => {
  it("shows empty state with no positions", () => {
    render(<PositionsTable positions={[]} />);
    expect(screen.getByTestId("positions-empty")).toBeInTheDocument();
    expect(screen.getByText("No open positions")).toBeInTheDocument();
  });

  it("renders positions table with rows", () => {
    render(<PositionsTable positions={POSITIONS} />);
    expect(screen.getByTestId("positions-table")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("position-row-TSLA")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<PositionsTable positions={POSITIONS} />);
    expect(screen.getByText("TICKER")).toBeInTheDocument();
    expect(screen.getByText("QTY")).toBeInTheDocument();
    expect(screen.getByText("AVG COST")).toBeInTheDocument();
    expect(screen.getByText("PRICE")).toBeInTheDocument();
  });

  it("calls onSelectTicker when a row is clicked", () => {
    const onSelect = jest.fn();
    render(<PositionsTable positions={POSITIONS} onSelectTicker={onSelect} />);
    fireEvent.click(screen.getByTestId("position-row-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("does not throw when onSelectTicker is not provided", () => {
    render(<PositionsTable positions={POSITIONS} />);
    expect(() => fireEvent.click(screen.getByTestId("position-row-AAPL"))).not.toThrow();
  });

  it("displays ticker symbols", () => {
    render(<PositionsTable positions={POSITIONS} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("shows positive P&L formatted with dollar sign", () => {
    render(<PositionsTable positions={[POSITIONS[0]]} />);
    // AAPL has $100 unrealized P&L
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("shows negative P&L formatted with minus sign", () => {
    render(<PositionsTable positions={[POSITIONS[1]]} />);
    // TSLA has -$100 unrealized P&L
    expect(screen.getByText("-$100.00")).toBeInTheDocument();
  });

  it("shows positive pct change with + sign", () => {
    render(<PositionsTable positions={[POSITIONS[0]]} />);
    // AAPL has +5.56% pct change
    expect(screen.getByText("+5.56%")).toBeInTheDocument();
  });

  it("shows negative pct change with - sign", () => {
    render(<PositionsTable positions={[POSITIONS[1]]} />);
    // TSLA has -7.69% pct change
    expect(screen.getByText("-7.69%")).toBeInTheDocument();
  });

  it("renders position with null current_price", () => {
    const posWithNull: Position = {
      ticker: "ZZZ",
      quantity: 1,
      avg_cost: 100,
      current_price: null,
      unrealized_pnl: null,
      pct_change: null,
    };
    render(<PositionsTable positions={[posWithNull]} />);
    expect(screen.getByTestId("position-row-ZZZ")).toBeInTheDocument();
    // Should show em dashes for null values
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
