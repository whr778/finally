# Phase 2: Watchlist & Header - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the live-updating watchlist with price flash animations, SVG sparkline mini-charts, add/remove ticker functionality, and wire the header to display live portfolio values. Replaces the watchlist and header placeholder panels from Phase 1 with functional components.

</domain>

<decisions>
## Implementation Decisions

### Price flash animations
- **D-01:** Background flash on price changes — brief green (uptick) or red (downtick) background highlight on the price cell that fades over ~500ms via CSS transition. The entire price area briefly glows, then returns to normal. Bloomberg terminal style.

### Sparkline style
- **D-02:** SVG polyline sparkline with gradient fill — blue primary (#209dd7) line with a subtle gradient fill below (blue to transparent). Accumulated from SSE data since page load. ~60px wide, ~24px tall.

### Watchlist add/remove UX
- **D-03:** Inline text input at top of watchlist panel with a + button. Always visible. Type ticker symbol, hit Enter or click +. Invalid tickers show inline error text.
- **D-04:** Small X button appears on hover on the right side of each watchlist row. Click to remove instantly — no confirmation dialog.

### Watchlist row density
- **D-05:** Compact single-line rows: ticker symbol (monospace), current price (monospace), change % since stream start (colored green/red, monospace), sparkline. Dense and scannable.

### Claude's Discretion
- Sparkline data point accumulation strategy (max points, downsampling)
- Exact flash animation CSS (opacity values, timing function)
- Watchlist empty state when all tickers removed
- Error handling for failed add/remove API calls
- Whether clicking a watchlist row selects it for the main chart (Phase 4 wiring)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project specification
- `planning/PLAN.md` — Full project spec including watchlist description, sparkline behavior, flash animations, price display format
- `planning/MARKET_DATA_SUMMARY.md` — Market data component summary

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — v1 requirements (RTD-02, RTD-04, WATCH-01 through WATCH-04, PORT-02, PORT-03 are Phase 2)
- `.planning/ROADMAP.md` — Phase 2 success criteria and dependency chain

### E2E test contracts
- `test/specs/startup.spec.ts` — Requires `watchlist-row-AAPL`, `watchlist-row-GOOGL`, `watchlist-row-MSFT`, `watchlist-row-TSLA`, `total-value`, `cash-balance`
- `test/specs/watchlist.spec.ts` — Watchlist add/remove test scenarios
- `test/specs/sse-resilience.spec.ts` — Price updates over time, sparkline SVG appears

### Phase 1 context (prior decisions)
- `.planning/phases/01-foundation-data-pipeline/01-CONTEXT.md` — Theme, layout, font decisions carried forward

### Backend API contracts
- `backend/app/routes/watchlist.py` — GET/POST/DELETE watchlist endpoints
- `backend/app/routes/portfolio.py` — GET portfolio endpoint (cash_balance, total_value)
- `backend/app/models.py` — Pydantic response models

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/stores/price-store.ts` — Zustand price store with per-ticker selectors (`useTickerPrice(ticker)`) and connection status. Already receives SSE data at ~500ms.
- `frontend/src/stores/watchlist-store.ts` — Watchlist store with `fetchWatchlist()` — needs add/remove actions added.
- `frontend/src/stores/portfolio-store.ts` — Portfolio store with `fetchPortfolio()` — already wired to header.
- `frontend/src/hooks/use-sse.ts` — SSE hook already connected and updating price store.
- `frontend/src/types/market.ts` — TypeScript types: `PriceData` (with direction field), `WatchlistEntryData`, `PortfolioData`.
- `frontend/src/components/placeholder-panel.tsx` — To be replaced with actual watchlist component.
- `frontend/src/components/header.tsx` — Already shows portfolio total and cash — may need live-update wiring.
- `frontend/src/components/app-shell.tsx` — CSS Grid layout with watchlist panel area.

### Established Patterns
- Per-ticker Zustand selectors prevent full re-renders on 2Hz SSE updates
- Components use `'use client'` directive (static export, no server components)
- Dark theme tokens in `globals.css` via Tailwind v4 `@theme`
- Monospace (JetBrains Mono) for data values, Inter for labels

### Integration Points
- Watchlist component replaces `PlaceholderPanel` in the "Watchlist" slot of AppShell
- Header component already mounted — needs live-updating values from portfolio store
- SSE hook already running in AppShell — price data flows to price store automatically
- Watchlist API: `GET /api/watchlist`, `POST /api/watchlist` (body: `{ticker}`), `DELETE /api/watchlist/{ticker}`

</code_context>

<specifics>
## Specific Ideas

- Price flash should feel like Bloomberg terminal — background glow, not just text color change
- Sparklines should have a gradient fill (line + area), not just a bare line
- Watchlist should feel data-dense and scannable — compact single-line rows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-watchlist-header*
*Context gathered: 2026-04-21*
