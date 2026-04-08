"use client";
import type { ConnectionStatus } from "@/hooks/usePrices";

interface Props {
  status: ConnectionStatus;
}

const STATUS_CONFIG = {
  connected: { color: "#3fb950", label: "LIVE" },
  connecting: { color: "#ecad0a", label: "CONNECTING" },
  disconnected: { color: "#f85149", label: "DISCONNECTED" },
} as const;

export default function ConnectionDot({ status }: Props) {
  const { color, label } = STATUS_CONFIG[status];
  return (
    <span className="flex items-center gap-1.5" data-testid="connection-dot">
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: status === "connected" ? `0 0 6px ${color}` : "none",
          display: "inline-block",
        }}
      />
      <span style={{ color, fontSize: 10, letterSpacing: "0.08em" }}>
        {label}
      </span>
    </span>
  );
}
