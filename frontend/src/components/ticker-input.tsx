'use client'

import { useState } from 'react'
import { useWatchlistStore } from '@/stores/watchlist-store'

export default function TickerInput() {
  const [value, setValue] = useState('')
  const addTicker = useWatchlistStore((s) => s.addTicker)
  const error = useWatchlistStore((s) => s.error)
  const clearError = useWatchlistStore((s) => s.clearError)

  const handleAdd = async () => {
    const trimmed = value.trim().toUpperCase()
    if (!trimmed) return
    await addTicker(trimmed)
    if (!useWatchlistStore.getState().error) {
      setValue('')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          data-testid="ticker-input"
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); clearError(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Enter ticker..."
          maxLength={10}
          className="flex-1 bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 border border-border-subtle placeholder:text-text-muted"
        />
        <button
          data-testid="add-btn"
          onClick={handleAdd}
          className="bg-accent-purple text-text-primary font-semibold text-sm rounded px-2 py-1.5 hover:brightness-110"
        >
          +
        </button>
      </div>
      {error && (
        <p data-testid="add-error" className="text-xs text-danger mt-1">{error}</p>
      )}
    </div>
  )
}
