import { render, screen } from "@testing-library/react";
import PriceChart from "@/components/PriceChart";
import type { PriceUpdate } from "@/types";

// ResizeObserver is not implemented in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const PRICE_UPDATE: PriceUpdate = {
  ticker: "AAPL",
  price: 190.5,
  previous_price: 189.0,
  timestamp: 1700000000,
  change: 1.5,
  change_percent: 0.79,
  direction: "up",
};

describe("PriceChart", () => {
  it("shows 'Select a ticker' message when ticker is null", () => {
    render(<PriceChart ticker={null} priceHistory={[]} latestUpdate={undefined} />);
    expect(screen.getByText("Select a ticker to view chart")).toBeInTheDocument();
  });

  it("renders chart container when ticker is provided", () => {
    render(<PriceChart ticker="AAPL" priceHistory={[]} latestUpdate={undefined} />);
    expect(screen.getByTestId("price-chart")).toBeInTheDocument();
  });

  it("shows ticker label in chart header", () => {
    render(<PriceChart ticker="AAPL" priceHistory={[]} latestUpdate={undefined} />);
    expect(screen.getByText("AAPL — price chart")).toBeInTheDocument();
  });

  it("renders with price history", () => {
    render(
      <PriceChart
        ticker="GOOGL"
        priceHistory={[170, 171, 172, 173]}
        latestUpdate={undefined}
      />
    );
    expect(screen.getByTestId("price-chart")).toBeInTheDocument();
    expect(screen.getByText("GOOGL — price chart")).toBeInTheDocument();
  });

  it("renders with a latestUpdate", () => {
    render(
      <PriceChart
        ticker="AAPL"
        priceHistory={[189, 190]}
        latestUpdate={PRICE_UPDATE}
      />
    );
    expect(screen.getByTestId("price-chart")).toBeInTheDocument();
  });
});
