import { render, screen } from "@testing-library/react";
import PnLChart from "@/components/PnLChart";
import type { Snapshot } from "@/types";

// Mock recharts to avoid jsdom SVG issues
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="grid" />,
}));

const HISTORY: Snapshot[] = [
  { recorded_at: "2024-01-01T09:00:00Z", total_value: 10000 },
  { recorded_at: "2024-01-01T09:30:00Z", total_value: 10250 },
  { recorded_at: "2024-01-01T10:00:00Z", total_value: 10100 },
];

describe("PnLChart", () => {
  it("shows empty state when history is empty", () => {
    render(<PnLChart history={[]} />);
    expect(screen.getByTestId("pnl-empty")).toBeInTheDocument();
    expect(screen.getByText("No history yet")).toBeInTheDocument();
  });

  it("renders chart container when history has data", () => {
    render(<PnLChart history={HISTORY} />);
    expect(screen.getByTestId("pnl-chart")).toBeInTheDocument();
  });

  it("renders line chart components when data present", () => {
    render(<PnLChart history={HISTORY} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.getByTestId("line")).toBeInTheDocument();
  });

  it("renders with single data point", () => {
    render(<PnLChart history={[HISTORY[0]]} />);
    expect(screen.getByTestId("pnl-chart")).toBeInTheDocument();
  });

  it("renders with two data points at same value (zero range)", () => {
    const flatHistory: Snapshot[] = [
      { recorded_at: "2024-01-01T09:00:00Z", total_value: 10000 },
      { recorded_at: "2024-01-01T10:00:00Z", total_value: 10000 },
    ];
    render(<PnLChart history={flatHistory} />);
    expect(screen.getByTestId("pnl-chart")).toBeInTheDocument();
  });
});
