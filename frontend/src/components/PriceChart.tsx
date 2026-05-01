"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { PriceUpdate } from "@/types";

interface Props {
  ticker: string | null;
  priceUpdate?: PriceUpdate | null;
}

const CHART_OPTIONS = {
  layout: {
    background: { color: "#161b27" },
    textColor: "#8b949e",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: "rgba(255,255,255,0.05)" },
    horzLines: { color: "rgba(255,255,255,0.05)" },
  },
  rightPriceScale: { borderColor: "rgba(255,255,255,0.07)" },
  timeScale: {
    borderColor: "rgba(255,255,255,0.07)",
    timeVisible: true,
    secondsVisible: true,
  },
  crosshair: { mode: 0 },
  autoSize: true,
};

const SERIES_OPTIONS = {
  color: "#209dd7",
  lineWidth: 2 as const,
  priceLineVisible: false,
  lastValueVisible: true,
};

export function PriceChart({ ticker, priceUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, CHART_OPTIONS);
    const series = chart.addSeries(LineSeries, SERIES_OPTIONS);
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData([]);
    lastTimeRef.current = 0;
  }, [ticker]);

  useEffect(() => {
    if (!priceUpdate || !seriesRef.current) return;
    if (priceUpdate.ticker !== ticker) return;
    const raw = Math.floor(priceUpdate.timestamp);
    const time = (raw > lastTimeRef.current ? raw : lastTimeRef.current + 1) as UTCTimestamp;
    lastTimeRef.current = time;
    seriesRef.current.update({ time, value: priceUpdate.price });
  }, [priceUpdate, ticker]);

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-label" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Price Chart</span>
        <span className="accent" style={{ fontWeight: 600 }}>
          {ticker ?? "—"}
        </span>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
        {!ticker && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-dim)",
              fontSize: 12,
              pointerEvents: "none",
            }}
          >
            Select a ticker from the watchlist
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceChart;
