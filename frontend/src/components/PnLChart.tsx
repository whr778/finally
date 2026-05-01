"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Snapshot } from "@/types";

const REFRESH_INTERVAL_MS = 30_000;

interface PnLChartProps {
  /** Increment to force an immediate refresh (e.g. after a user trade). */
  refreshTrigger?: number;
}

interface ChartPoint {
  t: number;
  value: number;
}

const numberFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export default function PnLChart({ refreshTrigger = 0 }: PnLChartProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const triggerRef = useRef(refreshTrigger);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/portfolio/history");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Snapshot[] = await res.json();
        if (!cancelled) {
          setSnapshots(data);
          setError(null);
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoaded(true);
        }
      }
    }

    load();
    triggerRef.current = refreshTrigger;
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshTrigger]);

  const points: ChartPoint[] = useMemo(
    () =>
      snapshots.map((s) => ({
        t: new Date(s.recorded_at).getTime(),
        value: s.total_value,
      })),
    [snapshots],
  );

  const first = points[0]?.value ?? null;
  const last = points[points.length - 1]?.value ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const deltaPct = first !== null && delta !== null && first !== 0 ? (delta / first) * 100 : null;
  const deltaClass = delta === null ? "muted" : delta >= 0 ? "positive" : "negative";

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        className="panel-label"
        style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}
      >
        <span>P&amp;L</span>
        {last !== null && (
          <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>
              {numberFmt.format(last)}
            </span>
            {delta !== null && deltaPct !== null && (
              <span className={deltaClass} style={{ fontSize: 11 }}>
                {delta >= 0 ? "+" : ""}
                {numberFmt.format(delta)} ({delta >= 0 ? "+" : ""}
                {deltaPct.toFixed(2)}%)
              </span>
            )}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: 8 }} data-testid="pnl-chart-body">
        {!loaded ? (
          <div className="muted" style={{ fontSize: 11, padding: 8 }}>
            Loading…
          </div>
        ) : error ? (
          <div className="negative" style={{ fontSize: 11, padding: 8 }}>
            Failed to load: {error}
          </div>
        ) : points.length === 0 ? (
          <div className="muted" style={{ fontSize: 11, padding: 8 }}>
            No snapshots yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => timeFmt.format(new Date(v))}
                stroke="var(--text-dim)"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="var(--text-dim)"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                tickFormatter={(v) => numberFmt.format(v)}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)",
                  fontSize: 11,
                }}
                labelFormatter={(v) => timeFmt.format(new Date(v as number))}
                formatter={(v: number) => [numberFmt.format(v), "Total"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--blue)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
