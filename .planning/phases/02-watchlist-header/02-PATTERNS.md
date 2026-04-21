# Phase 2: Watchlist & Header - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 9 (4 new, 5 modified)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/components/watchlist-panel.tsx` | component | request-response | `frontend/src/components/chat-drawer.tsx` | role-match |
| `frontend/src/components/watchlist-row.tsx` | component | event-driven | `frontend/src/components/connection-dot.tsx` | role-match |
| `frontend/src/components/sparkline.tsx` | component | transform | (no close analog -- pure SVG rendering) | none |
| `frontend/src/components/ticker-input.tsx` | component | request-response | `frontend/src/components/trade-bar.tsx` | exact |
| `frontend/src/stores/watchlist-store.ts` (MODIFY) | store | CRUD | `frontend/src/stores/portfolio-store.ts` | exact |
| `frontend/src/components/header.tsx` (MODIFY) | component | event-driven | self (already exists) | exact |
| `frontend/src/components/app-shell.tsx` (MODIFY) | component | event-driven | self (already exists) | exact |
| `frontend/src/app/globals.css` (MODIFY) | config | n/a | self (already exists) | exact |
| `frontend/src/components/trade-bar.tsx` (MODIFY) | component | event-driven | self (already exists) | exact |

## Pattern Assignments

### `frontend/src/components/watchlist-panel.tsx` (NEW -- component, request-response)

**Analog:** `frontend/src/components/chat-drawer.tsx` (container panel pattern)

**Imports pattern** (chat-drawer.tsx lines 1-3):
```typescript
'use client'

import ChatInput from '@/components/chat-input'
```
Adapt to:
```typescript
'use client'

import WatchlistRow from '@/components/watchlist-row'
import TickerInput from '@/components/ticker-input'
import { useWatchlistStore } from '@/stores/watchlist-store'
```

**Panel styling pattern** (chat-drawer.tsx lines 12-27, placeholder-panel.tsx lines 7-14):
```typescript
// Panel wrapper from placeholder-panel.tsx lines 7-14
<div
  className="bg-bg-panel rounded-lg p-4"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
```
Use this same border+boxShadow pattern for the watchlist panel container. The watchlist panel replaces the `PlaceholderPanel` in the "Watchlist" slot, so it should fill the same grid cell.

**Container structure** (chat-drawer.tsx lines 28-42 -- header + scrollable body pattern):
```typescript
// Header section
<div className="flex items-center justify-between p-4 border-b border-border-subtle">
  <h2 className="text-base font-semibold">AI Assistant</h2>
</div>
// Scrollable body
<div className="flex-1 p-4 overflow-y-auto" />
// Footer section
<div className="p-4 border-t border-border-subtle">
  <ChatInput />
</div>
```
Adapt to: TickerInput at top, scrollable list of WatchlistRow in body. Use `overflow-y-auto` for the rows list.

---

### `frontend/src/components/watchlist-row.tsx` (NEW -- component, event-driven)

**Analog:** `frontend/src/components/connection-dot.tsx` (Zustand selector + reactive display)

**Store selector pattern** (connection-dot.tsx lines 3, 12):
```typescript
import { useConnectionStatus } from '@/stores/price-store'

export default function ConnectionDot() {
  const status = useConnectionStatus()
```
Adapt to per-ticker selector:
```typescript
import { useTickerPrice } from '@/stores/price-store'

export default function WatchlistRow({ ticker }: WatchlistRowProps) {
  const priceData = useTickerPrice(ticker)
```
This is the critical performance pattern. `useTickerPrice(ticker)` (from price-store.ts line 25-26) returns only one ticker's `PriceData`, so the row only re-renders when its own price changes.

**Per-ticker selector definition** (price-store.ts lines 25-26):
```typescript
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker]);
```

**data-testid pattern** (trade-bar.tsx lines 13-14, connection-dot.tsx line 16):
```typescript
data-testid="connection-dot"
data-testid="trade-bar"
```
E2E contract requires: `data-testid={`watchlist-row-${ticker}`}` and `data-testid={`remove-${ticker}`}`

**Font class pattern** (trade-bar.tsx line 18):
```typescript
className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-24"
```
Use `font-mono` for price/ticker/change values. Use `text-success` / `text-danger` for green/red coloring (from globals.css theme tokens).

**Interactive hover pattern** -- use Tailwind `group` and `group-hover:opacity-100` for the remove X button (no existing analog, but standard Tailwind pattern).

---

### `frontend/src/components/sparkline.tsx` (NEW -- component, transform)

**No close analog in codebase.** This is a pure SVG rendering component with no state management or API calls.

