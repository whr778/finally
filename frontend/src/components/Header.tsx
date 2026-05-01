"use client";

import { useEffect } from "react";

import { ConnectionDot } from "@/components/ConnectionDot";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePrices } from "@/hooks/usePrices";

const REFRESH_MS = 2000;

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface StatProps {
  label: string;
  value: string;
  accent?: string;
}

function Stat({ label, value, accent }: StatProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: accent ?? "var(--text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function Header() {
  const { connectionStatus } = usePrices();
  const { portfolio, refresh } = usePortfolio();

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const total = portfolio?.total_value ?? null;
  const cash = portfolio?.cash_balance ?? null;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}
    >
      <span
        style={{
          color: "var(--accent)",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontSize: 14,
        }}
      >
        FinAlly
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
        AI Trading Workstation
      </span>

      <div style={{ flex: 1 }} />

      <Stat
        label="Total Value"
        value={total === null ? "—" : fmtMoney(total)}
        accent="var(--accent)"
      />
      <Stat label="Cash" value={cash === null ? "—" : fmtMoney(cash)} />
      <ConnectionDot status={connectionStatus} />
    </header>
  );
}
