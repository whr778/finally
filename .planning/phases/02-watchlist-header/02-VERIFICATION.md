---
phase: 02-watchlist-header
verified: 2026-04-21T12:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Flash animations play on price update"
    expected: "Each WatchlistRow briefly flashes green (uptick) or red (downtick) background over ~500ms as SSE prices stream in"
    why_human: "CSS animation behavior and timing require visual inspection in a live browser; cannot be verified by static code analysis"
  - test: "Sparkline mini-charts appear and grow during streaming"
    expected: "A small SVG blue sparkline appears beside each ticker and accumulates new data points as prices arrive from SSE"
    why_human: "SVG rendering with live accumulated data requires visual inspection; static code confirms wiring but not runtime rendering"
  - test: "Add ticker input works end-to-end"
    expected: "Type a valid ticker (e.g. PYPL) in the input, press Enter or click +, ticker appears in list with prices streaming; type a duplicate and error message appears"
    why_human: "Requires live backend connection to validate POST /api/watchlist flow and error display"
  - test: "Remove ticker X button works on hover"
    expected: "Hovering a watchlist row reveals the X button; clicking it removes the row immediately from the list (optimistic removal)"
    why_human: "Hover CSS visibility behavior (opacity-0/group-hover:opacity-100) and optimistic removal require interactive browser testing"
  - test: "Clicking a watchlist row sets chart area and trade bar"
    expected: "Clicking e.g. GOOGL shows 'GOOGL — price chart' (with em dash) in chart area; trade bar ticker input shows 'GOOGL'"
    why_human: "State propagation and rendered text content require browser interaction to confirm"
  - test: "Header total value and cash balance refresh every 5 seconds"
    expected: "Header shows portfolio value and cash balance that update at 5-second intervals (visible change if trades are executed or market moves affect simulated portfolio)"
    why_human: "Timing behavior and live value updates require runtime observation"
---

# Phase 02: Watchlist & Header Verification Report

**Phase Goal:** Build live-updating watchlist panel with price flash animations, sparkline charts, add/remove ticker CRUD, and wire into application shell with selected ticker state and periodic portfolio refresh.
**Verified:** 2026-04-21T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Watchlist store has addTicker and removeTicker async actions that call backend API | VERIFIED | `addTicker` does POST `/api/watchlist` with optimistic update; `removeTicker` does DELETE `/api/watchlist/${ticker}` with rollback on failure. `error` and `clearError` present. |
| 2 | Flash animation CSS keyframes exist for green uptick and red downtick with 500ms duration | VERIFIED | `@keyframes flashUpBg` and `@keyframes flashDownBg` in `globals.css` with `500ms ease-out forwards`. `.flash-up`, `.flash-down` and `-a`/`-b` alternating variants all defined. |
| 3 | SVG sparkline component renders a polyline with gradient fill from an array of price points | VERIFIED | `sparkline.tsx` exports `Sparkline` using `useId()` for gradient ID, `<linearGradient>`, `<polygon>` for area fill, `<polyline>` for line. Returns empty `<svg>` when `points.length < 2`. |
| 4 | User sees watchlist rows with ticker symbol, price, change %, and sparkline for all watched tickers | VERIFIED | `WatchlistRow` renders ticker symbol, `priceData.price.toFixed(2)`, computed `changePercent`, and `<Sparkline points={pointsRef.current} />`. Panel maps over `tickers` from store. |
| 5 | Prices flash green on uptick and red on downtick with ~500ms fade | VERIFIED (code) | `WatchlistRow` `useEffect` on `priceData?.price` sets `flashClass` to `flash-up`/`flash-down` with alternating `-a`/`-b` variants. CSS classes define 500ms fade. Visual confirmation required. |
| 6 | SVG sparkline mini-charts appear beside each ticker, growing as prices stream | VERIFIED (code) | `pointsRef.current` accumulates prices on each SSE update; downsamples at 60 points. `renderKey` increments to force re-render. `Sparkline` receives accumulated points. Visual confirmation required. |
| 7 | User can add a ticker via inline text input and + button | VERIFIED | `TickerInput` has `data-testid="ticker-input"`, `data-testid="add-btn"`, Enter key handler, calls `addTicker` from store which POSTs to `/api/watchlist`. Error displayed via `data-testid="add-error"`. |
| 8 | User can remove a ticker via hover X button with no confirmation | VERIFIED | `WatchlistRow` has `data-testid="remove-${ticker}"` button with `e.stopPropagation()`, calls `onRemove(ticker)` which maps to `removeTicker` in store — optimistic removal with rollback. |
| 9 | Clicking a watchlist row shows ticker name in chart placeholder and populates trade bar ticker input | VERIFIED | `onSelect(ticker)` in `WatchlistRow` → `onSelectTicker` prop → `setSelectedTicker` in `AppShell`. Chart shows `${selectedTicker} \u2014 price chart`. `TradeBar` receives `selectedTicker` as prop, bound to `value` with `readOnly`. |
| 10 | Header total value and cash balance update every 5 seconds | VERIFIED | `AppShell` `useEffect` calls `fetchPortfolio()` then `setInterval(fetchPortfolio, 5000)` with `clearInterval` cleanup. `Header` reads `totalValue` and `cashBalance` from `portfolioStore`. |

