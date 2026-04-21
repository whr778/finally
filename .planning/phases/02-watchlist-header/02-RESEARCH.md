# Phase 2: Watchlist & Header - Research

**Researched:** 2026-04-21
**Domain:** React UI components, CSS animations, SVG sparklines, Zustand state management
**Confidence:** HIGH

## Summary

Phase 2 replaces the watchlist placeholder panel and enhances the header with live-updating portfolio values. The phase requires five distinct capabilities: (1) a watchlist grid displaying tickers with prices and change percentages, (2) price flash animations on each SSE update, (3) SVG sparkline mini-charts accumulated from the SSE stream, (4) add/remove ticker CRUD operations, and (5) live-updating header values. All backend APIs are already built and tested. The frontend already has Zustand stores for prices, watchlist, and portfolio, plus an SSE hook feeding 2Hz price updates. This phase is purely frontend component work.

The main technical challenge is performance: with 10 tickers updating at 2Hz, naive implementations cause 20 re-renders/second across the entire watchlist. The existing per-ticker Zustand selectors (`useTickerPrice(ticker)`) solve this -- each row only re-renders when its own ticker price changes. The sparkline accumulation and flash animation must follow this same per-ticker isolation pattern.

**Primary recommendation:** Build a `WatchlistPanel` containing `WatchlistRow` components, where each row independently subscribes to its ticker's price via `useTickerPrice()`. Store sparkline data points in a `useRef` per row (not in Zustand) to avoid re-renders on accumulation. Use CSS `@keyframes` with alternating class names toggled via `useEffect` for the flash animation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Background flash on price changes -- brief green (uptick) or red (downtick) background highlight on the price cell that fades over ~500ms via CSS transition. Bloomberg terminal style.
- **D-02:** SVG polyline sparkline with gradient fill -- blue primary (#209dd7) line with a subtle gradient fill below (blue to transparent). Accumulated from SSE data since page load. ~60px wide, ~24px tall.
- **D-03:** Inline text input at top of watchlist panel with a + button. Always visible. Type ticker symbol, hit Enter or click +. Invalid tickers show inline error text.
- **D-04:** Small X button appears on hover on the right side of each watchlist row. Click to remove instantly -- no confirmation dialog.
- **D-05:** Compact single-line rows: ticker symbol (monospace), current price (monospace), change % since stream start (colored green/red, monospace), sparkline. Dense and scannable.

### Claude's Discretion
- Sparkline data point accumulation strategy (max points, downsampling)
- Exact flash animation CSS (opacity values, timing function)
- Watchlist empty state when all tickers removed
- Error handling for failed add/remove API calls
- Whether clicking a watchlist row selects it for the main chart (Phase 4 wiring)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTD-02 | User sees green/red flash animation on price change that fades over ~500ms | CSS `@keyframes` with alternating class toggle pattern; `.flash-up` and `.flash-down` classes per E2E contract |
| RTD-04 | User sees SVG sparkline mini-charts beside each ticker accumulated from SSE since page load | Custom SVG `<polyline>` with `<linearGradient>` fill; `useRef` for point accumulation; ~60x24px viewBox |
| WATCH-01 | User sees watchlist grid with ticker symbol, current price, and change % since stream start | `WatchlistRow` component subscribing via `useTickerPrice(ticker)`; monospace font; green/red change coloring |
| WATCH-02 | User can add a ticker to the watchlist | Watchlist store `addTicker()` action calling `POST /api/watchlist`; inline input with `data-testid="ticker-input"` |
| WATCH-03 | User can remove a ticker from the watchlist | Watchlist store `removeTicker()` action calling `DELETE /api/watchlist/{ticker}`; hover X button with `data-testid="remove-{TICKER}"` |
| WATCH-04 | User can click a ticker in the watchlist to select it for the main chart | Click handler on row; store selected ticker in shared state (Zustand or lifted state); Phase 4 wires to chart |
| PORT-02 | User sees total portfolio value in the header (updating live) | Header already displays `totalValue` from portfolio store; needs periodic re-fetch to stay live as prices change |
| PORT-03 | User sees cash balance in the header | Header already displays `cashBalance` from portfolio store; same re-fetch strategy as PORT-02 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Watchlist display | Browser / Client | -- | Pure UI rendering of data already in Zustand stores |
| Price flash animation | Browser / Client | -- | CSS-only, triggered by price data changes in the store |
| SVG sparkline | Browser / Client | -- | Client-side accumulation from SSE stream, SVG rendering |
| Add/remove ticker | Browser / Client | API / Backend | Client sends POST/DELETE to existing backend endpoints |
| Header live values | Browser / Client | API / Backend | Client reads portfolio store, periodically re-fetches from `/api/portfolio` |
| Ticker selection | Browser / Client | -- | Client-side UI state only; no backend involvement |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Project standard [VERIFIED: node_modules] |
| Next.js | 15.5.15 | Static export framework | Project standard [VERIFIED: node_modules] |
| Zustand | 5.0.12 | State management | Project standard, per-ticker selectors [VERIFIED: node_modules] |
| Tailwind CSS | 4.2.2 | Styling | Project standard, CSS-first config [VERIFIED: node_modules] |

### Supporting (no new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native SVG | -- | Sparkline rendering | Custom `<svg>` with `<polyline>` and `<linearGradient>` |
| Native CSS @keyframes | -- | Flash animations | `@keyframes` in globals.css for flash-up/flash-down |
| Native fetch | -- | API calls | Watchlist add/remove, portfolio refresh |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SVG sparkline | react-sparklines | Adds 15KB dependency for a 30-line component; custom is simpler and matches exact design spec |
| CSS @keyframes | Framer Motion | Massively over-engineered for a background color flash; adds 40KB+ |
| Polling portfolio | SSE for portfolio | Backend would need new SSE channel; polling every 5s is sufficient and simpler |

**Installation:** No new packages required. Phase 2 uses only what Phase 1 installed.

## Architecture Patterns

### System Architecture Diagram

```
SSE Stream (/api/stream/prices)
    |
    v
[useSSE hook] --> [usePriceStore] --> prices: Record<string, PriceData>
                        |
                        |--- useTickerPrice("AAPL") --> WatchlistRow(AAPL)
                        |                                  |-- price display
                        |                                  |-- flash animation (.flash-up/.flash-down)
                        |                                  |-- sparkline (useRef accumulates points)
                        |                                  |-- remove button (DELETE /api/watchlist/AAPL)
                        |
                        |--- useTickerPrice("GOOGL") --> WatchlistRow(GOOGL)
                        |--- ... (one subscription per ticker)
                        |
[useWatchlistStore] --> tickers: WatchlistEntryData[]
    |                       |
    |                       v
    |               WatchlistPanel
    |                   |-- ticker input + add button (POST /api/watchlist)
    |                   |-- maps tickers to WatchlistRow components
    |
[usePortfolioStore] --> totalValue, cashBalance
    |                       |
    v                       v
  (periodic            Header
   re-fetch)              |-- total value (data-testid="total-value")
                          |-- cash balance (data-testid="cash-balance")
```

### Recommended Component Structure
```
src/
├── components/
│   ├── watchlist-panel.tsx       # Container: input bar + ticker rows list
│   ├── watchlist-row.tsx         # Single ticker row with price, flash, sparkline
│   ├── sparkline.tsx             # SVG polyline sparkline with gradient
│   ├── ticker-input.tsx          # Add-ticker input + button + error display
│   ├── header.tsx                # (MODIFY) wire live-updating portfolio values
│   └── app-shell.tsx             # (MODIFY) replace placeholder with WatchlistPanel
├── stores/
│   └── watchlist-store.ts        # (MODIFY) add addTicker, removeTicker actions
└── app/
    └── globals.css               # (MODIFY) add flash-up/flash-down keyframes
```

### Pattern 1: Per-Ticker Subscription (Performance-Critical)
**What:** Each `WatchlistRow` subscribes to its own ticker via `useTickerPrice(ticker)`, isolating re-renders.
**When to use:** Any component displaying a single ticker's price data.
**Example:**
```typescript
// Source: existing codebase pattern in price-store.ts
function WatchlistRow({ ticker }: { ticker: string }) {
  const priceData = useTickerPrice(ticker);
  // Only re-renders when THIS ticker's price changes
  // Not when other tickers update
  return (/* ... */);
}
```

### Pattern 2: Flash Animation with Alternating Classes
**What:** Toggle between `flash-up-a`/`flash-up-b` CSS classes to replay the animation on consecutive same-direction updates. Use a ref to track which variant is active.
**When to use:** Whenever a price change needs a visual flash.
**Example:**
```typescript
// In WatchlistRow
const [flashClass, setFlashClass] = useState("");
const flashToggle = useRef(false);

useEffect(() => {
  if (!priceData) return;
  const dir = priceData.direction;
  if (dir === "up") {
    flashToggle.current = !flashToggle.current;
    setFlashClass(flashToggle.current ? "flash-up-a" : "flash-up-b");
  } else if (dir === "down") {
    flashToggle.current = !flashToggle.current;
    setFlashClass(flashToggle.current ? "flash-down-a" : "flash-down-b");
  }
}, [priceData?.price]);
```

```css
/* In globals.css */
@keyframes flashUpBg {
  0% { background-color: rgba(63, 185, 80, 0.3); }
  100% { background-color: transparent; }
}
@keyframes flashDownBg {
  0% { background-color: rgba(248, 81, 73, 0.3); }
  100% { background-color: transparent; }
}
.flash-up-a, .flash-up-b { animation: flashUpBg 500ms ease-out; }
.flash-down-a, .flash-down-b { animation: flashDownBg 500ms ease-out; }
/* E2E tests check for .flash-up class name */
.flash-up { animation: flashUpBg 500ms ease-out; }
.flash-down { animation: flashDownBg 500ms ease-out; }
```

**Important E2E constraint:** The test `watchlist.spec.ts` line 44 checks for `.flash-up` CSS class specifically. The implementation MUST apply a class named exactly `flash-up` (not just `flash-up-a`/`flash-up-b`). Recommendation: apply both -- `flash-up flash-up-a` on uptick, `flash-up flash-up-b` on next uptick. The `flash-up` satisfies the E2E selector; the alternating suffix forces animation replay.

### Pattern 3: Sparkline Data Accumulation via useRef
**What:** Store sparkline data points in a `useRef` array. On each price update, push the new price, downsample if needed, and force a re-render by updating a counter state.
**When to use:** Data that accumulates over time but should not trigger Zustand store updates.
**Example:**
```typescript
const MAX_POINTS = 60;
const pointsRef = useRef<number[]>([]);
const [renderKey, setRenderKey] = useState(0);

useEffect(() => {
  if (!priceData) return;
  pointsRef.current.push(priceData.price);
  if (pointsRef.current.length > MAX_POINTS) {
    // Simple downsample: take every other point
    pointsRef.current = pointsRef.current.filter((_, i) => i % 2 === 0);
  }
  setRenderKey((k) => k + 1); // trigger re-render
}, [priceData?.price]);
```

### Pattern 4: Change Percentage Since Stream Start
**What:** Track the first price received for each ticker (the "stream start" price) and compute change % from that baseline. Store initial prices in a ref.
**When to use:** Displaying "% change since page load" as required by WATCH-01.
**Example:**
```typescript
const initialPriceRef = useRef<number | null>(null);

useEffect(() => {
  if (priceData && initialPriceRef.current === null) {
    initialPriceRef.current = priceData.price;
  }
}, [priceData]);

const changePercent = initialPriceRef.current
  ? ((priceData.price - initialPriceRef.current) / initialPriceRef.current) * 100
  : 0;
```

### Anti-Patterns to Avoid
- **Storing sparkline points in Zustand:** Creates 20 store updates/second (10 tickers x 2Hz), triggering cascade re-renders across all subscribers. Use `useRef` per row instead.
- **Re-rendering entire watchlist on any price change:** Subscribe at the row level via `useTickerPrice(ticker)`, not at the panel level via `usePriceStore`.
- **Using CSS `transition` for flash:** Transitions require the property to change FROM one value TO another. For a flash that appears and fades, `@keyframes` animation is correct.
- **Awaiting remove confirmation:** D-04 says no confirmation dialog. Call DELETE immediately on click, optimistically remove from UI, show error toast only on failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency formatting | Custom string manipulation | `Intl.NumberFormat` | Locale handling, already used in header.tsx |
| SSE connection | Manual EventSource management | Existing `useSSE` hook | Already handles connect/reconnect/disconnect |
| Price store | New state management | Existing `usePriceStore` / `useTickerPrice` | Already wired to SSE, per-ticker selectors |
| Watchlist API calls | Raw fetch with error handling | Zustand store actions | Centralized state + API in one place |

**Key insight:** Phase 1 already built the data pipeline and state management layer. Phase 2 is primarily UI component work consuming existing stores. No new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: CSS Animation Not Replaying on Same-Direction Updates
**What goes wrong:** Applying the same CSS class twice (e.g., `flash-up` then `flash-up` again) does not replay the animation.
**Why it happens:** Browsers don't restart a CSS animation when the same class is already applied.
**How to avoid:** Use alternating class names (`flash-up-a`/`flash-up-b`) toggled via a ref. Both classes reference the same `@keyframes` but the class name change forces the browser to restart the animation.
**Warning signs:** Flash works on first update but not on consecutive same-direction updates.

### Pitfall 2: Sparkline Unbounded Memory Growth
**What goes wrong:** Pushing every price update (~2Hz x 10 tickers) without capping causes the points array to grow indefinitely.
**Why it happens:** A session running for hours accumulates thousands of data points per ticker.
**How to avoid:** Cap at 60 points. When exceeded, downsample by taking every other point (preserves shape, halves count). This keeps SVG rendering fast with a fixed upper bound.
**Warning signs:** Page becomes sluggish after 30+ minutes.

### Pitfall 3: Watchlist Fetch Race Condition
**What goes wrong:** Adding a ticker triggers `POST /api/watchlist` followed by `fetchWatchlist()`. If the fetch returns before the POST commits, the new ticker is missing.
**Why it happens:** Overlapping async operations.
**How to avoid:** Optimistic update -- add the ticker to local state immediately, then confirm with the API. On error, rollback. OR: await the POST, then fetch.
**Warning signs:** Newly added ticker appears, disappears briefly, then reappears.

### Pitfall 4: Portfolio Values Not Updating Live
**What goes wrong:** Header shows initial $10,000 and never changes even as prices stream.
**Why it happens:** `fetchPortfolio()` is called once on mount but portfolio value depends on current prices (positions x current_price).
**How to avoid:** Two options: (A) Re-fetch `/api/portfolio` periodically (every 5 seconds), or (B) compute total_value client-side from positions + price store. Option A is simpler and consistent with backend as source of truth. The header already reads from `usePortfolioStore` -- just add a `setInterval` to re-fetch.
**Warning signs:** Portfolio total value is stale; doesn't track with price movements.

### Pitfall 5: Missing data-testid Attributes
**What goes wrong:** E2E tests fail because selectors can't find elements.
**Why it happens:** Component author doesn't cross-reference the E2E test contracts.
**How to avoid:** Cross-reference every `data-testid` and CSS class from the E2E specs before marking a task done.
**Warning signs:** Playwright timeouts on specific selectors.

## Code Examples

### Watchlist Row with Flash and Sparkline
```typescript
// Source: synthesized from project patterns + E2E contracts
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTickerPrice } from '@/stores/price-store'
import Sparkline from '@/components/sparkline'

interface WatchlistRowProps {
  ticker: string
  onSelect: (ticker: string) => void
  onRemove: (ticker: string) => void
}

export default function WatchlistRow({ ticker, onSelect, onRemove }: WatchlistRowProps) {
  const priceData = useTickerPrice(ticker)
  const initialPriceRef = useRef<number | null>(null)
  const pointsRef = useRef<number[]>([])
  const flashToggle = useRef(false)
  const [flashClass, setFlashClass] = useState('')
  const [renderKey, setRenderKey] = useState(0)

  useEffect(() => {
    if (!priceData) return
    // Track initial price for change %
    if (initialPriceRef.current === null) {
      initialPriceRef.current = priceData.price
    }
    // Accumulate sparkline points
    pointsRef.current.push(priceData.price)
    if (pointsRef.current.length > 60) {
      pointsRef.current = pointsRef.current.filter((_, i) => i % 2 === 0)
    }
    setRenderKey((k) => k + 1)
    // Flash animation
    flashToggle.current = !flashToggle.current
    if (priceData.direction === 'up') {
      setFlashClass(`flash-up ${flashToggle.current ? 'flash-up-a' : 'flash-up-b'}`)
    } else if (priceData.direction === 'down') {
      setFlashClass(`flash-down ${flashToggle.current ? 'flash-down-a' : 'flash-down-b'}`)
    }
  }, [priceData?.price])

  const changePercent = initialPriceRef.current && priceData
    ? ((priceData.price - initialPriceRef.current) / initialPriceRef.current) * 100
    : 0

  return (
    <div
      data-testid={`watchlist-row-${ticker}`}
      className={`flex items-center gap-2 px-2 py-1 cursor-pointer group ${flashClass}`}
      onClick={() => onSelect(ticker)}
    >
      <span className="font-mono text-sm text-text-primary w-14">{ticker}</span>
      <span className="font-mono text-sm text-text-primary w-18 text-right">
        {priceData ? priceData.price.toFixed(2) : '--'}
      </span>
      <span className={`font-mono text-xs w-16 text-right ${changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
      <Sparkline points={pointsRef.current} key={renderKey} />
      <button
        data-testid={`remove-${ticker}`}
        onClick={(e) => { e.stopPropagation(); onRemove(ticker); }}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-xs ml-auto"
      >
        X
      </button>
    </div>
  )
}
```

### SVG Sparkline Component with Gradient Fill
```typescript
// Source: custom SVG per D-02 decision
interface SparklineProps {
  points: number[]
  width?: number
  height?: number
}

