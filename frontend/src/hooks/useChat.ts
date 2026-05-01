"use client";

import { useCallback, useState } from "react";

import type { ChatMessage, ChatResponse } from "@/types";

interface UseChat {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    /* fall through */
  }
  return `HTTP ${res.status}`;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Chat session state. POSTs to /api/chat and tracks in-memory history. */
export function useChat(onActions?: () => void): UseChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!res.ok) {
          throw new Error(await readErrorDetail(res));
        }
        const data: ChatResponse = await res.json();
        const assistantMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          content: data.message,
          trades_executed: data.trades_executed,
          watchlist_changes: data.watchlist_changes,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (
          (data.trades_executed && data.trades_executed.length > 0) ||
          (data.watchlist_changes && data.watchlist_changes.length > 0)
        ) {
          onActions?.();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [loading, onActions],
  );

  return { messages, loading, error, send };
}
