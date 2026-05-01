"use client";

import { ResponsiveContainer, Treemap } from "recharts";
import type { Position } from "@/types";

interface HeatmapNode {
  ticker: string;
  size: number;
  pctChange: number;
  pnl: number;
}

interface PortfolioHeatmapProps {
  positions: Position[];
}

/** Cap intensity at +/-5% so a single outlier doesn't bleach everything else. */
const INTENSITY_CAP = 5;

function pnlColor(pctChange: number): string {
  const clamped = Math.max(-INTENSITY_CAP, Math.min(INTENSITY_CAP, pctChange));
  const intensity = Math.abs(clamped) / INTENSITY_CAP;
  const alpha = 0.18 + intensity * 0.62;
  if (clamped >= 0) return `rgba(63, 185, 80, ${alpha.toFixed(3)})`;
  return `rgba(248, 81, 73, ${alpha.toFixed(3)})`;
}

function buildNodes(positions: Position[]): HeatmapNode[] {
  return positions
    .map((p) => {
      const price = p.current_price ?? p.avg_cost;
      const size = p.quantity * price;
      return {
        ticker: p.ticker,
        size,
        pctChange: p.pct_change ?? 0,
        pnl: p.unrealized_pnl ?? 0,
      };
    })
    .filter((n) => n.size > 0);
}

interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  ticker?: string;
  pctChange?: number;
  pnl?: number;
}

function HeatmapCell(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, ticker, pctChange = 0, pnl = 0 } = props;
  if (width <= 0 || height <= 0 || !ticker) return null;
  const showLabel = width > 48 && height > 28;
  const showPct = width > 70 && height > 44;
  const sign = pctChange >= 0 ? "+" : "";
  return (
    <g data-testid={`heatmap-cell-${ticker}`}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={pnlColor(pctChange)}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? 6 : 0)}
          textAnchor="middle"
          fill="#e6edf3"
          fontSize={Math.min(14, Math.max(10, width / 8))}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {ticker}
        </text>
      )}
      {showPct && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#e6edf3"
            fontSize={11}
            style={{ pointerEvents: "none" }}
          >
            {sign}
            {pctChange.toFixed(2)}%
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 24}
            textAnchor="middle"
            fill="rgba(230,237,243,0.7)"
            fontSize={10}
            style={{ pointerEvents: "none" }}
          >
            {sign}${pnl.toFixed(2)}
          </text>
        </>
      )}
    </g>
  );
}

export function PortfolioHeatmap({ positions }: PortfolioHeatmapProps) {
  const nodes = buildNodes(positions);

  if (nodes.length === 0) {
    return (
      <div
        data-testid="heatmap-empty"
        className="muted"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: 12,
        }}
      >
        No positions yet.
      </div>
    );
  }

  return (
    <div data-testid="portfolio-heatmap" style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={nodes}
          dataKey="size"
          nameKey="ticker"
          isAnimationActive={false}
          content={<HeatmapCell />}
        />
      </ResponsiveContainer>
    </div>
  );
}

export const __test__ = { buildNodes, pnlColor };
