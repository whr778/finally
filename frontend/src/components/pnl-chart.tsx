'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface Snapshot {
  recorded_at: string
  total_value: number
}

function formatTime(value: string): string {
  const d = new Date(value)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDollar(value: number): string {
  if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'k'
  return '$' + value.toFixed(0)
}

export default function PnlChart() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      const res = await fetch('/api/portfolio/history')
      if (res.ok && active) {
        const data: Snapshot[] = await res.json()
        setSnapshots(data)
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  return (
    <div
      className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">P&amp;L</h2>
      {snapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-muted">Portfolio value chart will appear as data accumulates</p>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshots} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#209dd7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#209dd7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="recorded_at"
                tick={{ fontSize: 12, fill: '#7d8590' }}
                tickFormatter={formatTime}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#7d8590' }}
                tickFormatter={formatDollar}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Area
                type="monotone"
                dataKey="total_value"
                stroke="#209dd7"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
