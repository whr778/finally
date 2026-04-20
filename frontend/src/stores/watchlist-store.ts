"use client";

import { create } from "zustand";
import type { WatchlistEntryData } from "@/types/market";

interface WatchlistState {
  tickers: WatchlistEntryData[];
  fetchWatchlist: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>()((set) => ({
  tickers: [],
  fetchWatchlist: async () => {
    const res = await fetch("/api/watchlist");
    const data: WatchlistEntryData[] = await res.json();
    set({ tickers: data });
  },
}));
