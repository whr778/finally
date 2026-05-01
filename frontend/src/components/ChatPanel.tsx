"use client";

import { useEffect, useRef, useState } from "react";

import { useChat } from "@/hooks/useChat";
import type { ChatMessage, ChatTradeResult, ChatWatchlistResult } from "@/types";

interface ChatPanelProps {
  onActions?: () => void;
}

function TradeLine({ t }: { t: ChatTradeResult }) {
  if (!t.success) {
    return (
      <div className="negative" style={{ fontSize: 11 }}>
        {t.side.toUpperCase()} {t.quantity} {t.ticker} failed: {t.error}
      </div>
    );
  }
  const total = (t.price * t.quantity).toFixed(2);
  return (
    <div className="positive" style={{ fontSize: 11 }}>
      Filled {t.side.toUpperCase()} {t.quantity} {t.ticker} @ ${t.price.toFixed(2)} ({total})
    </div>
  );
}

function WatchlistLine({ w }: { w: ChatWatchlistResult }) {
  if (!w.success) {
    return (
      <div className="negative" style={{ fontSize: 11 }}>
        Watchlist {w.action} {w.ticker} failed: {w.error}
      </div>
    );
  }
  const verb = w.action === "add" ? "Added" : "Removed";
  return (
    <div className="muted" style={{ fontSize: 11 }}>
      {verb} {w.ticker} {w.action === "add" ? "to" : "from"} watchlist
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div
      data-testid={`chat-msg-${m.role}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          background: isUser ? "var(--bg-elevated)" : "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderLeft: isUser ? undefined : "2px solid var(--blue)",
          padding: "6px 10px",
          maxWidth: "90%",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {m.content}
      </div>
      {(m.trades_executed?.length || m.watchlist_changes?.length) ? (
        <div
          data-testid="chat-actions"
          style={{
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            paddingLeft: 6,
          }}
        >
          {m.trades_executed?.map((t, i) => <TradeLine key={`t-${i}`} t={t} />)}
          {m.watchlist_changes?.map((w, i) => <WatchlistLine key={`w-${i}`} w={w} />)}
        </div>
      ) : null}
    </div>
  );
}

/** Docked AI chat sidebar. POSTs messages, renders inline action confirmations. */
export function ChatPanel({ onActions }: ChatPanelProps) {
  const { messages, loading, error, send } = useChat(onActions);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = input;
    setInput("");
    await send(content);
  }

  if (collapsed) {
    return (
      <div
        className="panel"
        data-testid="chat-panel-collapsed"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
        }}
      >
        <span className="panel-label" style={{ padding: 0, border: 0 }}>
          AI Assistant
        </span>
        <button
          type="button"
          aria-label="expand chat"
          className="btn-primary"
          style={{ padding: "2px 10px", fontSize: 11 }}
          onClick={() => setCollapsed(false)}
        >
          Open
        </button>
      </div>
    );
  }

  return (
    <div
      className="panel"
      data-testid="chat-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="panel-label" style={{ border: 0 }}>
          AI Assistant
        </span>
        <button
          type="button"
          aria-label="collapse chat"
          onClick={() => setCollapsed(true)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "4px 10px",
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>

      <div
        ref={scrollRef}
        data-testid="chat-history"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 10,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && !loading && (
          <div className="muted" style={{ fontSize: 11 }}>
            Ask me about your portfolio, request trades, or manage your watchlist.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {loading && (
          <div
            role="status"
            data-testid="chat-loading"
            className="muted"
            style={{ fontSize: 11, padding: "4px 0" }}
          >
            Thinking...
          </div>
        )}
        {error && (
          <div
            role="alert"
            data-testid="chat-error"
            className="negative"
            style={{ fontSize: 11, padding: "4px 0" }}
          >
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        style={{
          display: "flex",
          gap: 6,
          padding: 8,
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          aria-label="chat message"
          className="input-field"
          placeholder="Ask FinAlly..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || input.trim().length === 0}
        >
          Send
        </button>
      </form>
    </div>
  );
}
