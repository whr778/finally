# Phase 3: Trading & Positions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-trading-positions
**Areas discussed:** Trade feedback UX, Positions table styling, Trade bar behavior, Post-trade state refresh

---

## Trade Feedback UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline status bar | Green/red text line below trade bar, auto-dismiss ~3s. Shows "BUY 2 AAPL @ $191.50" | ✓ |
| Toast notification | Floating toast in corner, stacks and auto-dismisses | |
| Persistent status row | Stays until next trade or manual dismiss | |

**User's choice:** Inline status bar
**Notes:** Fits the dense terminal aesthetic. E2E tests expect trade-success/trade-error data-testid elements.

---

## Positions Table Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Full table | All 6 columns (Ticker, Qty, Avg, Price, P&L, %), monospace, green/red P&L | ✓ |
| Condensed cards | Each position as a compact card | |
| Minimal list | Just ticker, qty, and P&L | |

**User's choice:** Full table
**Notes:** Data-dense and terminal-appropriate. All fields from PositionData type displayed.

---

## Trade Bar Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep ticker, clear qty | Keep ticker for repeat trades, clear qty, show success inline | ✓ |
| Clear everything | Reset both fields after trade | |
| Keep both | Keep ticker and quantity after trade | |

**User's choice:** Keep ticker, clear qty
**Notes:** Ticker becomes editable (E2E tests use .fill()). Watchlist click still populates it.

---

## Post-Trade State Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate re-fetch | Call fetchPortfolio() right after trade API responds | ✓ |
| Optimistic update | Update locally before API responds, roll back on failure | |
| Rely on 5s poll | Wait for next interval tick | |

**User's choice:** Immediate re-fetch
**Notes:** 5s poll continues as safety net. Cash and positions update instantly after trade.

---

## Claude's Discretion

- Positions table empty state
- Exact validation error messages
- Trade button loading state
- Positions sort order
