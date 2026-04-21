'use client'

import { useState, useEffect } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'

interface TradeBarProps {
  selectedTicker: string | null
}

export default function TradeBar({ selectedTicker }: TradeBarProps) {
  const [ticker, setTicker] = useState(selectedTicker || '')
  const [qty, setQty] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)

  useEffect(() => {
    if (selectedTicker) setTicker(selectedTicker)
  }, [selectedTicker])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  async function handleTrade(side: 'buy' | 'sell') {
    if (!ticker.trim()) {
      setFeedback({ type: 'error', message: 'Enter a ticker symbol' })
      return
    }
    const quantity = parseFloat(qty)
    if (!qty || isNaN(quantity) || quantity <= 0) {
      setFeedback({ type: 'error', message: 'Enter a quantity' })
      return
    }
    try {
      const res = await fetch('/api/portfolio/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase(), quantity, side }),
      })
      if (!res.ok) {
        const err = await res.json()
        setFeedback({ type: 'error', message: err.detail || 'Trade failed' })
        return
      }
      const trade = await res.json()
      setFeedback({
        type: 'success',
        message: `${trade.side.toUpperCase()} ${trade.quantity} ${trade.ticker} @ $${trade.price.toFixed(2)}`,
      })
      setQty('')
      fetchPortfolio()
    } catch {
      setFeedback({ type: 'error', message: 'Trade failed. Try again.' })
    }
  }

  return (
    <div
      data-testid="trade-bar"
      className="bg-bg-panel rounded-lg p-3 flex flex-col"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <div className="flex items-center gap-3">
        <input
          data-testid="trade-ticker"
          type="text"
          placeholder="Ticker"
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-24 border border-border-subtle"
        />
        <input
          data-testid="trade-qty"
          type="number"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          step="any"
          min="0"
          className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-20 border border-border-subtle [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          data-testid="btn-buy"
          onClick={() => handleTrade('buy')}
          className="bg-success/50 text-text-primary font-semibold text-sm rounded px-4 py-1.5 hover:bg-success/70"
        >
          Buy
        </button>
        <button
          data-testid="btn-sell"
          onClick={() => handleTrade('sell')}
          className="bg-danger/50 text-text-primary font-semibold text-sm rounded px-4 py-1.5 hover:bg-danger/70"
        >
          Sell
        </button>
      </div>
      {feedback?.type === 'success' && (
        <span data-testid="trade-success" className="text-success font-mono text-xs mt-1">
          {feedback.message}
        </span>
      )}
      {feedback?.type === 'error' && (
        <span data-testid="trade-error" className="text-danger font-mono text-xs mt-1">
          {feedback.message}
        </span>
      )}
    </div>
  )
}
