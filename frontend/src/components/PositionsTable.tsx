"use client";
import type { Position } from "@/types";
import { formatPrice, formatDollar, formatPct, formatQty, pnlClass } from "@/lib/format";

interface Props {
  positions: Position[];
  onSelectTicker?: (ticker: string) => void;
}

const TH: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "var(--text-dim)",
  fontWeight: 400,
  borderBottom: "1px solid var(--border)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 11,
  borderBottom: "1px solid var(--border)",
  textAlign: "right",
};

export default function PositionsTable({ positions, onSelectTicker }: Props) {
  if (positions.length === 0) {
    return (
      <div
        data-testid="positions-empty"
        style={{
          padding: 16,
          color: "var(--text-dim)",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        No open positions
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", height: "100%" }}>
      <table
        data-testid="positions-table"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: "left" }}>TICKER</th>
            <th style={TH}>QTY</th>
            <th style={TH}>AVG COST</th>
            <th style={TH}>PRICE</th>
            <th style={TH}>UNREAL P&amp;L</th>
            <th style={TH}>CHG %</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr
              key={p.ticker}
              data-testid={`position-row-${p.ticker}`}
              onClick={() => onSelectTicker?.(p.ticker)}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.03)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <td
                style={{
                  ...TD,
                  textAlign: "left",
                  color: "var(--accent)",
                  fontWeight: 700,
                }}
              >
                {p.ticker}
              </td>
              <td style={TD}>{formatQty(p.quantity)}</td>
              <td style={{ ...TD, color: "var(--text-muted)" }}>
                {formatPrice(p.avg_cost)}
              </td>
              <td style={TD}>{formatPrice(p.current_price)}</td>
              <td style={{ ...TD, color: `var(--${pnlClass(p.unrealized_pnl) === "positive" ? "green" : pnlClass(p.unrealized_pnl) === "negative" ? "red" : "text-muted"})` }}>
                {formatDollar(p.unrealized_pnl)}
              </td>
              <td
                style={{
                  ...TD,
                  color: `var(--${pnlClass(p.pct_change) === "positive" ? "green" : pnlClass(p.pct_change) === "negative" ? "red" : "text-muted"})`,
                }}
              >
                {formatPct(p.pct_change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
