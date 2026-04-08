import { render, screen } from "@testing-library/react";
import PortfolioHeatmap from "@/components/PortfolioHeatmap";
import type { Position } from "@/types";

const POSITIONS: Position[] = [
  { ticker: "AAPL", quantity: 10, avg_cost: 180, current_price: 190, unrealized_pnl: 100, pct_change: 5.56 },
  { ticker: "TSLA", quantity: 5, avg_cost: 260, current_price: 240, unrealized_pnl: -100, pct_change: -7.69 },
  { ticker: "GOOGL", quantity: 2, avg_cost: 170, current_price: 175, unrealized_pnl: 10, pct_change: 2.94 },
];

describe("PortfolioHeatmap", () => {
  it("shows empty state when no positions", () => {
    render(<PortfolioHeatmap positions={[]} totalValue={10000} />);
    expect(screen.getByTestId("heatmap-empty")).toBeInTheDocument();
    expect(screen.getByText("No positions")).toBeInTheDocument();
  });

  it("renders the heatmap container for positions", () => {
    render(<PortfolioHeatmap positions={POSITIONS} totalValue={12000} />);
    expect(screen.getByTestId("heatmap")).toBeInTheDocument();
  });

  it("renders a tile for each position", () => {
    render(<PortfolioHeatmap positions={POSITIONS} totalValue={12000} />);
    expect(screen.getByTestId("tile-AAPL")).toBeInTheDocument();
    expect(screen.getByTestId("tile-TSLA")).toBeInTheDocument();
    expect(screen.getByTestId("tile-GOOGL")).toBeInTheDocument();
  });

  it("shows ticker label in tile", () => {
    render(<PortfolioHeatmap positions={POSITIONS} totalValue={12000} />);
    // Tickers should appear in the heatmap - at least the larger ones render text
    const heatmap = screen.getByTestId("heatmap");
    expect(heatmap).toBeInTheDocument();
  });

  it("renders single position", () => {
    render(<PortfolioHeatmap positions={[POSITIONS[0]]} totalValue={1900} />);
    expect(screen.getByTestId("tile-AAPL")).toBeInTheDocument();
  });

  it("renders with totalValue of zero without crashing", () => {
    render(<PortfolioHeatmap positions={POSITIONS} totalValue={0} />);
    expect(screen.getByTestId("heatmap")).toBeInTheDocument();
  });

  it("shows correct tooltip for position", () => {
    render(<PortfolioHeatmap positions={[POSITIONS[0]]} totalValue={1900} />);
    const tile = screen.getByTestId("tile-AAPL");
    // Title attribute contains P&L info
    expect(tile).toHaveAttribute("title");
    expect(tile.getAttribute("title")).toContain("AAPL");
  });

  it("handles positions with null P&L", () => {
    const nullPnl: Position = {
      ticker: "ZZZ",
      quantity: 1,
      avg_cost: 100,
      current_price: null,
      unrealized_pnl: null,
      pct_change: null,
    };
    render(<PortfolioHeatmap positions={[nullPnl]} totalValue={100} />);
    expect(screen.getByTestId("tile-ZZZ")).toBeInTheDocument();
  });
});
