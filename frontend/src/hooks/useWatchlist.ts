"use client";

import { useCallback, useEffect, useState } from "react";
import type { WatchlistEntry } from "@/types";

export interface WatchlistState {
  entries: WatchlistEntry[];
  loading: boolean;
  error: string | null;
  addTicker: (ticker: string) => Promise<void>;
  removeTicker: (ticker: string) => Promise<void>;
  refresh: () => Promise<void>;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { detail?: string };
  return body.detail ?? `Request failed (${res.status})`;
}

/** CRUD against /api/watchlist with auto-refresh after mutations. */
export function useWatchlist(): WatchlistState {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error(await readError(res));
      setEntries((await res.json()) as WatchlistEntry[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  const addTicker = useCallback(
    async (ticker: string) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) throw new Error(await readError(res));
      await refresh();
    },
    [refresh],
  );

  const removeTicker = useCallback(
    async (ticker: string) => {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(ticker)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, error, addTicker, removeTicker, refresh };
}
