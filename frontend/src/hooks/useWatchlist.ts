"use client";
/** Manages the watchlist: fetches tickers and provides add/remove. */

import { useCallback, useEffect, useState } from "react";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/api";
import type { WatchlistEntry } from "@/types";

export interface WatchlistState {
  tickers: WatchlistEntry[];
  loading: boolean;
  error: string | null;
  addTicker: (ticker: string) => Promise<void>;
  removeTicker: (ticker: string) => Promise<void>;
  refresh: () => void;
}

export function useWatchlist(): WatchlistState {
  const [tickers, setTickers] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await getWatchlist();
      setTickers(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTicker = useCallback(
    async (ticker: string) => {
      await addToWatchlist(ticker.toUpperCase());
      await refresh();
    },
    [refresh]
  );

  const removeTicker = useCallback(
    async (ticker: string) => {
      await removeFromWatchlist(ticker);
      setTickers((prev) => prev.filter((t) => t.ticker !== ticker));
    },
    []
  );

  return { tickers, loading, error, addTicker, removeTicker, refresh };
}
