"use client";

import { create } from "zustand";
import type { WatchlistEntryData } from "@/types/market";

interface WatchlistState {
  tickers: WatchlistEntryData[];
  error: string | null;
  fetchWatchlist: () => Promise<void>;
  addTicker: (ticker: string) => Promise<void>;
  removeTicker: (ticker: string) => Promise<void>;
  clearError: () => void;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  tickers: [],
  error: null,
  fetchWatchlist: async () => {
    const res = await fetch("/api/watchlist");
    const data: WatchlistEntryData[] = await res.json();
    set({ tickers: data });
  },
  addTicker: async (ticker: string) => {
    set({ error: null });
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    });
    if (!res.ok) {
      const err = await res.json();
      set({ error: err.detail || "Failed to add ticker" });
      return;
    }
    const entry: WatchlistEntryData = await res.json();
    set((state) => ({ tickers: [...state.tickers, entry] }));
  },
  removeTicker: async (ticker: string) => {
    const prev = get().tickers;
    set((state) => ({ tickers: state.tickers.filter((t) => t.ticker !== ticker) }));
    const res = await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
    if (!res.ok) {
      set({ tickers: prev, error: "Failed to remove ticker" });
    }
  },
  clearError: () => set({ error: null }),
}));
