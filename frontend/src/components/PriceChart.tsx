"use client";
/**
 * Main price chart using lightweight-charts (canvas-based).
 * Dynamic import ensures this only runs client-side.
 */

import { useEffect, useRef } from "react";
import type { PriceUpdate } from "@/types";

interface Props {
  ticker: string | null;
  priceHistory: number[];
  latestUpdate: PriceUpdate | undefined;
}

export default function PriceChart({ ticker, priceHistory, latestUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  const pointCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let chart: ReturnType<typeof import("lightweight-charts")["createChart"]>;

    async function init() {
      const { createChart, ColorType, LineSeries } = await import("lightweight-charts");
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#161b27" },
          textColor: "#8b949e",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.04)" },
          horzLines: { color: "rgba(255,255,255,0.04)" },
        },
        crosshair: {
          vertLine: { color: "rgba(236,173,10,0.4)" },
          horzLine: { color: "rgba(236,173,10,0.4)" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.07)" },
        timeScale: {
          borderColor: "rgba(255,255,255,0.07)",
          timeVisible: true,
          secondsVisible: true,
        },
        handleScroll: true,
        handleScale: true,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      // v5 API: addSeries(SeriesType, options) replaces addLineSeries()
      const series = chart.addSeries(LineSeries, {
        color: "#209dd7",
        lineWidth: 1.5,
        priceLineVisible: true,
        lastValueVisible: true,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Seed with existing history
      if (priceHistory.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        const seedData = priceHistory.map((p, i) => ({
          time: (now - (priceHistory.length - 1 - i) * 1) as number,
          value: p,
        }));
        series.setData(seedData);
        pointCountRef.current = seedData.length;
        chart.timeScale().fitContent();
      }
    }

    init();

    const resizeObs = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    });
    resizeObs.observe(containerRef.current);

    return () => {
      resizeObs.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  // Append new price point whenever latestUpdate changes
  useEffect(() => {
    if (!seriesRef.current || !latestUpdate) return;
    const time = Math.floor(latestUpdate.timestamp) as number;
    seriesRef.current.update({ time, value: latestUpdate.price });
  }, [latestUpdate]);

  if (!ticker) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-dim)",
          fontSize: 12,
        }}
      >
        Select a ticker to view chart
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-label">
        {ticker} — price chart
      </div>
      <div
        ref={containerRef}
        data-testid="price-chart"
        style={{ flex: 1 }}
      />
    </div>
  );
}
