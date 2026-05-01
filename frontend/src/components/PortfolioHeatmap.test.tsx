import { render, screen } from "@testing-library/react";
import { PortfolioHeatmap, __test__ } from "./PortfolioHeatmap";
import type { Position } from "@/types";

const { buildNodes, pnlColor } = __test__;

describe("PortfolioHeatmap helpers", () => {
  it("buildNodes uses current_price when present and skips zero-size positions", () => {
    const positions: Position[] = [
      {
        ticker: "AAPL",
        quantity: 10,
        avg_cost: 100,
        current_price: 200,
        unrealized_pnl: 1000,
        pct_change: 100,
      },
      {
        ticker: "EMPTY",
        quantity: 0,
        avg_cost: 50,
        current_price: 60,
        unrealized_pnl: 0,
        pct_change: 0,
      },
      {
        ticker: "NOPRICE",
        quantity: 5,
        avg_cost: 40,
        current_price: null,
        unrealized_pnl: null,
        pct_change: null,
      },
    ];
    const nodes = buildNodes(positions);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ ticker: "AAPL", size: 2000, pctChange: 100 });
    expect(nodes[1]).toMatchObject({ ticker: "NOPRICE", size: 200, pctChange: 0 });
  });

  it("pnlColor returns green tones for gains and red for losses", () => {
    expect(pnlColor(0)).toMatch(/rgba\(63, 185, 80/);
    expect(pnlColor(2.5)).toMatch(/rgba\(63, 185, 80/);
    expect(pnlColor(-2.5)).toMatch(/rgba\(248, 81, 73/);
  });

  it("pnlColor caps intensity at INTENSITY_CAP", () => {
    const a = pnlColor(5);
    const b = pnlColor(50);
    expect(a).toBe(b);
  });

  it("pnlColor scales alpha with magnitude", () => {
    const small = pnlColor(0.1);
    const large = pnlColor(5);
    const alphaSmall = parseFloat(small.match(/, ([\d.]+)\)/)![1]);
    const alphaLarge = parseFloat(large.match(/, ([\d.]+)\)/)![1]);
    expect(alphaLarge).toBeGreaterThan(alphaSmall);
  });
});

describe("PortfolioHeatmap component", () => {
  it("renders empty state when no positions", () => {
    render(<PortfolioHeatmap positions={[]} />);
    expect(screen.getByTestId("heatmap-empty")).toBeInTheDocument();
  });

  it("renders empty state when all positions have zero size", () => {
    const positions: Position[] = [
      {
        ticker: "ZERO",
        quantity: 0,
        avg_cost: 100,
        current_price: 100,
        unrealized_pnl: 0,
        pct_change: 0,
      },
    ];
    render(<PortfolioHeatmap positions={positions} />);
    expect(screen.getByTestId("heatmap-empty")).toBeInTheDocument();
  });

  it("renders the treemap container when positions exist", () => {
    const positions: Position[] = [
      {
        ticker: "AAPL",
        quantity: 10,
        avg_cost: 100,
        current_price: 200,
        unrealized_pnl: 1000,
        pct_change: 50,
      },
      {
        ticker: "TSLA",
        quantity: 5,
        avg_cost: 300,
        current_price: 250,
        unrealized_pnl: -250,
        pct_change: -16.67,
      },
    ];
    render(
      <div style={{ width: 400, height: 300 }}>
        <PortfolioHeatmap positions={positions} />
      </div>
    );
    expect(screen.getByTestId("portfolio-heatmap")).toBeInTheDocument();
  });
});
