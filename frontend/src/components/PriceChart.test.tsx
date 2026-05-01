import { render } from "@testing-library/react";
import { PriceChart } from "./PriceChart";
import { MockChart, __resetMockCharts } from "../__mocks__/lightweight-charts";
import type { PriceUpdate } from "@/types";

function makeUpdate(
  ticker: string,
  price: number,
  timestamp: number
): PriceUpdate {
  return {
    ticker,
    price,
    previous_price: price,
    timestamp,
    change: 0,
    change_percent: 0,
    direction: "flat",
  };
}

describe("PriceChart", () => {
  beforeEach(() => {
    __resetMockCharts();
  });

  it("creates a chart with a single line series on mount", () => {
    render(<PriceChart ticker="AAPL" priceUpdate={null} />);
    expect(MockChart.instances).toHaveLength(1);
    expect(MockChart.instances[0].series).toHaveLength(1);
  });

  it("renders the selected ticker in the header", () => {
    const { getByText } = render(
      <PriceChart ticker="AAPL" priceUpdate={null} />
    );
    expect(getByText("AAPL")).toBeInTheDocument();
  });

  it("shows a placeholder when no ticker is selected", () => {
    const { getByText } = render(<PriceChart ticker={null} />);
    expect(getByText(/select a ticker/i)).toBeInTheDocument();
  });

  it("appends a point to the series when a matching price update arrives", () => {
    const { rerender } = render(
      <PriceChart ticker="AAPL" priceUpdate={null} />
    );
    rerender(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("AAPL", 190.5, 1000)} />
    );
    const series = MockChart.instances[0].series[0];
    expect(series.data).toHaveLength(1);
    expect(series.data[0]).toEqual({ time: 1000, value: 190.5 });
  });

  it("ignores price updates for a different ticker", () => {
    const { rerender } = render(
      <PriceChart ticker="AAPL" priceUpdate={null} />
    );
    rerender(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("GOOGL", 175, 1000)} />
    );
    const series = MockChart.instances[0].series[0];
    expect(series.data).toHaveLength(0);
  });

  it("clears series data when the ticker changes", () => {
    const { rerender } = render(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("AAPL", 190, 1000)} />
    );
    const series = MockChart.instances[0].series[0];
    expect(series.data).toHaveLength(1);

    rerender(
      <PriceChart ticker="GOOGL" priceUpdate={makeUpdate("AAPL", 191, 1001)} />
    );
    expect(series.data).toHaveLength(0);
  });

  it("monotonically increases time when updates share a timestamp", () => {
    const { rerender } = render(
      <PriceChart ticker="AAPL" priceUpdate={null} />
    );
    rerender(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("AAPL", 100, 1000)} />
    );
    rerender(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("AAPL", 101, 1000)} />
    );
    rerender(
      <PriceChart ticker="AAPL" priceUpdate={makeUpdate("AAPL", 102, 999)} />
    );
    const series = MockChart.instances[0].series[0];
    expect(series.data.map((p) => p.time)).toEqual([1000, 1001, 1002]);
  });

  it("removes the chart on unmount", () => {
    const { unmount } = render(
      <PriceChart ticker="AAPL" priceUpdate={null} />
    );
    const chart = MockChart.instances[0];
    expect(chart.removed).toBe(false);
    unmount();
    expect(chart.removed).toBe(true);
  });
});
