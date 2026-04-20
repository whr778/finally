'use client'

import { useEffect, useState } from 'react'
import { useSSE } from '@/hooks/use-sse'
import { usePortfolioStore } from '@/stores/portfolio-store'
import Header from '@/components/header'
import PlaceholderPanel from '@/components/placeholder-panel'
import TradeBar from '@/components/trade-bar'
import ChatDrawer from '@/components/chat-drawer'

export default function AppShell() {
  useSSE()

  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const [chatOpen, setChatOpen] = useState(true)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header onChatToggle={() => setChatOpen(!chatOpen)} />
      <div className="flex-1 grid grid-cols-[280px_1fr] grid-rows-[1fr_auto_auto] gap-4 p-4 overflow-hidden">
        <PlaceholderPanel title="Watchlist" phaseNote="Coming in Phase 2" />
        <PlaceholderPanel title="Chart" phaseNote="Coming in Phase 4" />
        <div className="col-span-2 grid grid-cols-3 gap-4">
          <PlaceholderPanel title="Positions" phaseNote="Coming in Phase 3" />
          <PlaceholderPanel title="Portfolio Map" phaseNote="Coming in Phase 4" />
          <PlaceholderPanel title="P&amp;L" phaseNote="Coming in Phase 4" />
        </div>
        <div className="col-span-2">
          <TradeBar />
        </div>
      </div>
      <ChatDrawer open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  )
}
