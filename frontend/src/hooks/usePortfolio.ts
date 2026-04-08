"use client";
/** Fetches portfolio data and portfolio history with periodic refresh. */

import { useCallback, useEffect, useState } from "react";
import { getPortfolio, getPortfolioHistory } from "@/lib/api";
import type { Portfolio, Snapshot } from "@/types";

const POLL_MS = 5000;

export interface PortfolioState {
  portfolio: Portfolio | null;
  history: Snapshot[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePortfolio(): PortfolioState {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getPortfolio(), getPortfolioHistory()]);
      setPortfolio(p);
      setHistory(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { portfolio, history, loading, error, refresh };
}
