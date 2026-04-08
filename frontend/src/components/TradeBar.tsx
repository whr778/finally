"use client";
import { useEffect, useState } from "react";
import { executeTrade } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { TradeResult, PriceUpdate } from "@/types";

interface Props {
  prices: Record<string, PriceUpdate>;
  selectedTicker: string | null;
  onTradeComplete: () => void;
}

export default function TradeBar({ prices, selectedTicker, onTradeComplete }: Props) {
  const [ticker, setTicker] = useState(selectedTicker ?? "");
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<TradeResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Sync ticker field and clear qty when selection changes
  useEffect(() => {
    if (selectedTicker) {
      setTicker(selectedTicker);
      setQty("");
    }
  }, [selectedTicker]);

  const sym = ticker.trim().toUpperCase();
  const price = prices[sym]?.price;
  const quantity = parseFloat(qty);

  async function trade(side: "buy" | "sell") {
    if (!sym || !qty || isNaN(quantity) || quantity <= 0) {
      setError("Enter a valid ticker and quantity");
      return;
    }
    setBusy(true);
    setError(null);
    setLastTrade(null);
    try {
      const result = await executeTrade({ ticker: sym, side, quantity });
      setLastTrade(result);
      setQty("");
      onTradeComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="trade-bar"
      style={{
        padding: "8px 12px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}
        >
          TRADE
        </span>

        <input
          className="input-field"
          style={{ width: 80, textTransform: "uppercase" }}
          placeholder="TICKER"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          data-testid="trade-ticker"
        />

        <input
          className="input-field"
          style={{ width: 90 }}
          placeholder="Quantity"
          type="number"
          min="0.0001"
          step="any"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          data-testid="trade-qty"
        />

        {price != null && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            @ {formatPrice(price)}
          </span>
        )}

        <button
          className="btn-buy"
          disabled={busy}
          onClick={() => trade("buy")}
          data-testid="btn-buy"
        >
          BUY
        </button>
        <button
          className="btn-sell"
          disabled={busy}
          onClick={() => trade("sell")}
          data-testid="btn-sell"
        >
          SELL
        </button>
      </div>

      {error && (
        <div
          data-testid="trade-error"
          style={{ fontSize: 11, color: "var(--red)" }}
        >
          {error}
        </div>
      )}

      {lastTrade && (
        <div
          data-testid="trade-success"
          style={{ fontSize: 11, color: "var(--green)" }}
        >
          {lastTrade.side.toUpperCase()} {lastTrade.quantity} {lastTrade.ticker} @{" "}
          {formatPrice(lastTrade.price)}
        </div>
      )}
    </div>
  );
}
