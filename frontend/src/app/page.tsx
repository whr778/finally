"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { TradeBar } from "@/components/TradeBar";
import { Watchlist } from "@/components/Watchlist";

export default function Page() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="h-full flex flex-col">
      <Header />
      <section
        style={{
          flex: 1,
          padding: 12,
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 12,
          overflow: "hidden",
        }}
      >
        <Watchlist selected={selected} onSelect={setSelected} />
        <div
          className="panel"
          style={{ padding: 16, color: "var(--text-muted)", fontSize: 12 }}
        >
          {selected ? `Selected: ${selected}` : "Select a ticker."}
        </div>
      </section>
      <section style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <TradeBar />
      </section>
    </main>
  );
}
