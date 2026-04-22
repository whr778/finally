'use client'

import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, ColorType, CrosshairMode } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import { useTickerPrice } from '@/stores/price-store'

interface TickerChartProps {
  selectedTicker: string | null
}

export default function TickerChart({ selectedTicker }: TickerChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const dataRef = useRef<{ time: UTCTimestamp; value: number }[]>([])

  const priceData = useTickerPrice(selectedTicker ?? '')

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      seriesRef.current = null
      dataRef.current = []
    }

    if (!selectedTicker || !chartContainerRef.current) return

    const container = chartContainerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#161b22' },
        textColor: '#7d8590',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(125, 133, 144, 0.1)' },
        horzLines: { color: 'rgba(125, 133, 144, 0.1)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(125, 133, 144, 0.2)',
      },
      rightPriceScale: {
        borderColor: 'rgba(125, 133, 144, 0.2)',
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: 'rgba(125, 133, 144, 0.4)', style: 3 },
        horzLine: { width: 1, color: 'rgba(125, 133, 144, 0.4)', style: 3 },
      },
    })

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#209dd7',
      lineWidth: 2,
      topColor: 'rgba(32, 157, 215, 0.3)',
      bottomColor: 'rgba(32, 157, 215, 0)',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
    })

    chartRef.current = chart
    seriesRef.current = areaSeries
    dataRef.current = []

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry && chartRef.current) {
        const { width, height } = entry.contentRect
        chartRef.current.resize(width, height)
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      dataRef.current = []
    }
  }, [selectedTicker])

  useEffect(() => {
    if (!priceData || !seriesRef.current || !selectedTicker) return

    const point = { time: priceData.timestamp as UTCTimestamp, value: priceData.price }
    dataRef.current.push(point)
    seriesRef.current.update(point)

    if (dataRef.current.length <= 3 && chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [priceData?.price, priceData?.timestamp, selectedTicker])

  return (
    <div
      className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
      style={{
        border: '1px solid rgba(125,133,144,0.2)',
        boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
      }}
    >
      <h2 className="text-base font-semibold text-text-primary mb-2">
        {selectedTicker ? `${selectedTicker} \u2014 price chart` : 'Chart'}
      </h2>
      {selectedTicker ? (
        <div ref={chartContainerRef} className="flex-1" />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-muted">Click a ticker to view its chart</p>
        </div>
      )}
    </div>
  )
}
