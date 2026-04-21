# Phase 4: Visualizations & Charts - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the portfolio heatmap treemap, P&L line chart, and main ticker chart using Lightweight Charts. Replaces the "Portfolio Map" and "P&L" placeholder panels and upgrades the chart placeholder div to a full Lightweight Charts integration. All three visualizations consume existing data from the price store and portfolio API.

</domain>

<decisions>
## Implementation Decisions

### Heatmap treemap design
- **D-01:** Green/red P&L gradient coloring. Tiles on a continuous scale: deep green for biggest gains, deep red for biggest losses, neutral gray near zero. Classic Bloomberg heatmap style.
- **D-02:** Tile content shows ticker symbol prominently with P&L percentage below. Minimal and scannable.
- **D-03:** Tiles sized by portfolio weight (position value / total portfolio value).
- **D-04:** Empty state shows muted text: "No positions -- buy shares to see your portfolio map".
- **D-05:** E2E test requires `data-testid="tile-{TICKER}"` on each treemap tile (per trading.spec.ts).
- **D-06:** Uses Recharts Treemap component (decided in prior phases, noted in STATE.md).

### P&L chart design
- **D-07:** Area chart with gradient fill (blue #209dd7 line with semi-transparent gradient fill below, fading to transparent). Matches sparkline gradient style from Phase 2.
- **D-08:** Single color (blue primary #209dd7) regardless of gain/loss. No color switching at breakeven.
- **D-09:** Data from `GET /api/portfolio/history` returning `{total_value, recorded_at}` snapshots.
- **D-10:** Empty state shows muted text: "Portfolio value chart will appear as data accumulates".
- **D-11:** Uses Recharts AreaChart component (decided in prior phases).

### Main ticker chart
- **D-12:** Area chart style with line + gradient fill using Lightweight Charts. Consistent visual language with P&L chart and sparklines.
- **D-13:** Data source is SSE price history accumulated since page load (same data pipeline as sparklines, but displayed larger). No new backend API needed.
- **D-14:** When no ticker is selected, shows muted centered text: "Click a ticker to view its chart". Current behavior refined visually.
- **D-15:** Uses Lightweight Charts library (canvas-based, decided in prior phases via STATE.md).

### Cross-panel interaction
- **D-16:** Clicking a treemap tile sets selectedTicker -- updates main chart and populates trade bar. Consistent with existing watchlist click behavior.
- **D-17:** P&L chart polls `GET /api/portfolio/history` every 30-60 seconds to pick up new snapshots, matching backend's 30s recording interval.

### Claude's Discretion
- Recharts Treemap customContent prop implementation details (flagged in STATE.md for investigation)
- Lightweight Charts configuration (crosshair, tooltip, time axis formatting)
- Exact green/red color values for treemap gradient scale
- P&L chart time axis formatting (timestamps, tick intervals)
- Chart resize behavior on window resize
- Treemap tile minimum size threshold (when to hide very small positions)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project specification
- `planning/PLAN.md` -- Full project spec including portfolio heatmap description, P&L chart behavior, main chart area, charting library decisions
- `planning/MARKET_DATA_SUMMARY.md` -- Market data component summary

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` -- v1 requirements (PORT-04, PORT-05, UI-04 are Phase 4)
- `.planning/ROADMAP.md` -- Phase 4 success criteria and dependency chain

### E2E test contracts
- `test/specs/trading.spec.ts` -- Requires `data-testid="tile-AAPL"` for heatmap tiles after buying
- `test/specs/watchlist.spec.ts` -- Clicking ticker shows price chart (tests chart panel text)

### Backend API contracts
- `backend/app/routes/portfolio.py` -- GET /api/portfolio (positions with P&L), GET /api/portfolio/history (snapshots)
- `backend/app/models.py` -- SnapshotOut (total_value, recorded_at), PositionData (ticker, quantity, avg_cost, current_price, unrealized_pnl, pct_change)

### Prior phase context
- `.planning/phases/01-foundation-data-pipeline/01-CONTEXT.md` -- Theme, layout, font, panel glow styling
- `.planning/phases/02-watchlist-header/02-CONTEXT.md` -- Sparkline gradient style, dense/scannable design
- `.planning/phases/03-trading-positions/03-CONTEXT.md` -- Panel styling, positions table, trade bar selectedTicker

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/placeholder-panel.tsx` -- PlaceholderPanel component to be replaced by treemap and P&L chart
- `frontend/src/components/app-shell.tsx` -- Grid layout with "Portfolio Map" and "P&L" placeholder slots, plus chart div with selectedTicker state
- `frontend/src/stores/portfolio-store.ts` -- Zustand store with `positions: PositionData[]`, `fetchPortfolio()`, `cashBalance`, `totalValue`
- `frontend/src/stores/price-store.ts` -- Price data per ticker from SSE, `useTickerPrice(ticker)` selector
- `frontend/src/components/sparkline.tsx` -- SVG sparkline with gradient fill pattern (visual reference for chart styling)
- `frontend/src/types/market.ts` -- `PositionData` type with unrealized_pnl, pct_change fields; `PriceData` with price, timestamp

### Established Patterns
- Panel glow styling: `border: '1px solid rgba(125,133,144,0.2)'`, `boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)'`
- Per-ticker Zustand selectors prevent full re-renders on 2Hz SSE updates
- `'use client'` directive on all components (static export)
- Monospace (JetBrains Mono) for data values, Inter for labels
- Dark theme tokens in globals.css via Tailwind v4 `@theme`

### Integration Points
- Treemap component replaces `PlaceholderPanel title="Portfolio Map"` in AppShell grid
- P&L chart component replaces `PlaceholderPanel title="P&L"` in AppShell grid
- Main chart replaces the placeholder div in AppShell (currently shows selectedTicker text)
- Treemap tile click calls `setSelectedTicker` (same callback as watchlist row click)
- P&L chart needs new fetch function for GET /api/portfolio/history
- No charting libraries installed yet -- need to add `lightweight-charts` and `recharts` to package.json

</code_context>

<specifics>
## Specific Ideas

- Treemap should feel like a Bloomberg-style heatmap -- green/red gradient is instantly recognizable to anyone familiar with trading terminals
- All three chart/visualization types use consistent gradient fill styling (blue #209dd7 to transparent) creating visual cohesion across the app
- Area chart style chosen across all visualizations for consistency (sparklines, P&L chart, main chart all share the gradient fill language)

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-visualizations-charts*
*Context gathered: 2026-04-21*
