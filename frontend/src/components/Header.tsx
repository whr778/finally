"use client";
import ConnectionDot from "./ConnectionDot";
import type { ConnectionStatus } from "@/hooks/usePrices";
import { formatDollar } from "@/lib/format";

interface Props {
  totalValue: number | null;
  cashBalance: number | null;
  status: ConnectionStatus;
}

export default function Header({ totalValue, cashBalance, status }: Props) {
  return (
    <header
      data-testid="header"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px",
        height: 42,
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <span
        style={{
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Fin<span style={{ color: "var(--blue)" }}>Ally</span>
      </span>

      <span style={{ color: "var(--border-strong)", fontSize: 10 }}>|</span>

      <ConnectionDot status={status} />

      <span style={{ flex: 1 }} />

      {/* Portfolio value */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          PORTFOLIO
        </span>
        <span
          data-testid="total-value"
          style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}
        >
          {formatDollar(totalValue)}
        </span>
      </div>

      <span style={{ color: "var(--border-strong)", fontSize: 10 }}>|</span>

      {/* Cash */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>
          CASH
        </span>
        <span
          data-testid="cash-balance"
          style={{ fontSize: 14, color: "var(--text-muted)" }}
        >
          {formatDollar(cashBalance)}
        </span>
      </div>
    </header>
  );
}
