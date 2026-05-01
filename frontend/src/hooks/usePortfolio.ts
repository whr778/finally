"use client";

import { useCallback, useEffect, useState } from "react";

import type { Portfolio, TradeRequest, TradeResult } from "@/types";

interface UsePortfolio {
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  executeTrade: (req: TradeRequest) => Promise<TradeResult>;
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    /* fall through */
  }
  return `HTTP ${res.status}`;
}

/** Portfolio state + trade execution against the backend. */
export function usePortfolio(): UsePortfolio {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) {
        setError(await readErrorDetail(res));
        return;
      }
      const data: Portfolio = await res.json();
      setPortfolio(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const executeTrade = useCallback(
    async (req: TradeRequest): Promise<TradeResult> => {
      const res = await fetch("/api/portfolio/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        throw new Error(await readErrorDetail(res));
      }
      const result: TradeResult = await res.json();
      await refresh();
      return result;
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { portfolio, loading, error, refresh, executeTrade };
}
