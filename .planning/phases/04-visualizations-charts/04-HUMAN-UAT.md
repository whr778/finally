---
status: partial
phase: 04-visualizations-charts
source: [04-VERIFICATION.md]
started: 2026-04-22T00:00:00Z
updated: 2026-04-22T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Treemap tiles render with correct colors and proportional sizing
expected: Heatmap treemap shows positions sized by portfolio weight, colored green (profit), red (loss), or gray (flat), with ticker and P&L% labels visible on larger tiles
result: [pending]

### 2. Clicking a treemap tile updates the main chart and trade bar
expected: Clicking a tile in the portfolio heatmap sets the selected ticker, updating the main chart header and trade bar ticker field
result: [pending]

### 3. P&L chart renders area chart with gradient after snapshot data accumulates
expected: P&L panel shows a blue (#209dd7) area chart with gradient fill once portfolio_snapshots data exists from /api/portfolio/history
result: [pending]

### 4. Ticker chart mounts Lightweight Charts canvas and streams data from SSE
expected: Selecting a ticker renders a Lightweight Charts canvas area chart that accumulates price points from the SSE stream in real-time
result: [pending]

### 5. Switching tickers cleanly resets the chart with no stale data
expected: When switching from one ticker to another, the chart clears old data points and begins accumulating fresh data for the new ticker
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
