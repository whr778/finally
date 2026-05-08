"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Header } from "@/components/Header";
import PnLChart from "@/components/PnLChart";
import { PortfolioHeatmap } from "@/components/PortfolioHeatmap";
import { PositionsTable } from "@/components/PositionsTable";
import { PriceChart } from "@/components/PriceChart";
import { TradeBar } from "@/components/TradeBar";
import { Watchlist } from "@/components/Watchlist";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePrices } from "@/hooks/usePrices";

export default function Page() {
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { prices } = usePrices();
  const { portfolio } = usePortfolio();

  const positions = portfolio?.positions ?? [];
  const priceUpdate = selected ? (prices[selected] ?? null) : null;

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
          style={{
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: 12,
            minHeight: 0,
          }}
        >
          <PriceChart ticker={selected} priceUpdate={priceUpdate} />
          <div
            className="panel"
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <div className="panel-label">Portfolio Heatmap</div>
            <div style={{ flex: 1, minHeight: 0, padding: 8 }}>
              <PortfolioHeatmap positions={positions} />
            </div>
          </div>
        </div>
        <ChatPanel onActions={() => setRefreshKey((k) => k + 1)} />
      </section>
      <section style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <TradeBar />
      </section>
      <section
        style={{
          padding: 12,
          borderTop: "1px solid var(--border)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          height: 240,
          flexShrink: 0,
        }}
      >
        <PnLChart refreshTrigger={refreshKey} />
        <PositionsTable positions={positions} prices={prices} />
      </section>
    </main>
  );
}
