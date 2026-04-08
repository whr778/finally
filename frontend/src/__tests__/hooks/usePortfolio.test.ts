import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolio } from "@/hooks/usePortfolio";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockGetPortfolio = api.getPortfolio as jest.Mock;
const mockGetHistory = api.getPortfolioHistory as jest.Mock;

const PORTFOLIO = {
  cash_balance: 8000,
  positions: [{ ticker: "AAPL", quantity: 10, avg_cost: 190, current_price: 200, unrealized_pnl: 100, pct_change: 5.26 }],
  total_value: 10000,
};

beforeEach(() => {
  jest.useFakeTimers();
  mockGetPortfolio.mockResolvedValue(PORTFOLIO);
  mockGetHistory.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe("usePortfolio", () => {
  it("fetches portfolio on mount", async () => {
    const { result } = renderHook(() => usePortfolio());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.portfolio).toEqual(PORTFOLIO);
  });

  it("sets error on fetch failure", async () => {
    mockGetPortfolio.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.error).toBe("Network error"));
  });

  it("fetches history", async () => {
    const snapshots = [{ recorded_at: "2024-01-01T00:00:00Z", total_value: 10000 }];
    mockGetHistory.mockResolvedValue(snapshots);
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.history).toEqual(snapshots));
  });

  it("refresh re-fetches data", async () => {
    const { result } = renderHook(() => usePortfolio());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetPortfolio.mockResolvedValueOnce({ ...PORTFOLIO, total_value: 11000 });
    result.current.refresh();
    await waitFor(() => expect(result.current.portfolio?.total_value).toBe(11000));
  });
});
