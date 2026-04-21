---
phase: 02-watchlist-header
plan: 01
subsystem: frontend
tags: [watchlist, sparkline, css-animation, zustand]
dependency_graph:
  requires: []
  provides: [watchlist-store-crud, flash-css, sparkline-component]
  affects: [02-02-PLAN]
tech_stack:
  added: []
  patterns: [zustand-async-actions, optimistic-ui-with-rollback, svg-sparkline]
key_files:
  created:
    - frontend/src/components/sparkline.tsx
  modified:
    - frontend/src/stores/watchlist-store.ts
    - frontend/src/app/globals.css
decisions:
  - "Used alternating -a/-b CSS class variants to force animation replay on consecutive same-direction price changes"
  - "Used useId() for unique SVG gradient IDs to support multiple sparklines rendered simultaneously"
metrics:
  duration: 3m
  completed: "2026-04-21T11:35:00Z"
---

# Phase 02 Plan 01: Watchlist Store, Flash CSS, and Sparkline Summary

Watchlist Zustand store extended with addTicker/removeTicker async actions (POST/DELETE with optimistic removal and rollback), flash animation CSS keyframes for green/red 500ms price change highlights, and SVG sparkline component with gradient fill using useId for unique gradient references.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend watchlist store with add/remove actions and error state | 4c4d4d6 | frontend/src/stores/watchlist-store.ts |
| 2 | Add flash animation CSS keyframes and sparkline component | 9502de6 | frontend/src/app/globals.css, frontend/src/components/sparkline.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- addTicker, removeTicker, error, clearError all present in watchlist-store.ts
- set+get pattern used in store creator for optimistic rollback
- flashUpBg/flashDownBg keyframes with 500ms ease-out in globals.css
- .flash-up/.flash-down classes with -a/-b alternating variants for animation replay
- All existing theme tokens and @import preserved in globals.css
- sparkline.tsx exports default Sparkline component with useId, linearGradient, polyline, polygon
- Empty SVG rendered when points.length < 2
- TypeScript compiles with zero errors

## Self-Check: PASSED

All files exist, all commits verified.
