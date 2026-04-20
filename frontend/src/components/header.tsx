'use client'

import { usePortfolioStore } from '@/stores/portfolio-store'
import ConnectionDot from '@/components/connection-dot'

const formatCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format

interface HeaderProps {
  onChatToggle: () => void
}

export default function Header({ onChatToggle }: HeaderProps) {
  const totalValue = usePortfolioStore((s) => s.totalValue)
  const cashBalance = usePortfolioStore((s) => s.cashBalance)

  return (
    <header
      className="h-12 bg-bg-panel flex items-center justify-between px-4 sticky top-0 z-10"
      style={{ borderBottom: '1px solid rgba(125,133,144,0.2)' }}
    >
      <span className="text-xl font-semibold">
        <span className="text-text-primary">Fin</span>
        <span className="text-accent-yellow">Ally</span>
      </span>
      <div className="flex items-center gap-4">
        <span
          data-testid="total-value"
          className="text-xl font-semibold font-sans"
        >
          {formatCurrency(totalValue)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Cash</span>
          <span data-testid="cash-balance" className="text-sm font-mono">
            {formatCurrency(cashBalance)}
          </span>
        </div>
        <ConnectionDot />
        <button
          onClick={onChatToggle}
          className="text-xs text-text-muted hover:text-accent-blue px-2 py-1 rounded border border-border-subtle"
        >
          Chat
        </button>
      </div>
    </header>
  )
}
