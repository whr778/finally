"use client";
/**
 * Treemap heatmap: positions sized by portfolio weight, colored by P&L %.
 * Uses a simple binary-partition treemap layout (no external dependency).
 */

import type { Position } from "@/types";
import { formatDollar, formatPct } from "@/lib/format";

interface Props {
  positions: Position[];
  totalValue: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TileData extends Position {
  rect: Rect;
}

/** Binary-partition treemap layout. */
function buildTreemap(
  items: Position[],
  rect: Rect
): TileData[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], rect }];

  const totalWeight = items.reduce(
    (s, p) => s + Math.max(0, (p.current_price ?? p.avg_cost) * p.quantity),
    0
  );
  if (totalWeight === 0) return items.map((p) => ({ ...p, rect }));

  // Sort descending by value
  const sorted = [...items].sort(
    (a, b) =>
      (b.current_price ?? b.avg_cost) * b.quantity -
      (a.current_price ?? a.avg_cost) * a.quantity
  );

  // Split into two halves by cumulative weight
  let cumulative = 0;
  let splitIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative +=
      ((sorted[i].current_price ?? sorted[i].avg_cost) * sorted[i].quantity) /
      totalWeight;
    if (cumulative >= 0.5) {
      splitIdx = i + 1;
      break;
    }
  }
  splitIdx = Math.max(1, Math.min(splitIdx, sorted.length - 1));

  const leftItems = sorted.slice(0, splitIdx);
  const rightItems = sorted.slice(splitIdx);
  const leftWeight = leftItems.reduce(
    (s, p) => s + (p.current_price ?? p.avg_cost) * p.quantity,
    0
  );
  const ratio = leftWeight / totalWeight;

  let leftRect: Rect;
  let rightRect: Rect;

  if (rect.w >= rect.h) {
    const splitX = rect.x + rect.w * ratio;
    leftRect = { x: rect.x, y: rect.y, w: rect.w * ratio, h: rect.h };
    rightRect = {
      x: splitX,
      y: rect.y,
      w: rect.w * (1 - ratio),
      h: rect.h,
    };
  } else {
    const splitY = rect.y + rect.h * ratio;
    leftRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h * ratio };
    rightRect = {
      x: rect.x,
      y: splitY,
      w: rect.w,
      h: rect.h * (1 - ratio),
    };
  }

  return [
    ...buildTreemap(leftItems, leftRect),
    ...buildTreemap(rightItems, rightRect),
  ];
}

function pnlColor(pct: number | null): string {
  if (pct == null) return "rgba(139,148,158,0.2)";
  if (pct > 5) return "rgba(63,185,80,0.5)";
  if (pct > 0) return "rgba(63,185,80,0.28)";
  if (pct < -5) return "rgba(248,81,73,0.5)";
  if (pct < 0) return "rgba(248,81,73,0.28)";
  return "rgba(139,148,158,0.2)";
}

const CONTAINER_W = 100;
const CONTAINER_H = 100;

export default function PortfolioHeatmap({ positions, totalValue }: Props) {
  if (positions.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-dim)",
          fontSize: 11,
        }}
        data-testid="heatmap-empty"
      >
        No positions
      </div>
    );
  }

  const tiles = buildTreemap(positions, {
    x: 0,
    y: 0,
    w: CONTAINER_W,
    h: CONTAINER_H,
  });

  return (
    <div
      data-testid="heatmap"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {tiles.map((tile) => {
        const pct = tile.pct_change;
        const posValue =
          (tile.current_price ?? tile.avg_cost) * tile.quantity;
        const weight = totalValue > 0 ? (posValue / totalValue) * 100 : 0;

        return (
          <div
            key={tile.ticker}
            data-testid={`tile-${tile.ticker}`}
            title={`${tile.ticker}: ${formatDollar(tile.unrealized_pnl)} (${formatPct(pct)})`}
            style={{
              position: "absolute",
              left: `${tile.rect.x}%`,
              top: `${tile.rect.y}%`,
              width: `${tile.rect.w}%`,
              height: `${tile.rect.h}%`,
              background: pnlColor(pct),
              border: "1px solid var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "default",
            }}
          >
            {tile.rect.w > 8 && tile.rect.h > 6 && (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)" }}>
                  {tile.ticker}
                </span>
                {tile.rect.h > 10 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: pct != null && pct >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {formatPct(pct)}
                  </span>
                )}
                {tile.rect.h > 14 && (
                  <span style={{ fontSize: 9, color: "var(--text-dim)" }}>
                    {weight.toFixed(1)}%
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
