'use client'

import { useEffect, useState } from 'react'
import { useSSE } from '@/hooks/use-sse'
import { usePortfolioStore } from '@/stores/portfolio-store'
import Header from '@/components/header'
import TickerChart from '@/components/ticker-chart'
import HeatmapPanel from '@/components/heatmap-panel'
import PnlChart from '@/components/pnl-chart'
import WatchlistPanel from '@/components/watchlist-panel'
import TradeBar from '@/components/trade-bar'
import ChatDrawer from '@/components/chat-drawer'
import PositionsTable from '@/components/positions-table'

export default function AppShell() {
  useSSE()

  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
  useEffect(() => {
    fetchPortfolio()
    const interval = setInterval(fetchPortfolio, 5000)
    return () => clearInterval(interval)
  }, [fetchPortfolio])

  const [chatOpen, setChatOpen] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onChatToggle={() => setChatOpen(!chatOpen)} />
      <div className="flex-1 grid grid-cols-[280px_1fr] grid-rows-[1fr_auto_auto] gap-4 p-4 overflow-hidden">
        <WatchlistPanel onSelectTicker={setSelectedTicker} />
        <TickerChart selectedTicker={selectedTicker} />
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <PositionsTable />
          <HeatmapPanel onSelectTicker={setSelectedTicker} />
          <PnlChart />
        </div>
        <div className="col-span-2">
          <TradeBar selectedTicker={selectedTicker} />
        </div>
      </div>
      <ChatDrawer open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  )
}
