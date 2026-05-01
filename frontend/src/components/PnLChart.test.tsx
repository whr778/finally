import { act, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import PnLChart from "./PnLChart";

jest.mock("recharts", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "recharts-stub" }, children);
  return {
    ResponsiveContainer: Pass,
    LineChart: Pass,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

const sampleSnapshots = [
  { total_value: 10000, recorded_at: "2026-05-01T12:00:00Z" },
  { total_value: 10250, recorded_at: "2026-05-01T12:30:00Z" },
];

function mockFetch(payload: unknown, ok = true) {
  return jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  });
}

describe("PnLChart", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders snapshot data with current value and delta", async () => {
    global.fetch = mockFetch(sampleSnapshots) as unknown as typeof fetch;

    render(<PnLChart />);

    await waitFor(() => expect(screen.getByText("$10,250.00")).toBeInTheDocument());
    expect(screen.getByText(/\+\$250\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\+2\.50%/)).toBeInTheDocument();
    expect(screen.getAllByTestId("recharts-stub").length).toBeGreaterThan(0);
  });

  it("shows empty state when there are no snapshots", async () => {
    global.fetch = mockFetch([]) as unknown as typeof fetch;

    render(<PnLChart />);

    await waitFor(() => expect(screen.getByText(/No snapshots yet/)).toBeInTheDocument());
  });

  it("shows error message when fetch fails", async () => {
    global.fetch = mockFetch(null, false) as unknown as typeof fetch;

    render(<PnLChart />);

    await waitFor(() => expect(screen.getByText(/Failed to load/)).toBeInTheDocument());
  });

  it("polls every 30 seconds", async () => {
    const fetchMock = mockFetch(sampleSnapshots);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PnLChart />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("refetches when refreshTrigger changes", async () => {
    const fetchMock = mockFetch(sampleSnapshots);
    global.fetch = fetchMock as unknown as typeof fetch;

    const { rerender } = render(<PnLChart refreshTrigger={0} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    rerender(<PnLChart refreshTrigger={1} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
