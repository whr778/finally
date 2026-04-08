"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";
import { formatPrice } from "@/lib/format";

interface Props {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  onSend: (content: string) => void;
}

export default function ChatPanel({ messages, sending, error, onSend }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    onSend(text);
    setInput("");
  }

  return (
    <div
      data-testid="chat-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid var(--border)",
      }}
    >
      <div className="panel-label">
        AI Assistant
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{ color: "var(--text-dim)", fontSize: 11, marginTop: 12 }}
          >
            Ask FinAlly to analyze your portfolio, suggest trades, or execute
            orders — e.g. "Buy 5 AAPL" or "How is my portfolio doing?"
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`chat-msg-${msg.role}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "88%",
                padding: "7px 10px",
                background:
                  msg.role === "user"
                    ? "rgba(117,57,145,0.25)"
                    : "var(--bg-elevated)",
                border: `1px solid ${
                  msg.role === "user"
                    ? "rgba(117,57,145,0.5)"
                    : "var(--border)"
                }`,
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--text)",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>

            {/* Inline trade confirmations */}
            {msg.trades_executed && msg.trades_executed.length > 0 && (
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignSelf: "flex-start",
                  maxWidth: "88%",
                }}
              >
                {msg.trades_executed.map((t, i) => (
                  <div
                    key={i}
                    data-testid="chat-trade-result"
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      background: t.success
                        ? "rgba(63,185,80,0.12)"
                        : "rgba(248,81,73,0.12)",
                      border: `1px solid ${
                        t.success
                          ? "rgba(63,185,80,0.3)"
                          : "rgba(248,81,73,0.3)"
                      }`,
                      color: t.success ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {t.success
                      ? `${t.side.toUpperCase()} ${t.quantity} ${t.ticker} @ ${formatPrice(t.price)}`
                      : `${t.ticker}: ${t.error}`}
                  </div>
                ))}
              </div>
            )}

            {/* Watchlist changes */}
            {msg.watchlist_changes && msg.watchlist_changes.length > 0 && (
              <div
                style={{
                  marginTop: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignSelf: "flex-start",
                  maxWidth: "88%",
                }}
              >
                {msg.watchlist_changes.map((w, i) => (
                  <div
                    key={i}
                    data-testid="chat-watchlist-result"
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      background: "rgba(32,157,215,0.1)",
                      border: "1px solid rgba(32,157,215,0.3)",
                      color: "var(--blue)",
                    }}
                  >
                    {w.success
                      ? `Watchlist: ${w.action} ${w.ticker}`
                      : `${w.ticker}: ${w.error}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div
            data-testid="chat-loading"
            style={{
              display: "flex",
              gap: 4,
              padding: "6px 0",
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--blue)",
                  opacity: 0.6,
                  animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          data-testid="chat-error"
          style={{
            padding: "4px 12px",
            fontSize: 10,
            color: "var(--red)",
            borderTop: "1px solid var(--border)",
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "8px 10px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 6,
        }}
      >
        <input
          className="input-field"
          style={{ flex: 1, fontSize: 12 }}
          placeholder="Ask FinAlly…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          data-testid="chat-input"
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={sending || !input.trim()}
          data-testid="chat-send"
        >
          Send
        </button>
      </form>
    </div>
  );
}
