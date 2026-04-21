'use client'

interface TradeBarProps {
  selectedTicker: string | null
}

export default function TradeBar({ selectedTicker }: TradeBarProps) {
  return (
    <div
      data-testid="trade-bar"
      className="bg-bg-panel rounded-lg p-3 flex items-center gap-3"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <input
        data-testid="trade-ticker"
        type="text"
        placeholder="Ticker"
        value={selectedTicker || ''}
        readOnly
        className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-24 border border-border-subtle"
      />
      <input
        data-testid="trade-qty"
        type="number"
        placeholder="Qty"
        disabled
        className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-20 disabled:opacity-50 border border-border-subtle"
      />
      <button
        data-testid="btn-buy"
        disabled
        className="bg-success/50 text-text-primary font-semibold text-sm rounded px-4 py-1.5 disabled:opacity-50"
      >
        Buy
      </button>
      <button
        data-testid="btn-sell"
        disabled
        className="bg-danger/50 text-text-primary font-semibold text-sm rounded px-4 py-1.5 disabled:opacity-50"
      >
        Sell
      </button>
    </div>
  )
}
