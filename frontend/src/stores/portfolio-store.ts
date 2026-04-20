"use client";

import { create } from "zustand";
import type { PortfolioData, PositionData } from "@/types/market";

interface PortfolioState {
  cashBalance: number;
  totalValue: number;
  positions: PositionData[];
  fetchPortfolio: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  cashBalance: 0,
  totalValue: 0,
  positions: [],
  fetchPortfolio: async () => {
    const res = await fetch("/api/portfolio");
    const data: PortfolioData = await res.json();
    set({
      cashBalance: data.cash_balance,
      totalValue: data.total_value,
      positions: data.positions,
    });
  },
}));
