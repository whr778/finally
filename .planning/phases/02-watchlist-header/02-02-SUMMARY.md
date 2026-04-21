---
phase: 02-watchlist-header
plan: 02
subsystem: frontend
tags: [watchlist, sparkline, flash-animation, selected-ticker, periodic-fetch]
dependency_graph:
  requires: [watchlist-store-crud, flash-css, sparkline-component]
  provides: [watchlist-panel-ui, selected-ticker-state, periodic-portfolio-refresh]
  affects: [03-PLAN, 04-PLAN]
tech_stack:
  added: []
  patterns: [per-ticker-zustand-selector, ref-based-sparkline-accumulation, flash-toggle-alternation]
key_files:
  created:
    - frontend/src/components/watchlist-row.tsx
    - frontend/src/components/ticker-input.tsx
    - frontend/src/components/watchlist-panel.tsx
  modified:
    - frontend/src/components/app-shell.tsx
    - frontend/src/components/trade-bar.tsx
decisions:
  - "Used useTickerPrice per-ticker selector for render isolation -- only the row whose price changed re-renders"
  - "Sparkline points accumulated via useRef with downsample filter at 60 points to cap memory (threat T-02-05)"
  - "Flash animation uses toggle ref to alternate between -a/-b CSS class variants for consecutive same-direction flashes"
  - "TradeBar ticker input changed from disabled to readOnly so value is visible and selectable"
metrics:
  duration: 4m
  completed: "2026-04-21T11:46:00Z"
---

# Phase 02 Plan 02: Watchlist UI Components and AppShell Wiring Summary

WatchlistRow with per-ticker price subscription, green/red flash animations, and SVG sparkline accumulation; TickerInput add-ticker form with Enter key and error display; WatchlistPanel container replacing placeholder; AppShell wired with selected ticker state flowing to chart placeholder (em dash format) and TradeBar, plus 5-second periodic portfolio re-fetch for live header values.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create WatchlistRow, TickerInput, and WatchlistPanel components | 9e9e2d3 | frontend/src/components/watchlist-row.tsx, frontend/src/components/ticker-input.tsx, frontend/src/components/watchlist-panel.tsx |
| 2 | Wire WatchlistPanel into AppShell, add selected ticker state, update TradeBar | 815802e | frontend/src/components/app-shell.tsx, frontend/src/components/trade-bar.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- watchlist-row.tsx: data-testid watchlist-row-{ticker} and remove-{ticker} present
- watchlist-row.tsx: useTickerPrice per-ticker selector, flash-up/flash-down logic, Sparkline import, pointsRef accumulation, initialPriceRef baseline, e.stopPropagation on remove
- ticker-input.tsx: data-testid ticker-input, add-btn, add-error present; onKeyDown Enter handler; addTicker from store
- watchlist-panel.tsx: WatchlistRow, TickerInput, fetchWatchlist on mount, panel glow styling, empty state "No tickers"
- app-shell.tsx: WatchlistPanel import and render, selectedTicker state, setInterval 5s portfolio refresh with clearInterval cleanup, em dash U+2014 in chart text, TradeBar receives selectedTicker
- app-shell.tsx: Watchlist placeholder removed, PlaceholderPanel still imported for remaining panels
- trade-bar.tsx: TradeBarProps interface with selectedTicker, value binding, readOnly (not disabled) on ticker input
- TypeScript compiles with zero errors

## Self-Check: PASSED
