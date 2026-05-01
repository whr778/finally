"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePrices } from "@/hooks/usePrices";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Sparkline } from "./Sparkline";

interface WatchlistProps {
  selected: string | null;
  onSelect: (ticker: string) => void;
}

const FLASH_MS = 600;

function formatPrice(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  return p.toFixed(2);
}

function formatPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(2)}%`;
}

/** Watchlist panel: ticker rows with live price, change %, sparkline, remove,
 *  plus an add-ticker form and connection status indicator.
 */
export function Watchlist({ selected, onSelect }: WatchlistProps) {
  const { prices, history, firstPrices, connectionStatus } = usePrices();
  const { entries, addTicker, removeTicker, error } = useWatchlist();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const prevPriceRef = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const newFlash: Record<string, "up" | "down"> = {};
    for (const [ticker, update] of Object.entries(prices)) {
      const prev = prevPriceRef.current[ticker];
      if (prev !== undefined && update.price !== prev) {
        newFlash[ticker] = update.price > prev ? "up" : "down";
      }
      prevPriceRef.current[ticker] = update.price;
    }
    if (Object.keys(newFlash).length === 0) return;

    setFlash((cur) => ({ ...cur, ...newFlash }));
    const timer = window.setTimeout(() => {
      setFlash((cur) => {
        const next = { ...cur };
        for (const t of Object.keys(newFlash)) delete next[t];
        return next;
      });
    }, FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [prices]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    setBusy(true);
    setAddError(null);
    try {
      await addTicker(ticker);
      setInput("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(ticker: string) {
    setAddError(null);
    try {
      await removeTicker(ticker);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  const statusColor =
    connectionStatus === "connected"
      ? "var(--green)"
      : connectionStatus === "disconnected"
        ? "var(--red)"
        : "var(--accent)";

  return (
    <section className="panel" data-testid="watchlist">
      <div
        className="panel-label"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Watchlist</span>
        <span
          data-testid="connection-status"
          aria-label={`stream ${connectionStatus}`}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
            }}
          />
          {connectionStatus}
        </span>
      </div>

      <form
        onSubmit={handleAdd}
        style={{
          display: "flex",
          gap: 6,
          padding: 8,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <input
          aria-label="Add ticker"
          className="input-field"
          placeholder="ADD TICKER"
          value={input}
          maxLength={5}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          style={{ flex: 1, textTransform: "uppercase" }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !input.trim()}
        >
          Add
        </button>
      </form>

      {(addError ?? error) && (
        <div
          role="alert"
          style={{ padding: "4px 10px", fontSize: 11, color: "var(--red)" }}
        >
          {addError ?? error}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              color: "var(--text-dim)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <th style={{ textAlign: "left", padding: "6px 10px" }}>Ticker</th>
            <th style={{ textAlign: "right", padding: "6px 6px" }}>Price</th>
            <th style={{ textAlign: "right", padding: "6px 6px" }}>Chg %</th>
            <th style={{ textAlign: "right", padding: "6px 10px" }}>Trend</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const update = prices[entry.ticker];
            const price = update?.price ?? entry.price ?? null;
            const first = firstPrices[entry.ticker];
            const pct =
              first !== undefined && update
                ? ((update.price - first) / first) * 100
                : null;
            const flashClass = flash[entry.ticker];
            const isSelected = selected === entry.ticker;
            const series = history[entry.ticker] ?? [];

            return (
              <tr
                key={entry.ticker}
                data-testid={`watchlist-row-${entry.ticker}`}
                onClick={() => onSelect(entry.ticker)}
                aria-selected={isSelected}
                style={{
                  cursor: "pointer",
                  background: isSelected ? "var(--bg-elevated)" : undefined,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                  {entry.ticker}
                </td>
                <td
                  data-testid={`price-${entry.ticker}`}
                  className={flashClass ? `flash-${flashClass}` : undefined}
                  style={{
                    padding: "6px 6px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatPrice(price)}
                </td>
                <td
                  className={
                    pct === null ? "muted" : pct >= 0 ? "positive" : "negative"
                  }
                  style={{
                    padding: "6px 6px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {pct === null ? "—" : formatPct(pct)}
                </td>
                <td style={{ padding: "6px 10px", textAlign: "right" }}>
                  <Sparkline data={series} />
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  <button
                    aria-label={`Remove ${entry.ticker}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRemove(entry.ticker);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      padding: "2px 6px",
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