**Component signature pattern** (placeholder-panel.tsx lines 1-4):
```typescript
interface SparklineProps {
  points: number[]
  width?: number
  height?: number
}

export default function Sparkline({ points, width = 60, height = 24 }: SparklineProps) {
```
Follow the project pattern: interface above, default export function. `'use client'` IS required because `useId()` (a React hook) is used for unique SVG gradient IDs.

**Gradient ID uniqueness:** Use React 19 `useId()` to generate unique SVG gradient IDs per instance.

---

### `frontend/src/components/ticker-input.tsx` (NEW -- component, request-response)

**Analog:** `frontend/src/components/trade-bar.tsx` (input form with data-testid)

**Input styling pattern** (trade-bar.tsx lines 13-19):
```typescript
<input
  data-testid="trade-ticker"
  type="text"
  placeholder="Ticker"
  className="bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 w-24 border border-border-subtle"
/>
```
Adapt for ticker-input with `data-testid="ticker-input"`.

**Button styling pattern** (trade-bar.tsx lines 28-33):
```typescript
<button
  data-testid="btn-buy"
  className="bg-success/50 text-text-primary font-semibold text-sm rounded px-4 py-1.5"
>
  Buy
</button>
```
Adapt for add-btn with `data-testid="add-btn"`. Use `bg-accent-blue` or similar for the + button.

**Error display:** E2E requires `data-testid="add-error"`. Show error from watchlist store's `error` state.

**Container layout** (trade-bar.tsx line 8):
```typescript
className="flex items-center gap-3"
```
Use same flex row pattern for input + button + error.

---

### `frontend/src/stores/watchlist-store.ts` (MODIFY -- store, CRUD)

**Analog:** `frontend/src/stores/portfolio-store.ts` (async fetch action pattern)

**Existing store to modify** (watchlist-store.ts lines 1-18 -- full file):
```typescript
"use client";

import { create } from "zustand";
import type { WatchlistEntryData } from "@/types/market";

interface WatchlistState {
  tickers: WatchlistEntryData[];
  fetchWatchlist: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistState>()((set) => ({
  tickers: [],
  fetchWatchlist: async () => {
    const res = await fetch("/api/watchlist");
    const data: WatchlistEntryData[] = await res.json();
    set({ tickers: data });
  },
}));
```

**Async action pattern** (portfolio-store.ts lines 17-25):
```typescript
fetchPortfolio: async () => {
  const res = await fetch("/api/portfolio");
  const data: PortfolioData = await res.json();
  set({
    cashBalance: data.cash_balance,
    totalValue: data.total_value,
    positions: data.positions,
  });
},
```
Follow this pattern for `addTicker` and `removeTicker` -- simple async fetch, update state via `set()`. Add `error: string | null` to the state interface. Use `(set, get)` for optimistic removal in `removeTicker`.

---

### `frontend/src/components/header.tsx` (MODIFY -- component, event-driven)

**Current file** (header.tsx lines 1-53 -- full file):
Already reads from portfolio store via selectors (lines 18-19):
```typescript
const totalValue = usePortfolioStore((s) => s.totalValue)
const cashBalance = usePortfolioStore((s) => s.cashBalance)
```

**Modification needed:** Add periodic re-fetch of portfolio data so values update as prices change. Pattern from app-shell.tsx (lines 14-17):
```typescript
const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
useEffect(() => {
  fetchPortfolio()
}, [fetchPortfolio])
```
Add a `setInterval` inside a `useEffect` to call `fetchPortfolio()` every 5 seconds. Alternatively, this interval could live in app-shell.tsx where `fetchPortfolio` is already called once on mount.

---

### `frontend/src/components/app-shell.tsx` (MODIFY -- component, event-driven)

**Current file** (app-shell.tsx lines 1-39 -- full file):

**Placeholder replacement** (app-shell.tsx line 25):
```typescript
<PlaceholderPanel title="Watchlist" phaseNote="Coming in Phase 2" />
```
Replace with `<WatchlistPanel />`. The grid cell is `grid-cols-[280px_1fr]` first column.

**State management for selected ticker** -- add `useState` for `selectedTicker` in AppShell (line 19 pattern):
```typescript
const [chatOpen, setChatOpen] = useState(true)
```
Add: `const [selectedTicker, setSelectedTicker] = useState<string | null>(null)`

Pass `selectedTicker` and `setSelectedTicker` as props to WatchlistPanel and TradeBar. The chart placeholder should display `"{TICKER} -- price chart"` text when a ticker is selected (E2E contract from watchlist.spec.ts line 16).

