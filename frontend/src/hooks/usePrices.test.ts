import { act, renderHook } from "@testing-library/react";
import { usePrices } from "./usePrices";

interface MockEventSource extends EventSource {
  simulateMessage: (data: object) => void;
}

interface MockEventSourceCtor {
  instances: MockEventSource[];
}

function getEventSourceCtor(): MockEventSourceCtor {
  return (global as unknown as { EventSource: MockEventSourceCtor }).EventSource;
}

function tick(update: object) {
  const instances = getEventSourceCtor().instances;
  const es = instances[instances.length - 1];
  act(() => es.simulateMessage(update));
}

describe("usePrices", () => {
  it("starts in connecting state, transitions to connected on open", async () => {
    const { result } = renderHook(() => usePrices());
    expect(result.current.connectionStatus).toBe("connecting");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(result.current.connectionStatus).toBe("connected");
  });

  it("accumulates history and records first price per ticker", async () => {
    const { result } = renderHook(() => usePrices());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    tick({
      AAPL: {
        ticker: "AAPL",
        price: 100,
        previous_price: 100,
        timestamp: 1,
        change: 0,
        change_percent: 0,
        direction: "flat",
      },
    });
    tick({
      AAPL: {
        ticker: "AAPL",
        price: 102,
        previous_price: 100,
        timestamp: 2,
        change: 2,
        change_percent: 2,
        direction: "up",
      },
    });

    expect(result.current.firstPrices.AAPL).toBe(100);
    expect(result.current.history.AAPL).toEqual([100, 102]);
    expect(result.current.prices.AAPL.price).toBe(102);
  });
});
