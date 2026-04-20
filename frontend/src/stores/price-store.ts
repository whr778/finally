"use client";

import { create } from "zustand";
import type { PriceData } from "@/types/market";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface PriceState {
  prices: Record<string, PriceData>;
  connectionStatus: ConnectionStatus;
  updatePrices: (data: Record<string, PriceData>) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const usePriceStore = create<PriceState>()((set) => ({
  prices: {},
  connectionStatus: "disconnected",
  updatePrices: (data) =>
    set((state) => ({
      prices: { ...state.prices, ...data },
    })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));

export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker]);

export const useConnectionStatus = () =>
  usePriceStore((state) => state.connectionStatus);
