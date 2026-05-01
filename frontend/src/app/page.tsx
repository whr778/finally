"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Header } from "@/components/Header";
import { TradeBar } from "@/components/TradeBar";
import { Watchlist } from "@/components/Watchlist";

export default function Page() {
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="h-full flex flex-col">
      <Header />
      <section
        style={{
          flex: 1,
          padding: 12,
          display: "grid",
          gridTemplateColumns: "360px 1fr 360px",
          gap: 12,
          overflow: "hidden",
        }}
      >
        <Watchlist key={`wl-${refreshKey}`} selected={selected} onSelect={setSelected} />
        <div
          className="panel"
          style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}
        >
          {selected ? `Selected: ${selected}` : "Select a ticker."}
        </div>
        <ChatPanel onActions={() => setRefreshKey((k) => k + 1)} />
      </section>
      <section style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <TradeBar />
      </section>
    </main>
  );
}