export default function Sparkline({ points, width = 60, height = 24 }: SparklineProps) {
  if (points.length < 2) return <svg width={width} height={height} />

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / range) * height
    return `${x},${y}`
  })

  const polylinePoints = coords.join(' ')
  // Close the polygon for the gradient fill area
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sparkGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#209dd7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#209dd7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={polylinePoints} fill="none" stroke="#209dd7" strokeWidth="1.5" />
    </svg>
  )
}
```

**Note on gradient IDs:** If multiple sparklines render simultaneously, the gradient `id` must be unique per instance. Use `useId()` from React 19 to generate unique IDs: `const gradId = useId()` then `id={gradId}` and `fill={url(#${gradId})}`.

### Flash Animation CSS
```css
/* Source: synthesized from D-01 decision + E2E contract (.flash-up required) */
@keyframes flashUpBg {
  0% { background-color: rgba(63, 185, 80, 0.3); }
  100% { background-color: transparent; }
}
@keyframes flashDownBg {
  0% { background-color: rgba(248, 81, 73, 0.3); }
  100% { background-color: transparent; }
}
.flash-up, .flash-up-a, .flash-up-b {
  animation: flashUpBg 500ms ease-out forwards;
}
.flash-down, .flash-down-a, .flash-down-b {
  animation: flashDownBg 500ms ease-out forwards;
}
```

### Watchlist Store with Add/Remove Actions
```typescript
// Source: extending existing watchlist-store.ts pattern
'use client'

import { create } from 'zustand'
import type { WatchlistEntryData } from '@/types/market'

interface WatchlistState {
  tickers: WatchlistEntryData[]
  error: string | null
  fetchWatchlist: () => Promise<void>
  addTicker: (ticker: string) => Promise<void>
  removeTicker: (ticker: string) => Promise<void>
  clearError: () => void
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  tickers: [],
  error: null,
  fetchWatchlist: async () => {
    const res = await fetch('/api/watchlist')
    const data: WatchlistEntryData[] = await res.json()
    set({ tickers: data })
  },
  addTicker: async (ticker: string) => {
    set({ error: null })
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    })
    if (!res.ok) {
      const err = await res.json()
      set({ error: err.detail || 'Failed to add ticker' })
      return
    }
    const entry: WatchlistEntryData = await res.json()
    set((state) => ({ tickers: [...state.tickers, entry] }))
  },
  removeTicker: async (ticker: string) => {
    // Optimistic removal
    const prev = get().tickers
    set((state) => ({ tickers: state.tickers.filter((t) => t.ticker !== ticker) }))
    const res = await fetch(`/api/watchlist/${ticker}`, { method: 'DELETE' })
    if (!res.ok) {
      set({ tickers: prev, error: 'Failed to remove ticker' })
    }
  },
  clearError: () => set({ error: null }),
}))
```

## E2E Test Contract (data-testid and CSS Class Requirements)

These are hard requirements from existing E2E test files that must be matched exactly:

| Source File | Selector | Required Element |
|------------|----------|------------------|
| startup.spec.ts | `data-testid="watchlist-row-AAPL"` | Watchlist row for AAPL |
| startup.spec.ts | `data-testid="watchlist-row-GOOGL"` | Watchlist row for GOOGL |
| startup.spec.ts | `data-testid="watchlist-row-MSFT"` | Watchlist row for MSFT |
| startup.spec.ts | `data-testid="watchlist-row-TSLA"` | Watchlist row for TSLA |
| startup.spec.ts | `data-testid="total-value"` | Portfolio total value (already exists) |
| startup.spec.ts | `data-testid="cash-balance"` | Cash balance (already exists) |
| watchlist.spec.ts | `data-testid="ticker-input"` | Ticker add input field |
| watchlist.spec.ts | `data-testid="add-btn"` | Add ticker button |
| watchlist.spec.ts | `data-testid="remove-AMZN"` | Remove button for AMZN (pattern: `remove-{TICKER}`) |
| watchlist.spec.ts | `data-testid="add-error"` | Error message for invalid add |
| watchlist.spec.ts | `.flash-up` CSS class | Applied to element on price uptick |
| watchlist.spec.ts | Click on `watchlist-row-GOOGL` | Should show "GOOGL -- price chart" text |
| watchlist.spec.ts | Click on `watchlist-row-TSLA` | Should populate trade-ticker input with "TSLA" |
| sse-resilience.spec.ts | `svg` inside `watchlist-row-AAPL` | SVG sparkline element |

**Critical note on WATCH-04 (ticker selection):** The E2E test expects clicking a watchlist row to (a) show "GOOGL -- price chart" text somewhere on the page, and (b) populate the trade bar ticker input with the selected ticker. This requires shared state between WatchlistPanel, the main chart area, and TradeBar. A Zustand store or a simple state lifted to AppShell would work. Since the chart is a Phase 4 placeholder, a simple text like `"{TICKER} -- price chart"` in the chart placeholder is sufficient for now.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS Transition for flash | CSS @keyframes animation | Always | Transitions need FROM/TO states; keyframes auto-play |
| react-sparklines library | Custom SVG polyline | Project decision | Zero dependencies, exact control over gradient fill |
| Context for per-ticker state | Zustand with selectors | Zustand 5.x (2024) | 10x fewer re-renders with per-ticker subscriptions |
| useEffect + setTimeout for animation replay | Alternating CSS class names | Standard pattern | No timer management, browser handles animation lifecycle |

**Deprecated/outdated:**
- `react-sparklines`: Last published 2017, unmaintained, not compatible with React 19 [ASSUMED]
- `ReactCSSTransitionGroup`: Legacy React animation API, replaced by community solutions

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | react-sparklines is unmaintained and incompatible with React 19 | State of the Art | LOW -- custom SVG is the locked decision regardless |
| A2 | 60 sparkline data points provides good visual density at 60px width | Architecture Patterns | LOW -- can adjust MAX_POINTS if too sparse or dense |
| A3 | Polling portfolio every 5 seconds is sufficient for "live-updating" header | Common Pitfalls | LOW -- can reduce interval if not responsive enough |
| A4 | The alternating CSS class pattern works in all target browsers | Common Pitfalls | LOW -- well-established pattern, CSS animations broadly supported |

## Open Questions

1. **Portfolio re-fetch interval**
   - What we know: Header needs live-updating total value that changes with prices
   - What's unclear: How frequently to re-fetch (1s, 5s, 10s?)
   - Recommendation: Start with 5 seconds. This balances responsiveness with backend load. The value changes slowly (positions don't change, only prices do). Could also compute client-side from positions + price store, but server is the source of truth for cash balance.

2. **Selected ticker state ownership**
   - What we know: Clicking a watchlist row selects it for chart + populates trade bar
   - What's unclear: Whether to use a new Zustand store, add to existing store, or lift state to AppShell
   - Recommendation: Add a `selectedTicker` field to a simple store or lift to AppShell state. Keep it minimal -- Phase 4 will build the full chart wiring. For now, just store the string and display it in the chart placeholder.

3. **Sparkline gradient ID uniqueness**
   - What we know: SVG `<linearGradient>` requires unique `id` attributes
   - What's unclear: Whether React 19 `useId()` produces IDs safe for SVG `id` attributes
   - Recommendation: Use `useId()` -- it's designed for this purpose in React 19. The `:` prefix in React's generated IDs is valid in SVG. [VERIFIED: React docs confirm useId generates unique IDs for accessibility and element relationships]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (E2E, already configured) |
| Config file | `test/playwright.config.ts` |
| Quick run command | `npx playwright test test/specs/watchlist.spec.ts --headed` |
| Full suite command | `npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTD-02 | Price flash green/red on change | E2E | `npx playwright test test/specs/watchlist.spec.ts -g "prices flash green"` | Yes |
| RTD-04 | Sparkline SVG appears | E2E | `npx playwright test test/specs/sse-resilience.spec.ts -g "sparkline appears"` | Yes |
| WATCH-01 | Watchlist rows with price + change % | E2E | `npx playwright test test/specs/startup.spec.ts -g "default watchlist"` | Yes |
| WATCH-02 | Add ticker | E2E | `npx playwright test test/specs/watchlist.spec.ts -g "can add"` | Yes |
| WATCH-03 | Remove ticker | E2E | `npx playwright test test/specs/watchlist.spec.ts -g "can remove"` | Yes |
| WATCH-04 | Click ticker selects for chart | E2E | `npx playwright test test/specs/watchlist.spec.ts -g "clicking a ticker row"` | Yes |
| PORT-02 | Total value in header | E2E | `npx playwright test test/specs/startup.spec.ts -g "portfolio value"` | Yes |
| PORT-03 | Cash balance in header | E2E | `npx playwright test test/specs/startup.spec.ts -g "cash balance"` | Yes |

### Sampling Rate
- **Per task commit:** `npx playwright test test/specs/watchlist.spec.ts --headed` (focused)
- **Per wave merge:** `npx playwright test` (full suite)
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- None -- existing Playwright test infrastructure covers all phase requirements. All test specs already written.

## Project Constraints (from CLAUDE.md)

- Use `uv` as Python package manager (backend only, not relevant for this frontend phase)
- Do not overengineer. Do not program defensively.
- Work incrementally with small steps. Validate each increment.
- Use latest library APIs.
- Favor short modules, short methods and functions. Name things clearly.
- Never use emojis in code or print statements.
- Keep code concise with clear docstrings.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `frontend/src/stores/price-store.ts`, `watchlist-store.ts`, `portfolio-store.ts` -- verified store patterns
- Existing codebase: `frontend/src/hooks/use-sse.ts` -- verified SSE hook implementation
- Existing codebase: `frontend/src/types/market.ts` -- verified TypeScript interfaces
- Existing codebase: `frontend/src/components/header.tsx` -- verified header structure
- Existing codebase: `test/specs/watchlist.spec.ts`, `startup.spec.ts`, `sse-resilience.spec.ts` -- verified E2E contracts
- Existing codebase: `backend/app/routes/watchlist.py` -- verified API contracts (GET/POST/DELETE)
- Existing codebase: `backend/app/models.py` -- verified Pydantic response models
- npm registry: zustand 5.0.12 (latest), react 19.1.0 [VERIFIED: npm view]
- Context7: /websites/zustand_pmnd_rs -- async actions, state update patterns [VERIFIED: Context7]

### Secondary (MEDIUM confidence)
- [CSS animation replay pattern](https://gist.github.com/jasonmerecki/984b5d132077e7a370567c130c1922d9) -- alternating class names for animation replay
- [React docs on useId](https://react.dev/reference/react/useId) -- unique ID generation for SVG gradients

### Tertiary (LOW confidence)
- react-sparklines maintainenance status claim [ASSUMED -- based on training data, npm publish date not verified]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in Phase 1
- Architecture: HIGH -- clear component hierarchy, existing stores and hooks, well-defined E2E contracts
- Pitfalls: HIGH -- animation replay and performance patterns are well-documented
- E2E contracts: HIGH -- test files exist in repo with exact selectors

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days -- stable tech, no version changes expected)
