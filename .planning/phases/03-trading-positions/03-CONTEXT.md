# Phase 3: Trading & Positions - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable trade execution (buy/sell market orders) through the trade bar, display a positions table with live P&L, and wire immediate post-trade updates. Replaces the Positions placeholder panel with a functional positions table and activates the trade bar inputs and buttons.

</domain>

<decisions>
## Implementation Decisions

### Trade feedback UX
- **D-01:** Inline status bar below the trade bar. Green text for success showing "BUY 2 AAPL @ $191.50" format, red text for errors. Auto-dismisses after ~3 seconds via CSS transition or setTimeout.
- **D-02:** Uses `data-testid="trade-success"` and `data-testid="trade-error"` elements per E2E test contracts. Success text must contain the ticker symbol and side (BUY/SELL).

### Positions table styling
- **D-03:** Full 6-column table: Ticker, Qty, Avg Cost, Current Price, Unrealized P&L, % Change. All values in monospace font. P&L and % colored green (positive) or red (negative).
- **D-04:** Table replaces the "Positions" PlaceholderPanel in AppShell. Same panel glow styling as other panels. Each row has `data-testid="position-row-{TICKER}"` per E2E contract.

### Trade bar behavior
- **D-05:** After successful trade: keep ticker field value, clear quantity field, show success inline below. After failed trade: keep both fields, show error inline.
- **D-06:** Ticker input becomes editable (not readOnly). E2E tests use `.fill()` to type directly into it. Watchlist click still populates it, but user can also type manually.
- **D-07:** Quantity input and buy/sell buttons become enabled (remove `disabled` attribute). Quantity input accepts decimal values for fractional shares.

### Post-trade state refresh
- **D-08:** Immediately call `fetchPortfolio()` after the trade API responds successfully. Cash balance, positions, and header values update instantly. The existing 5-second setInterval poll continues as a safety net.

### Claude's Discretion
- Positions table empty state (before any trades)
- Exact validation error messages (empty ticker, zero/negative qty, insufficient cash/shares)
- Whether to add a trade execution loading state on the buy/sell buttons
- Positions table sort order (by ticker alphabetical, by P&L, or by insertion order)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project specification
- `planning/PLAN.md` — Full project spec including trade execution rules, positions table columns, portfolio management behavior
- `planning/MARKET_DATA_SUMMARY.md` — Market data component summary

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — v1 requirements (TRADE-01 through TRADE-05, PORT-01 are Phase 3)
- `.planning/ROADMAP.md` — Phase 3 success criteria and dependency chain

### E2E test contracts
- `test/specs/trading.spec.ts` — Trade buy/sell scenarios, success/error elements, position row visibility
- `test/specs/startup.spec.ts` — Trade bar input visibility checks

### Backend API contracts
- `backend/app/routes/portfolio.py` — GET /api/portfolio (positions, cash), POST /api/portfolio/trade (execute trade)
- `backend/app/models.py` — Pydantic response models (TradeRequest, TradeResponse, PortfolioData)

### Phase 2 context (prior decisions)
- `.planning/phases/02-watchlist-header/02-CONTEXT.md` — Panel styling, data-dense layout, monospace values

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/trade-bar.tsx` — Existing trade bar with ticker/qty inputs, buy/sell buttons. Currently disabled — needs activation.
- `frontend/src/stores/portfolio-store.ts` — Zustand store with `fetchPortfolio()`, `cashBalance`, `totalValue`, `positions` (PositionData[]).
- `frontend/src/types/market.ts` — `PositionData` type with ticker, quantity, avg_cost, current_price, unrealized_pnl, pct_change. `PortfolioData` type.
- `frontend/src/components/app-shell.tsx` — Grid layout with Positions PlaceholderPanel to replace. Already has `selectedTicker` state and 5s portfolio poll.

### Established Patterns
- Per-ticker Zustand selectors prevent full re-renders
- `'use client'` directive on all components (static export)
- Panel glow styling: `border: '1px solid rgba(125,133,144,0.2)'`, `boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)'`
- Monospace (JetBrains Mono) for data values, Inter for labels
- Async store actions follow pattern from watchlist-store (set error, call API, update state)

### Integration Points
- Trade bar already receives `selectedTicker` prop from AppShell
- Portfolio store already fetched on mount + 5s interval — trade needs to trigger immediate re-fetch
- Positions table replaces `PlaceholderPanel title="Positions"` in AppShell grid
- Backend trade endpoint: `POST /api/portfolio/trade` body `{ticker, quantity, side}`

</code_context>

<specifics>
## Specific Ideas

- Trade feedback should feel instant — inline status bar fits the terminal aesthetic better than floating toasts
- Positions table should mirror the dense, scannable style of the watchlist — compact rows, monospace values, colored P&L
- The trade bar already exists as a skeleton — this phase activates it rather than building from scratch

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-trading-positions*
*Context gathered: 2026-04-21*
