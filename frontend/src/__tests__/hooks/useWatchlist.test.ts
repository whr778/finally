import { renderHook, act, waitFor } from "@testing-library/react";
import { useWatchlist } from "@/hooks/useWatchlist";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockGet = api.getWatchlist as jest.Mock;
const mockAdd = api.addToWatchlist as jest.Mock;
const mockRemove = api.removeFromWatchlist as jest.Mock;

const WATCHLIST = [
  { ticker: "AAPL", price: 190, previous_price: 188, change_percent: 1.06, direction: "up" },
  { ticker: "GOOGL", price: 175, previous_price: 176, change_percent: -0.57, direction: "down" },
];

beforeEach(() => {
  mockGet.mockResolvedValue(WATCHLIST);
  mockAdd.mockResolvedValue({ ticker: "TSLA", price: null, previous_price: null, change_percent: null, direction: null });
  mockRemove.mockResolvedValue(undefined);
});

afterEach(() => jest.clearAllMocks());

describe("useWatchlist", () => {
  it("loads watchlist on mount", async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickers).toEqual(WATCHLIST);
  });

  it("sets error on load failure", async () => {
    mockGet.mockRejectedValueOnce(new Error("Load failed"));
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.error).toBe("Load failed"));
  });

  it("addTicker calls API and refreshes", async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTicker("tsla");
    });

    expect(mockAdd).toHaveBeenCalledWith("TSLA");
    expect(mockGet).toHaveBeenCalledTimes(2); // initial + after add
  });

  it("removeTicker removes locally without API refresh", async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.tickers.length).toBe(2));

    await act(async () => {
      await result.current.removeTicker("AAPL");
    });

    expect(mockRemove).toHaveBeenCalledWith("AAPL");
    expect(result.current.tickers.find((t) => t.ticker === "AAPL")).toBeUndefined();
  });
});
