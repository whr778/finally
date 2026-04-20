"use client";

import { useEffect } from "react";
import { usePriceStore } from "@/stores/price-store";
import type { PriceData } from "@/types/market";

export function useSSE() {
  const updatePrices = usePriceStore((s) => s.updatePrices);
  const setConnectionStatus = usePriceStore((s) => s.setConnectionStatus);

  useEffect(() => {
    const es = new EventSource("/api/stream/prices");

    es.onopen = () => {
      setConnectionStatus("connected");
    };

    es.onmessage = (event: MessageEvent) => {
      const data: Record<string, PriceData> = JSON.parse(event.data);
      updatePrices(data);
      setConnectionStatus("connected");
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CONNECTING) {
        setConnectionStatus("reconnecting");
      } else if (es.readyState === EventSource.CLOSED) {
        setConnectionStatus("disconnected");
      }
    };

    return () => {
      es.close();
    };
  }, [updatePrices, setConnectionStatus]);
}
