"use client";
import { useState } from "react";
import Sparkline from "./Sparkline";
import type { WatchlistEntry, PriceUpdate } from "@/types";
import type { SparklineMap } from "@/hooks/usePrices";
import { formatPrice, formatPct } from "@/lib/format";

interface Props {
  tickers: WatchlistEntry[];
  prices: Record<string, PriceUpdate>;
  sparklines: SparklineMap;
  flashed: Set<string>;
  selectedTicker: string | null;
  onSelect: (ticker: string) => void;
  onAdd: (ticker: string) => Promise<void>;
  onRemove: (ticker: string) => Promise<void>;
}

export default function Watchlist({
  tickers,
  prices,
  sparklines,
  flashed,
  selectedTicker,
  onSelect,
  onAdd,
  onRemove,
}: Props) {
  const [input, setInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    try {
      setAddError(null);
      await onAdd(sym);
      setInput("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add ticker");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="panel-label">Watchlist</div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tickers.map((entry) => {
          const live = prices[entry.ticker];
          const price = live?.price ?? entry.price;
          const direction = live?.direction ?? entry.direction;
          const changePct = live?.change_percent ?? entry.change_percent;
          const sparkData = sparklines[entry.ticker] ?? [];
          const isFlashing = flashed.has(entry.ticker);
          const isSelected = selectedTicker === entry.ticker;

          const flashClass =
            isFlashing && direction === "up"
              ? "flash-up"
              : isFlashing && direction === "down"
              ? "flash-down"
              : "";

          return (
            <div
              key={entry.ticker}
              data-testid={`watchlist-row-${entry.ticker}`}
              className={flashClass}
              onClick={() => onSelect(entry.ticker)}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 64px",
                alignItems: "center",
                padding: "5px 10px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
                background: isSelected
                  ? "rgba(32, 157, 215, 0.08)"
                  : "transparent",
                borderLeft: isSelected
                  ? "2px solid var(--blue)"
                  : "2px solid transparent",
                transition: "background 0.1s",
              }}
            >
              {/* Ticker + price */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {entry.ticker}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color:
                      direction === "up"
                        ? "var(--green)"
                        : direction === "down"
                        ? "var(--red)"
                        : "var(--text-muted)",
                  }}
                >
                  {formatPrice(price)}
                </div>
              </div>

              {/* Change percent */}
              <div
                style={{
                  fontSize: 10,
                  color:
                    changePct != null && changePct > 0
                      ? "var(--green)"
                      : changePct != null && changePct < 0
                      ? "var(--red)"
                      : "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {formatPct(changePct)}
              </div>

              {/* Sparkline + remove */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkline data={sparkData} width={52} height={20} />
                <button
                  data-testid={`remove-${entry.ticker}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      setRemoveError(null);
                      await onRemove(entry.ticker);
                    } catch (err) {
                      setRemoveError(err instanceof Error ? err.message : "Failed to remove ticker");
                    }
                  }}
                  title="Remove"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add ticker form */}
      <form onSubmit={handleAdd} style={{ padding: "8px 10px", borderTop: "1px solid var(--border)" }}>
        {removeError && (
          <div
            style={{ color: "var(--red)", fontSize: 10, marginBottom: 4 }}
            data-testid="remove-error"
          >
            {removeError}
          </div>
        )}
        {addError && (
          <div
            style={{ color: "var(--red)", fontSize: 10, marginBottom: 4 }}
            data-testid="add-error"
          >
            {addError}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="input-field"
            style={{ flex: 1, textTransform: "uppercase" }}
            placeholder="Add ticker…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={10}
            data-testid="ticker-input"
          />
          <button type="submit" className="btn-primary" data-testid="add-btn">
            +
          </button>
        </div>
      </form>
    </div>
  );
}
