import { renderHook, act } from "@testing-library/react";
import { usePrices } from "@/hooks/usePrices";

// MockEventSource is set up in jest.setup.ts
const getMockES = () =>
  (global.EventSource as unknown as { instances: InstanceType<typeof EventSource & { simulateMessage: (d: object) => void }>[] }).instances;

describe("usePrices", () => {
  it("starts in connecting status", () => {
    const { result } = renderHook(() => usePrices());
    expect(result.current.status).toBe("connecting");
  });

  it("transitions to connected when EventSource opens", async () => {
    const { result } = renderHook(() => usePrices());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.status).toBe("connected");
  });

  it("updates prices when a message arrives", async () => {
    const { result } = renderHook(() => usePrices());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const instances = getMockES();
    expect(instances.length).toBeGreaterThan(0);
    const es = instances[instances.length - 1] as unknown as {
      onmessage: ((e: MessageEvent) => void) | null;
    };

    act(() => {
      es.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            AAPL: {
              ticker: "AAPL",
              price: 195.5,
              previous_price: 194.0,
              timestamp: 1700000000,
              change: 1.5,
              change_percent: 0.77,
              direction: "up",
            },
          }),
        })
      );
    });

    expect(result.current.prices["AAPL"]).toBeDefined();
    expect(result.current.prices["AAPL"].price).toBe(195.5);
  });

  it("accumulates sparkline history", async () => {
    const { result } = renderHook(() => usePrices());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const es = getMockES()[getMockES().length - 1] as unknown as {
      onmessage: ((e: MessageEvent) => void) | null;
    };

    for (let i = 0; i < 5; i++) {
      act(() => {
        es.onmessage?.(
          new MessageEvent("message", {
            data: JSON.stringify({
              MSFT: {
                ticker: "MSFT",
                price: 380 + i,
                previous_price: 380 + i - 1,
                timestamp: 1700000000 + i,
                change: 1,
                change_percent: 0.26,
                direction: "up",
              },
            }),
          })
        );
      });
    }

    expect(result.current.sparklines["MSFT"]?.length).toBe(5);
  });

  it("marks flashed tickers on price change", async () => {
    const { result } = renderHook(() => usePrices());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const es = getMockES()[getMockES().length - 1] as unknown as {
      onmessage: ((e: MessageEvent) => void) | null;
    };

    act(() => {
      es.onmessage?.(
        new MessageEvent("message", {
          data: JSON.stringify({
            TSLA: {
              ticker: "TSLA",
              price: 250,
              previous_price: 248,
              timestamp: Date.now() / 1000,
              change: 2,
              change_percent: 0.8,
              direction: "up",
            },
          }),
        })
      );
    });

    expect(result.current.flashed.has("TSLA")).toBe(true);
  });
});
