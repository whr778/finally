'use client'

import { usePortfolioStore } from '@/stores/portfolio-store'

const formatCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format

function pnlColor(value: number | null): string {
  if (value === null || value === 0) return 'text-text-primary'
  return value > 0 ? 'text-success' : 'text-danger'
}

function formatPnl(value: number | null): string {
  if (value === null) return '\u2014'
  if (value === 0) return formatCurrency(0)
  if (value > 0) return '+' + formatCurrency(value)
  return formatCurrency(value)
}

function formatPct(value: number | null): string {
  if (value === null) return '\u2014'
  if (value === 0) return '0.00%'
  if (value > 0) return '+' + value.toFixed(2) + '%'
  return value.toFixed(2) + '%'
}

export default function PositionsTable() {
  const positions = usePortfolioStore((s) => s.positions)
  const sorted = [...positions].sort((a, b) => a.ticker.localeCompare(b.ticker))

  return (
    <div
      className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">Positions</h2>
      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-muted">No positions yet. Execute a trade to get started.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(125, 133, 144, 0.2)' }}>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-left">Ticker</th>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-right">Qty</th>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-right">Avg Cost</th>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-right">Price</th>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-right">P&amp;L</th>
                <th className="text-xs font-normal text-text-muted px-2 py-1 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.ticker} data-testid={`position-row-${p.ticker}`}>
                  <td className="font-mono text-sm px-2 py-1 text-left text-text-primary">{p.ticker}</td>
                  <td className="font-mono text-sm px-2 py-1 text-right text-text-primary">
                    {parseFloat(p.quantity.toFixed(2)).toString()}
                  </td>
                  <td className="font-mono text-sm px-2 py-1 text-right text-text-primary">
                    {p.avg_cost.toFixed(2)}
                  </td>
                  <td className="font-mono text-sm px-2 py-1 text-right text-text-primary">
                    {p.current_price !== null ? p.current_price.toFixed(2) : '\u2014'}
                  </td>
                  <td className={`font-mono text-sm px-2 py-1 text-right ${pnlColor(p.unrealized_pnl)}`}>
                    {formatPnl(p.unrealized_pnl)}
                  </td>
                  <td className={`font-mono text-sm px-2 py-1 text-right ${pnlColor(p.pct_change)}`}>
                    {formatPct(p.pct_change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
