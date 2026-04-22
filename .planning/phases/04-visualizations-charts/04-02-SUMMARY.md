---
phase: 04-visualizations-charts
plan: 02
subsystem: frontend-visualizations
tags: [lightweight-charts, area-chart, ticker-chart, appshell-integration]
dependency_graph:
  requires: [heatmap-panel, pnl-chart, price-store, lightweight-charts]
  provides: [ticker-chart, complete-visualization-dashboard]
  affects: [app-shell, dashboard-layout]
tech_stack:
  added: []
  patterns: [lightweight-charts-5.x-area-series, resize-observer, sse-price-accumulation, chart-lifecycle-cleanup]
key_files:
  created:
    - frontend/src/components/ticker-chart.tsx
  modified:
    - frontend/src/components/app-shell.tsx
decisions:
  - Used ColorType.Solid and CrosshairMode.Normal enums instead of magic numbers for Lightweight Charts 5.x config
  - Area series uses update() for streaming data (handles duplicate timestamps gracefully)
  - fitContent() called only on first 3 data points to auto-zoom then lets user scroll
metrics:
  duration: 3m
  completed: "2026-04-22T10:26:46Z"
---

# Phase 04 Plan 02: TickerChart and AppShell Integration Summary

Lightweight Charts 5.x area chart component for selected ticker with real-time SSE price accumulation, plus full AppShell wiring of all three Phase 4 visualization components replacing the last placeholders.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create TickerChart with Lightweight Charts | fd2b3b9 | frontend/src/components/ticker-chart.tsx |
| 2 | Wire HeatmapPanel, PnlChart, TickerChart into AppShell | 47b073d | frontend/src/components/app-shell.tsx |

## Key Implementation Details

### TickerChart (ticker-chart.tsx)
- Lightweight Charts 5.x createChart with AreaSeries for selected ticker
- Blue gradient fill: lineColor #209dd7, topColor rgba(32,157,215,0.3), bottomColor transparent
- Dark panel background #161b22 with muted grid lines at 0.1 opacity
- Subscribes to SSE price data via useTickerPrice Zustand selector
- Accumulates price points in a ref, uses series.update() for efficient streaming
- ResizeObserver for responsive chart sizing within flex container
- Empty state: "Click a ticker to view its chart" (preserves E2E contract)
- Header: "{TICKER} -- price chart" with em dash (preserves E2E contract from watchlist.spec.ts)
- Full cleanup: chart.remove() + ResizeObserver disconnect on ticker change and unmount

### AppShell Integration (app-shell.tsx)
- Replaced chart placeholder div with TickerChart component
- Replaced PlaceholderPanel "Portfolio Map" with HeatmapPanel (onSelectTicker={setSelectedTicker})
- Replaced PlaceholderPanel "P&L" with PnlChart
- Removed PlaceholderPanel import entirely -- no Phase 4 placeholders remain
- HeatmapPanel clicking a treemap tile updates selectedTicker (same as watchlist row click)
- All prior components unchanged: Header, WatchlistPanel, PositionsTable, TradeBar, ChatDrawer

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - TickerChart is fully wired to SSE price data via useTickerPrice, and all AppShell placeholders are replaced with real components.

## Self-Check: PASSED

All 2 files verified on disk. All 2 commit hashes (fd2b3b9, 47b073d) verified in git log.
