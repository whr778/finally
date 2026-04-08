"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Snapshot } from "@/types";
import { formatDollar } from "@/lib/format";

interface Props {
  history: Snapshot[];
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        padding: "6px 10px",
        fontSize: 11,
      }}
    >
      <div style={{ color: "var(--text-muted)" }}>{payload[0].payload.label}</div>
      <div style={{ color: "var(--blue)" }}>{formatDollar(payload[0].value)}</div>
    </div>
  );
}

export default function PnLChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <div
        data-testid="pnl-empty"
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-dim)",
          fontSize: 11,
        }}
      >
        No history yet
      </div>
    );
  }

  const data = history.map((s) => ({
    label: formatTime(s.recorded_at),
    value: s.total_value,
  }));

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || 50;

  return (
    <div data-testid="pnl-chart" style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2 4"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#484f58", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tick={{ fill: "#484f58", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#209dd7"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "#209dd7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
