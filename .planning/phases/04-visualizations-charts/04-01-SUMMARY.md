---
phase: 04-visualizations-charts
plan: 01
subsystem: frontend-visualizations
tags: [recharts, treemap, area-chart, portfolio, visualization]
dependency_graph:
  requires: [portfolio-store, positions-table-patterns]
  provides: [heatmap-panel, pnl-chart, charting-libraries]
  affects: [dashboard-layout]
tech_stack:
  added: [recharts-3.8.1, lightweight-charts-5.1.0]
  patterns: [recharts-treemap, recharts-areachart, gradient-fill, panel-glow, zustand-selector]
key_files:
  created:
    - frontend/src/components/heatmap-panel.tsx
    - frontend/src/components/pnl-chart.tsx
  modified:
    - frontend/package.json
    - frontend/package-lock.json
decisions:
  - Recharts Treemap content prop uses function component defined inside HeatmapPanel for closure over onSelectTicker
  - Hover effect implemented via React useState tracking hovered tile name and adjusting fillOpacity
  - PnlChart uses HTML entity P&amp;L for heading to avoid JSX ampersand issues
metrics:
  duration: 3m
  completed: "2026-04-22T10:19:08Z"
---

# Phase 04 Plan 01: Charting Dependencies and Portfolio Visualizations Summary

Installed recharts 3.8.1 and lightweight-charts 5.1.0, then created HeatmapPanel (Recharts Treemap for portfolio positions by weight and P&L color) and PnlChart (Recharts AreaChart with blue gradient fill polling /api/portfolio/history every 30s).

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install recharts and lightweight-charts | 9522970 | frontend/package.json, frontend/package-lock.json |
| 2 | Create HeatmapPanel with Recharts Treemap | 1abde95 | frontend/src/components/heatmap-panel.tsx |
| 3 | Create PnlChart with Recharts AreaChart | b849559 | frontend/src/components/pnl-chart.tsx |

## Key Implementation Details

### HeatmapPanel (heatmap-panel.tsx)
- Consumes positions from usePortfolioStore via Zustand selector
- Maps positions to treemap data: size = quantity * current_price (market value)
- P&L color scale: green (#3fb950) for gains, red (#f85149) for losses, gray (#7d8590) for flat (<0.5%)
- Opacity tiers at 2% and 5% thresholds (0.4, 0.6, 0.8)
- Custom tile renderer shows ticker symbol and P&L percentage
- data-testid={`tile-${name}`} on each tile for E2E contract
- onSelectTicker prop fires on tile click for main chart integration
- Hover increases fillOpacity by 0.15 via React state

### PnlChart (pnl-chart.tsx)
- Fetches GET /api/portfolio/history on mount, polls every 30 seconds
- Recharts AreaChart with blue #209dd7 stroke and gradient fill (0.3 to 0 opacity)
- XAxis formatted as HH:MM, YAxis formatted as $X.Xk
- No CartesianGrid, no Tooltip per UI-SPEC
- Empty state: "Portfolio value chart will appear as data accumulates"

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - both components are fully wired to their data sources (Zustand store and API endpoint).

## Self-Check: PASSED

All 3 files created verified on disk. All 3 commit hashes (9522970, 1abde95, b849559) verified in git log.
