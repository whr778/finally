'use client'

import { useEffect, useState } from 'react'
import { useSSE } from '@/hooks/use-sse'
import { usePortfolioStore } from '@/stores/portfolio-store'
import Header from '@/components/header'
import PlaceholderPanel from '@/components/placeholder-panel'
import WatchlistPanel from '@/components/watchlist-panel'
import TradeBar from '@/components/trade-bar'
import ChatDrawer from '@/components/chat-drawer'

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
        <div
          className="bg-bg-panel rounded-lg p-4"
          style={{
            border: '1px solid rgba(125,133,144,0.2)',
            boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
          }}
        >
          <h2 className="text-base font-semibold text-text-primary mb-2">Chart</h2>
          <p className="text-xs text-text-muted">
            {selectedTicker ? `${selectedTicker} \u2014 price chart` : 'Click a ticker to view its chart'}
          </p>
        </div>
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <PlaceholderPanel title="Positions" phaseNote="Coming in Phase 3" />
          <PlaceholderPanel title="Portfolio Map" phaseNote="Coming in Phase 4" />
          <PlaceholderPanel title="P&amp;L" phaseNote="Coming in Phase 4" />
        </div>
        <div className="col-span-2">
          <TradeBar selectedTicker={selectedTicker} />
        </div>
      </div>
      <ChatDrawer open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  )
}
