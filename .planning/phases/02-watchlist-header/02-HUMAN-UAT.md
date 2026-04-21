---
status: partial
phase: 02-watchlist-header
source: [02-VERIFICATION.md]
started: 2026-04-21T12:00:00Z
updated: 2026-04-21T12:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Flash animations
expected: Green/red background fades over ~500ms on price changes, including consecutive same-direction replay
result: [pending]

### 2. Sparkline rendering
expected: Blue SVG sparkline charts appear beside each ticker and grow as SSE prices stream
result: [pending]

### 3. Add ticker
expected: Typing "PYPL" and submitting adds it to watchlist; submitting duplicate "AAPL" shows error message
result: [pending]

### 4. Remove ticker
expected: Hover X button visible on row, clicking removes the ticker immediately
result: [pending]

### 5. Click-to-select
expected: Clicking GOOGL shows "GOOGL — price chart" in chart area and "GOOGL" in trade bar ticker field
result: [pending]

### 6. Header refresh
expected: Portfolio total value and cash balance displayed in header, updating every 5 seconds
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
