'use client'

import { useEffect } from 'react'
import { useWatchlistStore } from '@/stores/watchlist-store'
import WatchlistRow from '@/components/watchlist-row'
import TickerInput from '@/components/ticker-input'

interface WatchlistPanelProps {
  onSelectTicker: (ticker: string) => void
}

export default function WatchlistPanel({ onSelectTicker }: WatchlistPanelProps) {
  const tickers = useWatchlistStore((s) => s.tickers)
  const removeTicker = useWatchlistStore((s) => s.removeTicker)
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  return (
    <div
      className="bg-bg-panel rounded-lg p-4 flex flex-col h-full"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">Watchlist</h2>
      <div className="mb-2">
        <TickerInput />
      </div>
      <div className="flex-1 overflow-y-auto">
        {tickers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-text-muted">No tickers</p>
            <p className="text-xs text-text-muted mt-1">Add a ticker symbol above to start watching prices.</p>
          </div>
        ) : (
          tickers.map((entry) => (
            <WatchlistRow
              key={entry.ticker}
              ticker={entry.ticker}
              onSelect={onSelectTicker}
              onRemove={removeTicker}
            />
          ))
        )}
      </div>
    </div>
  )
}
