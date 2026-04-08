"use client";
/** Chat state: conversation history and message sending. */

import { useCallback, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/api";
import type { ChatMessage, ChatResponse } from "@/types";

export interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  send: (content: string) => Promise<ChatResponse | null>;
  clearError: () => void;
}

export function useChat(): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);
  const newId = () => `msg-${++counterRef.current}`;

  const send = useCallback(async (content: string): Promise<ChatResponse | null> => {
    if (!content.trim()) return null;

    const userMsg: ChatMessage = { id: newId(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    setError(null);

    try {
      const resp = await sendChatMessage(content);
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: resp.message,
        trades_executed: resp.trades_executed,
        watchlist_changes: resp.watchlist_changes,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return resp;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      setError(msg);
      return null;
    } finally {
      setSending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { messages, sending, error, send, clearError };
}
