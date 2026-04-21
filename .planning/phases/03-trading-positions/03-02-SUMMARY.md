---
phase: 03-trading-positions
plan: 02
subsystem: frontend
tags: [positions-table, portfolio, live-pnl, ui-component]
dependency_graph:
  requires: [portfolio-store, market-types]
  provides: [positions-table-component]
  affects: [app-shell]
tech_stack:
  added: []
  patterns: [zustand-selector, panel-glow, data-testid-per-row]
key_files:
  created:
    - frontend/src/components/positions-table.tsx
  modified:
    - frontend/src/components/app-shell.tsx
decisions:
  - Alphabetical sort by ticker for stable, predictable display order
  - Extracted formatPnl and formatPct helpers for clean rendering logic
metrics:
  duration: 2m
  completed: "2026-04-21T17:40:19Z"
---

# Phase 3 Plan 02: Positions Table Summary

PositionsTable component with 6-column live P&L display, wired into AppShell grid replacing the Positions placeholder panel.

## What Was Built

### Task 1: PositionsTable Component (positions-table.tsx)
- New component reading positions from `usePortfolioStore` via Zustand selector
- 6 columns: Ticker (left-aligned), Qty, Avg Cost, Price, P&L, % (all right-aligned)
- P&L and % columns colored green (`text-success`) for positive, red (`text-danger`) for negative, neutral for zero/null
- Panel glow styling matching established watchlist-panel pattern (border + box-shadow)
- Empty state: centered "No positions yet. Execute a trade to get started." in muted text
- Alphabetical sort by ticker symbol
- `data-testid="position-row-{TICKER}"` on each row for E2E test contract
- Monospace font (`font-mono`) for all data values
- Proper value formatting: P&L with +/- sign and dollar prefix, % with sign and suffix, qty with trailing zeros stripped

### Task 2: AppShell Integration (app-shell.tsx)
- Added `import PositionsTable from '@/components/positions-table'`
- Replaced `<PlaceholderPanel title="Positions" phaseNote="Coming in Phase 3" />` with `<PositionsTable />`
- PlaceholderPanel import retained for Portfolio Map and P&L panels (Phase 4)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 7c275ed | feat(03-02): create PositionsTable component with 6-column live P&L display |
| 2 | 7a8594a | feat(03-02): wire PositionsTable into AppShell replacing Positions placeholder |

## Verification Results

- TypeScript compiles with zero errors (`tsc --noEmit --strict`)
- All 10 acceptance criteria pass for Task 1 (use client, usePortfolioStore, position-row-, text-success, text-danger, No positions yet, localeCompare, Avg Cost, font-mono, file exists)
- All 4 acceptance criteria pass for Task 2 (import present, 2+ PositionsTable references, no Phase 3 placeholder, PlaceholderPanel still used)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
