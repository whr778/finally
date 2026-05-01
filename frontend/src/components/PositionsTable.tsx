"use client";

import type { Position, PriceMap } from "@/types";

export interface PositionsTableProps {
  positions: Position[];
  prices?: PriceMap;
}

function fmtNumber(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(digits);
}

function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtSignedMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function fmtSignedPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function pnlClass(n: number | null | undefined): string {
  if (n === null || n === undefined) return "muted";
  return n >= 0 ? "positive" : "negative";
}

interface DerivedRow extends Position {
  livePrice: number | null;
  livePnl: number | null;
  livePct: number | null;
}

function derive(position: Position, prices?: PriceMap): DerivedRow {
  const streamed = prices?.[position.ticker]?.price;
  const livePrice =
    streamed !== undefined && streamed !== null ? streamed : position.current_price;

  let livePnl: number | null = null;
  let livePct: number | null = null;
  if (livePrice !== null && livePrice !== undefined) {
    livePnl = (livePrice - position.avg_cost) * position.quantity;
    if (position.avg_cost) {
      livePct = ((livePrice - position.avg_cost) / position.avg_cost) * 100;
    }
  }

  return { ...position, livePrice, livePnl, livePct };
}

const cellStyle: React.CSSProperties = {
  padding: "6px 10px",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const headStyle: React.CSSProperties = {
  ...cellStyle,
  color: "var(--text-dim)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontWeight: 500,
  borderBottom: "1px solid var(--border)",
};

export function PositionsTable({ positions, prices }: PositionsTableProps) {
  return (
    <div className="panel" data-testid="positions-table">
      <div className="panel-label">Positions</div>
      {positions.length === 0 ? (
        <div
          style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}
          data-testid="positions-empty"
        >
          No positions yet.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...headStyle, textAlign: "left" }}>Ticker</th>
              <th style={headStyle}>Qty</th>
              <th style={headStyle}>Avg Cost</th>
              <th style={headStyle}>Price</th>
              <th style={headStyle}>P&amp;L</th>
              <th style={headStyle}>%</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const row = derive(p, prices);
              return (
                <tr
                  key={p.ticker}
                  data-testid={`position-row-${p.ticker}`}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ ...cellStyle, textAlign: "left", color: "var(--accent)" }}>
                    {p.ticker}
                  </td>
                  <td style={cellStyle}>{fmtNumber(p.quantity, 4)}</td>
                  <td style={cellStyle}>{fmtPrice(p.avg_cost)}</td>
                  <td style={cellStyle} data-testid={`position-price-${p.ticker}`}>
                    {fmtPrice(row.livePrice)}
                  </td>
                  <td
                    style={cellStyle}
                    className={pnlClass(row.livePnl)}
                    data-testid={`position-pnl-${p.ticker}`}
                  >
                    {fmtSignedMoney(row.livePnl)}
                  </td>
                  <td
                    style={cellStyle}
                    className={pnlClass(row.livePct)}
                    data-testid={`position-pct-${p.ticker}`}
                  >
                    {fmtSignedPct(row.livePct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PositionsTable;