**Score:** 10/10 truths verified (automated code analysis)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/stores/watchlist-store.ts` | Watchlist store with addTicker, removeTicker, error, clearError | VERIFIED | All four members present; `(set, get)` pattern for optimistic rollback; POSTs/DELETEs to `/api/watchlist` |
| `frontend/src/app/globals.css` | Flash animation keyframes and classes | VERIFIED | `flashUpBg`, `flashDownBg` keyframes; `.flash-up`, `.flash-up-a`, `.flash-up-b`, `.flash-down`, `.flash-down-a`, `.flash-down-b`; existing theme tokens preserved |
| `frontend/src/components/sparkline.tsx` | SVG sparkline component with gradient fill | VERIFIED | Exports default `Sparkline`; uses `useId()`; `linearGradient`, `polygon`, `polyline`; empty SVG for < 2 points |
| `frontend/src/components/watchlist-row.tsx` | Single ticker row with price, flash, sparkline, remove button | VERIFIED | Per-ticker selector, flash toggle logic, sparkline accumulation via refs, correct `data-testid` attributes, `e.stopPropagation()` on remove |
| `frontend/src/components/ticker-input.tsx` | Add-ticker input with + button and error display | VERIFIED | All `data-testid` attrs, Enter key handler, `addTicker` from store, error display |
| `frontend/src/components/watchlist-panel.tsx` | Container panel with heading, input bar, and scrollable row list | VERIFIED | Fetches watchlist on mount, renders `TickerInput` + mapped `WatchlistRow`s, empty state text, panel glow styling |
| `frontend/src/components/app-shell.tsx` | Layout shell with WatchlistPanel replacing placeholder, selectedTicker state, periodic portfolio re-fetch | VERIFIED | `WatchlistPanel` renders in grid; `selectedTicker` state wired to chart text and TradeBar; `setInterval(fetchPortfolio, 5000)` with cleanup; Watchlist `PlaceholderPanel` removed |
| `frontend/src/components/trade-bar.tsx` | Trade bar accepting selectedTicker prop | VERIFIED | `TradeBarProps` interface with `selectedTicker: string | null`; input `value={selectedTicker || ''}` with `readOnly`; not `disabled` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `watchlist-store.ts` | `/api/watchlist` | `fetch` POST and DELETE | WIRED | `fetch('/api/watchlist', { method: 'POST', ... })` and `fetch(\`/api/watchlist/${ticker}\`, { method: 'DELETE' })` both present with response handling |
| `sparkline.tsx` | SVG polyline | coordinate mapping from price array | WIRED | `coords` mapped from `points` array; `polylinePoints` assigned to `<polyline points=...>` |
| `watchlist-row.tsx` | `price-store.ts` | `useTickerPrice(ticker)` per-ticker selector | WIRED | `const priceData = useTickerPrice(ticker)` at top of component; used in `useEffect`, render, and change % calculation |
| `watchlist-row.tsx` | `sparkline.tsx` | `import Sparkline`, passing accumulated points | WIRED | `import Sparkline from '@/components/sparkline'`; `<Sparkline points={pointsRef.current} key={renderKey} />` |
| `ticker-input.tsx` | `watchlist-store.ts` | `addTicker` action | WIRED | `const addTicker = useWatchlistStore((s) => s.addTicker)`; called in `handleAdd` |
| `watchlist-panel.tsx` | `watchlist-store.ts` | `tickers`, `removeTicker`, `fetchWatchlist` | WIRED | All three selectors extracted; `fetchWatchlist()` called in `useEffect`; `removeTicker` passed as `onRemove` to rows |
| `app-shell.tsx` | `watchlist-panel.tsx` | import and render in grid | WIRED | `import WatchlistPanel from '@/components/watchlist-panel'`; `<WatchlistPanel onSelectTicker={setSelectedTicker} />` |
| `app-shell.tsx` | `portfolio-store.ts` | `setInterval(fetchPortfolio, 5000)` | WIRED | `setInterval(fetchPortfolio, 5000)` in `useEffect`; `clearInterval` in cleanup |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `watchlist-row.tsx` | `priceData` | `useTickerPrice(ticker)` → `usePriceStore.prices[ticker]` → `updatePrices()` called from `use-sse.ts` on `EventSource` message | Yes — SSE streams live prices from backend; `onmessage` parses and dispatches to store | FLOWING |
| `watchlist-panel.tsx` | `tickers` | `useWatchlistStore.tickers` → `fetchWatchlist()` → `GET /api/watchlist` | Yes — fetches from backend on mount; backend returns seeded watchlist entries | FLOWING |
| `header.tsx` | `totalValue`, `cashBalance` | `usePortfolioStore` → `fetchPortfolio()` → `GET /api/portfolio` | Yes — real fetch from backend; `AppShell` calls every 5 seconds | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires running server (SSE streaming, backend API). Static code analysis confirms all wiring. Visual/runtime verification delegated to human verification section.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| RTD-02 | 02-01, 02-02 | Green/red flash animation on price change, ~500ms fade | SATISFIED | `flashUpBg`/`flashDownBg` keyframes in `globals.css`; `WatchlistRow` applies `flash-up`/`flash-down` classes on each SSE price update |
| RTD-04 | 02-01, 02-02 | SVG sparkline mini-charts beside each ticker, accumulated from SSE | SATISFIED | `Sparkline` component; `pointsRef.current` accumulates from SSE in `WatchlistRow`; downsampled at 60 points |
| WATCH-01 | 02-02 | Watchlist grid with ticker symbol, current price, change % since stream start | SATISFIED | `WatchlistRow` renders ticker, `priceData.price.toFixed(2)`, computed `changePercent` based on `initialPriceRef` baseline |
| WATCH-02 | 02-01, 02-02 | User can add a ticker to the watchlist | SATISFIED | `TickerInput` → `addTicker` store action → POST `/api/watchlist`; error shown on failure |
| WATCH-03 | 02-01, 02-02 | User can remove a ticker from the watchlist | SATISFIED | Hover-X button → `removeTicker` store action → DELETE `/api/watchlist/${ticker}` with optimistic removal |
| WATCH-04 | 02-02 | User can click a ticker to select it for the main chart | SATISFIED | `WatchlistRow` click → `onSelect(ticker)` → `setSelectedTicker` in `AppShell` → chart area shows `${ticker} — price chart`; `TradeBar` shows ticker |
| PORT-02 | 02-02 | Total portfolio value in header, updating live | SATISFIED | `Header` reads `totalValue` from `portfolioStore`; `AppShell` polls `fetchPortfolio` every 5 seconds |
| PORT-03 | 02-02 | Cash balance in header | SATISFIED | `Header` reads `cashBalance` from `portfolioStore`; same 5-second polling |

All 8 requirement IDs from both plan frontmatter declarations are accounted for and satisfied at the code level.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `ticker-input.tsx` line 30 | `placeholder="Enter ticker..."` | Info | HTML input placeholder attribute — not a stub; this is correct UX for the input field |
| `trade-bar.tsx` lines 20, 28 | `placeholder="Ticker"`, `placeholder="Qty"` | Info | HTML input placeholder attributes — correct UX; qty and buy/sell remain disabled until Phase 3 by design |
| `app-shell.tsx` line 7 | `import PlaceholderPanel` | Info | PlaceholderPanel still used for Chart (Phase 4), Positions (Phase 3), Portfolio Map (Phase 4), P&L (Phase 4) — correct, not a residual stub |

No blockers or warnings found. All `return null`, empty array, or `disabled` patterns in the phase 2 files are intentional (disabled trade inputs awaiting Phase 3, empty SVG for < 2 sparkline points, initial empty state in stores).

### Human Verification Required

#### 1. Flash Animations

**Test:** Start the backend and frontend dev server, open `http://localhost:3000`. Watch the watchlist for 2-3 seconds.
**Expected:** Each row background briefly flashes green when price goes up, red when price goes down. Flash fades over ~500ms. Consecutive same-direction updates each trigger a fresh animation (no animation freeze).
**Why human:** CSS animation replay behavior (the `-a`/`-b` alternating class trick) requires visual inspection in a live browser.

#### 2. Sparkline Mini-Charts

**Test:** Let the page run for 10+ seconds, observing the watchlist panel.
**Expected:** A small blue SVG sparkline chart appears to the right of the change % for each ticker. The chart grows/updates as new prices arrive. The line shows price trajectory with a subtle blue gradient fill beneath it.
**Why human:** SVG rendering and live data accumulation can only be confirmed visually at runtime.

#### 3. Add Ticker Flow

**Test:** Type "PYPL" in the watchlist input field, press Enter (or click +). Then try adding "AAPL" (duplicate).
**Expected:** PYPL appears in the watchlist and starts receiving prices. The input clears. Adding AAPL shows a red error message below the input ("Ticker already in watchlist" or similar from the backend).
**Why human:** Requires live backend connection and visual confirmation of error display.

#### 4. Remove Ticker

**Test:** Hover over a watchlist row (e.g. AAPL). Click the X button that appears on hover.
**Expected:** The row disappears immediately from the list (optimistic removal). If removal fails, the row reappears.
**Why human:** Hover CSS visibility and the optimistic removal pattern require interactive browser testing.

#### 5. Click-to-Select Ticker

**Test:** Click on the "GOOGL" watchlist row.
**Expected:** The Chart area panel shows "GOOGL — price chart" (with em dash, not double hyphen). The trade bar ticker input field shows "GOOGL".
**Why human:** State propagation and exact rendered text (including em dash character) need visual confirmation.

#### 6. Header Live Values

**Test:** Observe the header for 10-15 seconds after page load.
**Expected:** Total portfolio value and cash balance are displayed in the header. Values shown as USD currency (e.g. $10,000.00). They refresh every 5 seconds from the backend.
**Why human:** Timing of interval updates and live value display require runtime observation.

### Gaps Summary

No gaps found. All must-have truths are satisfied at the code level: artifacts exist, are substantive (non-stub), and are correctly wired with data flowing through from live sources (SSE stream and REST endpoints). TypeScript compiles with zero errors.

The `human_needed` status reflects that 6 runtime behaviors (flash animations, sparkline rendering, CRUD flows, ticker selection, header refresh) cannot be verified by static code analysis alone.

---

_Verified: 2026-04-21T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
