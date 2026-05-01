"use client";

import { useEffect, useState } from "react";
import type { PriceMap } from "@/types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface PricesData {
  prices: PriceMap;
  history: Record<string, number[]>;
  firstPrices: Record<string, number>;
  connectionStatus: ConnectionStatus;
}

const MAX_HISTORY = 120;

/** Subscribe to /api/stream/prices via EventSource and accumulate
 *  per-ticker price history and the first observed price per ticker.
 */
export function usePrices(): PricesData {
  const [prices, setPrices] = useState<PriceMap>({});
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [firstPrices, setFirstPrices] = useState<Record<string, number>>({});
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const es = new EventSource("/api/stream/prices");
    es.onopen = () => setConnectionStatus("connected");
    es.onerror = () => setConnectionStatus("disconnected");
    es.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as PriceMap;
      setPrices((prev) => ({ ...prev, ...data }));

      setHistory((prev) => {
        const next = { ...prev };
        for (const [ticker, update] of Object.entries(data)) {
          const arr = next[ticker] ? [...next[ticker], update.price] : [update.price];
          if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
          next[ticker] = arr;
        }
        return next;
      });

      setFirstPrices((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [ticker, update] of Object.entries(data)) {
          if (next[ticker] === undefined) {
            next[ticker] = update.price;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    return () => es.close();
  }, []);

  return { prices, history, firstPrices, connectionStatus };
}
