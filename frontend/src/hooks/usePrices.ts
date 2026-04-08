"use client";
/**
 * Connects to /api/stream/prices via EventSource and maintains
 * the latest price map plus a short sparkline history per ticker.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceMap, PriceUpdate } from "@/types";

const SPARKLINE_POINTS = 60;

export type SparklineMap = Record<string, number[]>;

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface PricesState {
  prices: PriceMap;
  sparklines: SparklineMap;
  status: ConnectionStatus;
  /** Set of tickers whose price changed since last render (cleared each cycle). */
  flashed: Set<string>;
}

export function usePrices(): PricesState {
  const [prices, setPrices] = useState<PriceMap>({});
  const [sparklines, setSparklines] = useState<SparklineMap>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [flashed, setFlashed] = useState<Set<string>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  // Track current prices in a ref so we can diff synchronously in handleMessage
  const pricesRef = useRef<PriceMap>({});
  // One timeout handle per ticker; cleared before setting a new one to prevent stale clears
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    const batch = JSON.parse(event.data) as PriceMap;

    // Compute changed tickers synchronously against the ref-tracked prices
    const changed = new Set<string>();
    for (const ticker in batch) {
      const prev = pricesRef.current[ticker];
      if (!prev || prev.price !== batch[ticker].price) {
        changed.add(ticker);
      }
    }

    // Update the ref immediately (synchronous)
    pricesRef.current = { ...pricesRef.current, ...batch };

    setPrices({ ...pricesRef.current });

    setSparklines((prev) => {
      const next = { ...prev };
      for (const ticker in batch) {
        const history = prev[ticker] ?? [];
        next[ticker] = [...history, batch[ticker].price].slice(-SPARKLINE_POINTS);
      }
      return next;
    });

    if (changed.size > 0) {
      setFlashed(new Set(changed));
      // Cancel any pending clear so rapid updates don't prematurely wipe the flash
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlashed(new Set()), 700);
    }
  }, []);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      setStatus("connecting");
      const es = new EventSource("/api/stream/prices");
      esRef.current = es;

      es.onopen = () => setStatus("connected");
      es.onmessage = handleMessage;
      es.onerror = () => {
        setStatus("disconnected");
        es.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      esRef.current?.close();
    };
  }, [handleMessage]);

  return { prices, sparklines, status, flashed };
}
