"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Header from "@/components/Header";
import Watchlist from "@/components/Watchlist";
import PortfolioHeatmap from "@/components/PortfolioHeatmap";
import PnLChart from "@/components/PnLChart";
import PositionsTable from "@/components/PositionsTable";
import TradeBar from "@/components/TradeBar";
import ChatPanel from "@/components/ChatPanel";
import { usePrices } from "@/hooks/usePrices";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useChat } from "@/hooks/useChat";

// PriceChart uses canvas — must be client-only
const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  ssr: false,
});

const COL_WATCHLIST = 220;
const COL_CHAT = 300;
const ROW_CHART = "200px";
const ROW_BOTTOM = "160px";

export default function TradingTerminal() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>("AAPL");

  const { prices, sparklines, status, flashed } = usePrices();
  const { portfolio, history, refresh: refreshPortfolio } = usePortfolio();
  const { tickers, addTicker, removeTicker, refresh: refreshWatchlist } = useWatchlist();
  const { messages, sending, error: chatError, send: sendChat, clearError } = useChat();

  const positions = portfolio?.positions ?? [];
  const priceHistory = selectedTicker ? (sparklines[selectedTicker] ?? []) : [];
  const latestUpdate = selectedTicker ? prices[selectedTicker] : undefined;

  async function handleChatSend(content: string) {
    const resp = await sendChat(content);
    if (resp) {
      // If AI executed trades or watchlist changes, refresh data
      if (resp.trades_executed.length > 0) refreshPortfolio();
      if (resp.watchlist_changes.length > 0) refreshWatchlist();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* Header */}
      <Header
        totalValue={portfolio?.total_value ?? null}
        cashBalance={portfolio?.cash_balance ?? null}
        status={status}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `${COL_WATCHLIST}px 1fr ${COL_CHAT}px`,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* LEFT: Watchlist */}
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <Watchlist
            tickers={tickers}
            prices={prices}
            sparklines={sparklines}
            flashed={flashed}
            selectedTicker={selectedTicker}
            onSelect={setSelectedTicker}
            onAdd={addTicker}
            onRemove={removeTicker}
          />
        </div>

        {/* CENTER: Charts + Positions + Trade */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: `1fr ${ROW_CHART} ${ROW_BOTTOM}`,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Price chart */}
          <div className="panel" style={{ overflow: "hidden", minHeight: 0 }}>
            <PriceChart
              ticker={selectedTicker}
              priceHistory={priceHistory}
              latestUpdate={latestUpdate}
            />
          </div>

          {/* Heatmap + PnL chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderTop: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div
              className="panel"
              style={{ overflow: "hidden", borderRight: "1px solid var(--border)" }}
            >
              <div className="panel-label">Portfolio Heatmap</div>
              <div style={{ height: "calc(100% - 28px)" }}>
                <PortfolioHeatmap
                  positions={positions}
                  totalValue={portfolio?.total_value ?? 0}
                />
              </div>
            </div>

            <div className="panel" style={{ overflow: "hidden" }}>
              <div className="panel-label">P&amp;L Chart</div>
              <div style={{ height: "calc(100% - 28px)" }}>
                <PnLChart history={history} />
              </div>
            </div>
          </div>

          {/* Positions + Trade bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderTop: "1px solid var(--border)",
              overflow: "hidden",
            }}
          >
            <div className="panel-label">Positions</div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <PositionsTable
                positions={positions}
                onSelectTicker={setSelectedTicker}
              />
            </div>
            <TradeBar
              prices={prices}
              selectedTicker={selectedTicker}
              onTradeComplete={refreshPortfolio}
            />
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <ChatPanel
            messages={messages}
            sending={sending}
            error={chatError}
            onSend={handleChatSend}
          />
        </div>
      </div>
    </div>
  );
}
