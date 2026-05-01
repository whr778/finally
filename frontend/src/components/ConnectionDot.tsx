"use client";

import type { ConnectionStatus } from "@/hooks/usePrices";

const COLOR: Record<ConnectionStatus, string> = {
  connected: "var(--green)",
  connecting: "var(--accent)",
  disconnected: "var(--red)",
};

const LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting",
  disconnected: "Disconnected",
};

export interface ConnectionDotProps {
  status: ConnectionStatus;
}

export function ConnectionDot({ status }: ConnectionDotProps) {
  return (
    <span
      role="status"
      aria-label={`Connection: ${LABEL[status]}`}
      title={LABEL[status]}
      data-status={status}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLOR[status],
          boxShadow: `0 0 6px ${COLOR[status]}`,
        }}
      />
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {LABEL[status]}
      </span>
    </span>
  );
}