**Watchlist fetch on mount** -- add alongside portfolio fetch (lines 14-17):
```typescript
const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
useEffect(() => {
  fetchPortfolio()
}, [fetchPortfolio])
```
Add similar for `useWatchlistStore((s) => s.fetchWatchlist)`.

**Portfolio periodic re-fetch** -- add `setInterval` inside the existing useEffect or a new one to re-fetch every 5 seconds.

---

### `frontend/src/app/globals.css` (MODIFY -- config)

**Current file** (globals.css lines 1-27 -- full file):
```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
}

@theme {
  --color-bg-primary: #0d1117;
  --color-bg-panel: #161b22;
  /* ... theme tokens ... */
}
```

**Add after the theme block (after line 21):** Flash animation keyframes and classes. These are global CSS classes referenced by the watchlist-row component and checked by E2E tests (`.flash-up` selector in watchlist.spec.ts line 44).

---

### `frontend/src/components/trade-bar.tsx` (MODIFY -- component, event-driven)

**Current file** (trade-bar.tsx lines 1-43 -- full file):

**Modification needed:** Accept `selectedTicker` prop and populate the trade-ticker input value. Currently the input is disabled with no value (line 13-19):
```typescript
<input
  data-testid="trade-ticker"
  type="text"
  placeholder="Ticker"
  disabled
  className="..."
/>
```
Change to accept props and set `value={selectedTicker || ''}`. E2E contract (watchlist.spec.ts line 24): clicking TSLA row should make `trade-ticker` input have value "TSLA".

---

## Shared Patterns

### Panel Styling
**Source:** `frontend/src/components/placeholder-panel.tsx` lines 7-14
**Apply to:** `watchlist-panel.tsx`, any new panel component
```typescript
<div
  className="bg-bg-panel rounded-lg p-4"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
```

### Component Directive
**Source:** All existing components (`header.tsx` line 1, `app-shell.tsx` line 1, etc.)
**Apply to:** All new components that use React hooks
```typescript
'use client'
```
Every component using `useState`, `useEffect`, `useRef`, or Zustand hooks must start with `'use client'`.

### Zustand Store Pattern
**Source:** `frontend/src/stores/price-store.ts` lines 1-29, `portfolio-store.ts` lines 1-27
**Apply to:** `watchlist-store.ts` modifications
```typescript
"use client";

import { create } from "zustand";
import type { SomeType } from "@/types/market";

interface SomeState {
  data: SomeType[];
  fetchData: () => Promise<void>;
}

export const useSomeStore = create<SomeState>()((set) => ({
  data: [],
  fetchData: async () => {
    const res = await fetch("/api/endpoint");
    const data: SomeType[] = await res.json();
    set({ data });
  },
}));
```

### Per-Ticker Selector Pattern (Performance-Critical)
**Source:** `frontend/src/stores/price-store.ts` lines 25-26
**Apply to:** `watchlist-row.tsx` (and any future per-ticker component)
```typescript
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker]);
```
Each row subscribes independently. Never subscribe to the full `prices` object at the panel level.

### Theme Color Tokens
**Source:** `frontend/src/app/globals.css` lines 9-20
**Apply to:** All new components
```css
--color-bg-primary: #0d1117;
--color-bg-panel: #161b22;
--color-text-primary: #e6edf3;
--color-text-muted: #7d8590;
--color-accent-yellow: #ecad0a;
--color-accent-blue: #209dd7;
--color-success: #3fb950;
--color-danger: #f85149;
--color-border-subtle: rgba(125, 133, 144, 0.2);
```
Use via Tailwind classes: `text-text-primary`, `text-text-muted`, `text-success`, `text-danger`, `bg-bg-panel`, `border-border-subtle`, `text-accent-blue`.

### Currency Formatting
**Source:** `frontend/src/components/header.tsx` lines 6-10
**Apply to:** Any component displaying dollar values
```typescript
const formatCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format
```

### data-testid Convention
**Source:** All existing components (trade-bar.tsx, header.tsx, connection-dot.tsx, chat-drawer.tsx)
**Apply to:** All new components
Format: `data-testid="descriptive-name"` using kebab-case. For dynamic IDs: `data-testid={`watchlist-row-${ticker}`}`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/components/sparkline.tsx` | component | transform | No SVG rendering components exist in the codebase. Use RESEARCH.md code example (custom SVG `<polyline>` with `<linearGradient>`) as the primary reference. |

## Metadata

**Analog search scope:** `frontend/src/` (all components, stores, hooks, types, CSS)
**Files scanned:** 14 existing TypeScript/CSS files
**Pattern extraction date:** 2026-04-21
