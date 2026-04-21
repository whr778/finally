'use client'

import { useEffect, useRef, useState } from 'react'
import { useTickerPrice } from '@/stores/price-store'
import Sparkline from '@/components/sparkline'

interface WatchlistRowProps {
  ticker: string
  onSelect: (ticker: string) => void
  onRemove: (ticker: string) => void
}

export default function WatchlistRow({ ticker, onSelect, onRemove }: WatchlistRowProps) {
  const priceData = useTickerPrice(ticker)
  const initialPriceRef = useRef<number | null>(null)
  const pointsRef = useRef<number[]>([])
  const flashToggle = useRef(false)
  const [flashClass, setFlashClass] = useState('')
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    if (!priceData) return

    if (initialPriceRef.current === null) {
      initialPriceRef.current = priceData.price
    }

    pointsRef.current.push(priceData.price)
    if (pointsRef.current.length > 60) {
      pointsRef.current = pointsRef.current.filter((_, i) => i % 2 === 0)
    }

    setRenderKey((k) => k + 1)

    flashToggle.current = !flashToggle.current
    if (priceData.direction === 'up') {
      setFlashClass(`flash-up ${flashToggle.current ? 'flash-up-a' : 'flash-up-b'}`)
    } else if (priceData.direction === 'down') {
      setFlashClass(`flash-down ${flashToggle.current ? 'flash-down-a' : 'flash-down-b'}`)
    } else {
      setFlashClass('')
    }
  }, [priceData?.price])

  const changePercent = initialPriceRef.current && priceData
    ? ((priceData.price - initialPriceRef.current) / initialPriceRef.current) * 100
    : 0

  return (
    <div
      data-testid={`watchlist-row-${ticker}`}
      className={`flex items-center gap-2 px-2 py-1 cursor-pointer group ${flashClass}`}
      onClick={() => onSelect(ticker)}
    >
      <span className="font-mono text-sm text-text-primary w-14">{ticker}</span>
      <span className="font-mono text-sm text-text-primary w-18 text-right">
        {priceData ? priceData.price.toFixed(2) : '--'}
      </span>
      <span className={`font-mono text-xs w-16 text-right ${changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
      <Sparkline points={pointsRef.current} key={renderKey} />
      <button
        data-testid={`remove-${ticker}`}
        onClick={(e) => { e.stopPropagation(); onRemove(ticker); }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs ml-auto"
      >
        X
      </button>
    </div>
  )
}
