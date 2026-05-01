"use client";

import { useState } from "react";

import { usePortfolio } from "@/hooks/usePortfolio";
import type { TradeResult } from "@/types";

interface FillStatus {
  kind: "fill";
  trade: TradeResult;
}

interface ErrorStatus {
  kind: "error";
  message: string;
}

type Status = FillStatus | ErrorStatus | null;

const PURPLE = "#753991";

function formatFill(t: TradeResult): string {
  const total = (t.price * t.quantity).toFixed(2);
  return `Filled ${t.side.toUpperCase()} ${t.quantity} ${t.ticker} @ $${t.price.toFixed(2)} (${total})`;
}

/** Simple market-order trade bar. Calls POST /api/portfolio/trade. */
export function TradeBar() {
  const { executeTrade } = usePortfolio();
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(side: "buy" | "sell") {
    const t = ticker.trim().toUpperCase();
    const q = Number(quantity);
    if (!t) {
      setStatus({ kind: "error", message: "Ticker is required" });
      return;
    }
    if (!Number.isFinite(q) || q <= 0) {
      setStatus({ kind: "error", message: "Quantity must be > 0" });
      return;
    }

    setSubmitting(true);
    try {
      const trade = await executeTrade({ ticker: t, side, quantity: q });
      setStatus({ kind: "fill", trade });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="panel"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
      }}
      data-testid="trade-bar"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="panel-label" style={{ padding: 0, border: 0 }}>
          Trade
        </span>
        <input
          aria-label="ticker"
          className="input-field"
          placeholder="TICKER"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          maxLength={5}
          style={{ width: 90, textTransform: "uppercase" }}
          disabled={submitting}
        />
        <input
          aria-label="quantity"
          className="input-field"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="QTY"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={{ width: 90 }}
          disabled={submitting}
        />
        <button
          type="button"
          onClick={() => submit("buy")}
          disabled={submitting}
          className="btn-primary"
          style={{ background: PURPLE }}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => submit("sell")}
          disabled={submitting}
          className="btn-primary"
          style={{ background: PURPLE }}
        >
          Sell
        </button>
      </div>
      {status && (
        <div
          role="status"
          data-testid="trade-status"
          className={status.kind === "fill" ? "positive" : "negative"}
          style={{ fontSize: 12 }}
        >
          {status.kind === "fill" ? formatFill(status.trade) : status.message}
        </div>
      )}
    </div>
  );
}
