'use client'

import { useState } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
import { Treemap, ResponsiveContainer } from 'recharts'

interface HeatmapPanelProps {
  onSelectTicker: (ticker: string) => void
}

function tileColor(pctChange: number): { color: string; opacity: number } {
  const abs = Math.abs(pctChange)
  if (abs < 0.5) return { color: '#7d8590', opacity: 0.3 }
  if (pctChange > 0) {
    if (pctChange >= 5) return { color: '#3fb950', opacity: 0.8 }
    if (pctChange >= 2) return { color: '#3fb950', opacity: 0.6 }
    return { color: '#3fb950', opacity: 0.4 }
  }
  if (pctChange <= -5) return { color: '#f85149', opacity: 0.8 }
  if (pctChange <= -2) return { color: '#f85149', opacity: 0.6 }
  return { color: '#f85149', opacity: 0.4 }
}

function formatPct(value: number): string {
  if (value === 0) return '0.00%'
  if (value > 0) return '+' + value.toFixed(2) + '%'
  return value.toFixed(2) + '%'
}

export default function HeatmapPanel({ onSelectTicker }: HeatmapPanelProps) {
  const positions = usePortfolioStore((s) => s.positions)
  const [hoveredTile, setHoveredTile] = useState<string | null>(null)

  const data = positions.map((p) => ({
    name: p.ticker,
    size: p.quantity * (p.current_price ?? p.avg_cost),
    pct_change: p.pct_change ?? 0,
    unrealized_pnl: p.unrealized_pnl ?? 0,
  }))

  function CustomTile(props: Record<string, unknown>) {
    const { x, y, width, height, name, pct_change } = props as {
      x: number
      y: number
      width: number
      height: number
      name: string
      pct_change: number
    }
    if (!name || width <= 0 || height <= 0) return null
    const pct = pct_change ?? 0
    const { color, opacity } = tileColor(pct)
    const isHovered = hoveredTile === name
    const fillOpacity = isHovered ? Math.min(opacity + 0.15, 1) : opacity
    const showPct = width >= 40 && height >= 30

    return (
      <g
        data-testid={`tile-${name}`}
        onClick={() => onSelectTicker(name)}
        onMouseEnter={() => setHoveredTile(name)}
        onMouseLeave={() => setHoveredTile(null)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity={fillOpacity}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
        />
        <text
          x={x + 8}
          y={y + 18}
          fill="#e6edf3"
          fontSize={14}
          fontFamily="'JetBrains Mono', monospace"
        >
          {name}
        </text>
        {showPct && (
          <text
            x={x + 8}
            y={y + 34}
            fill="#e6edf3"
            fontSize={12}
            fontFamily="'Inter', system-ui, sans-serif"
          >
            {formatPct(pct)}
          </text>
        )}
      </g>
    )
  }

  return (
    <div
      className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">Portfolio Map</h2>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-muted">No positions -- buy shares to see your portfolio map</p>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              content={<CustomTile />}
              isAnimationActive={false}
              aspectRatio={1}
            />
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
