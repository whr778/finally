# Phase 3: Trading & Positions - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 3 (2 modified, 1 new)
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/components/trade-bar.tsx` | component | request-response | `frontend/src/components/ticker-input.tsx` | exact — async form POST with inline error display |
| `frontend/src/components/positions-table.tsx` | component | CRUD (read) | `frontend/src/components/watchlist-panel.tsx` + `watchlist-row.tsx` | role-match — Zustand read + panel glow + tabular rows with data-testid |
| `frontend/src/components/app-shell.tsx` | component | request-response | self (existing file, surgery to swap PlaceholderPanel) | exact — already imports TradeBar, just needs PositionsTable import + JSX swap |

## Pattern Assignments

### `frontend/src/components/trade-bar.tsx` (component, request-response)

**Analog:** `frontend/src/components/ticker-input.tsx`

This is the best match: a `'use client'` component that owns local `useState`, calls an API via `fetch`, reads error state, and shows inline feedback. The trade bar is the same pattern extended with auto-dismiss and a success variant.

**Imports pattern** (`ticker-input.tsx` lines 1-4):
```typescript
'use client'

import { useState } from 'react'
import { useWatchlistStore } from '@/stores/watchlist-store'
```

Trade bar will extend this with `useEffect` for the prop-sync and auto-dismiss:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'
```

**Controlled input pattern** (`ticker-input.tsx` lines 7-8, 24-33):
```typescript
const [value, setValue] = useState('')

<input
  data-testid="ticker-input"
  type="text"
  value={value}
  onChange={(e) => { setValue(e.target.value); clearError(); }}
  className="flex-1 bg-bg-primary text-text-primary font-mono text-sm rounded px-2 py-1.5 border border-border-subtle placeholder:text-text-muted"
/>
```

Trade bar applies same pattern to two inputs (`ticker`, `qty`). Remove `readOnly` from ticker, remove `disabled` from qty.

**Async submit handler pattern** (`ticker-input.tsx` lines 12-19):
```typescript
const handleAdd = async () => {
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return
  await addTicker(trimmed)
  if (!useWatchlistStore.getState().error) {
    setValue('')
  }
}
```

Trade bar adapts to a `handleTrade(side)` function with the same shape: validate locally, call fetch, handle success (clear qty, show success, call fetchPortfolio), handle failure (show error, keep fields).

**Inline error display pattern** (`ticker-input.tsx` lines 42-44):
```typescript
{error && (
  <p data-testid="add-error" className="text-xs text-danger mt-1">{error}</p>
)}
```

Trade bar extends this to two variants using the `feedback` state object:
```typescript
{feedback?.type === 'success' && (
  <span data-testid="trade-success" className="text-success font-mono text-xs mt-1">
    {feedback.message}
  </span>
)}
{feedback?.type === 'error' && (
  <span data-testid="trade-error" className="text-danger font-mono text-xs mt-1">
    {feedback.message}
  </span>
)}
```

**Auto-dismiss pattern** (standard React, referenced in RESEARCH.md):
```typescript
useEffect(() => {
  if (!feedback) return
  const timer = setTimeout(() => setFeedback(null), 3000)
  return () => clearTimeout(timer)
}, [feedback])
```

**Prop-sync pattern** (RESEARCH.md Pattern 2):
```typescript
const [ticker, setTicker] = useState(selectedTicker || '')

useEffect(() => {
  if (selectedTicker) setTicker(selectedTicker)
}, [selectedTicker])
```

**Existing panel glow styling** (`trade-bar.tsx` lines 12-15 — keep as-is):
```typescript
style={{
  border: '1px solid rgba(125,133,144,0.2)',
  boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
}}
```

**Post-trade store refresh** (`portfolio-store.ts` line 17 — call this after success):
```typescript
const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
// After trade success:
fetchPortfolio()
```

**Success message format** (D-02 requirement, RESEARCH.md Pitfall 2):
```typescript
// trade is the TradeOut response: { ticker, side, quantity, price, executed_at }
`${trade.side.toUpperCase()} ${trade.quantity} ${trade.ticker} @ $${trade.price.toFixed(2)}`
```

**Fetch POST pattern** (`watchlist-store.ts` lines 25-31, adapted for component-level use):
```typescript
const res = await fetch('/api/portfolio/trade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ticker: ticker.toUpperCase(), quantity: parseFloat(qty), side }),
})
if (!res.ok) {
  const err = await res.json()
  // err.detail is the FastAPI error string
}
```

---

### `frontend/src/components/positions-table.tsx` (component, CRUD read)

**Primary analog:** `frontend/src/components/watchlist-panel.tsx` — panel glow container, Zustand selector, empty state.
**Secondary analog:** `frontend/src/components/watchlist-row.tsx` — per-row `data-testid`, monospace font values, color-conditional text.

**Panel container pattern** (`watchlist-panel.tsx` lines 20-26):
```typescript
<div
  className="bg-bg-panel rounded-lg p-4 flex flex-col h-full"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
  <h2 className="text-base font-semibold text-text-primary mb-2">Positions</h2>
```

**Imports pattern** (`watchlist-panel.tsx` lines 1-5):
```typescript
'use client'

import { usePortfolioStore } from '@/stores/portfolio-store'
// No other imports needed for a pure display component
```

**Zustand selector pattern** (`watchlist-panel.tsx` line 13, adapted):
```typescript
const positions = usePortfolioStore((s) => s.positions)
```

**Empty state pattern** (`watchlist-panel.tsx` lines 34-38):
```typescript
{positions.length === 0 ? (
  <div className="text-center py-4">
    <p className="text-sm text-text-muted">No positions</p>
    <p className="text-xs text-text-muted mt-1">Execute a trade to get started.</p>
  </div>
) : (
  // table
)}
```

**Per-row data-testid pattern** (`watchlist-row.tsx` line 51 — same convention):
```typescript
// watchlist-row uses: data-testid={`watchlist-row-${ticker}`}
// positions-table uses: data-testid={`position-row-${position.ticker}`}
<tr key={position.ticker} data-testid={`position-row-${position.ticker}`}>
```

**Color-conditional text pattern** (`watchlist-row.tsx` lines 59-61):
```typescript
// watchlist-row:
className={`font-mono text-xs w-16 text-right ${changePercent >= 0 ? 'text-success' : 'text-danger'}`}

// positions-table equivalent for P&L and % change:
className={`font-mono text-xs text-right ${
  value === null || value === 0 ? 'text-text-primary' : value > 0 ? 'text-success' : 'text-danger'
}`}
```

**Currency formatting** (`header.tsx` lines 6-11 — reuse same Intl formatter):
```typescript
const formatCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format
```

**Monospace font** (`watchlist-row.tsx` lines 55-57, `globals.css` line 5):
```typescript
// All numeric data values use font-mono class
className="font-mono text-sm text-text-primary"
// font-mono maps to --font-jetbrains-mono (globals.css line 5)
```

---

### `frontend/src/components/app-shell.tsx` (component, surgery — import swap)

**Analog:** self. Only two changes needed:
1. Add import for `PositionsTable`.
2. Replace the `PlaceholderPanel title="Positions"` JSX with `<PositionsTable />`.

**Existing import block** (`app-shell.tsx` lines 1-10):
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSSE } from '@/hooks/use-sse'
import { usePortfolioStore } from '@/stores/portfolio-store'
import Header from '@/components/header'
import PlaceholderPanel from '@/components/placeholder-panel'
import WatchlistPanel from '@/components/watchlist-panel'
import TradeBar from '@/components/trade-bar'
import ChatDrawer from '@/components/chat-drawer'
```

Add after existing imports:
```typescript
import PositionsTable from '@/components/positions-table'
```

**Target JSX to replace** (`app-shell.tsx` line 43):
```typescript
// BEFORE:
<PlaceholderPanel title="Positions" phaseNote="Coming in Phase 3" />

// AFTER:
<PositionsTable />
```

`PlaceholderPanel` import can be removed if no other usages remain after the swap (lines 44-45 still use it for Portfolio Map and P&L panels).

---

## Shared Patterns

### Panel Glow Styling
**Source:** `frontend/src/components/placeholder-panel.tsx` lines 8-14, `frontend/src/components/watchlist-panel.tsx` lines 21-25, `frontend/src/components/trade-bar.tsx` lines 12-15
**Apply to:** `positions-table.tsx` outer container div
```typescript
className="bg-bg-panel rounded-lg p-4"
style={{
  border: '1px solid rgba(125,133,144,0.2)',
  boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
}}
```

### Tailwind Color Tokens for P&L
**Source:** `frontend/src/app/globals.css` lines 16-18
**Apply to:** `positions-table.tsx` P&L and % change columns, `trade-bar.tsx` feedback spans
```css
--color-success: #3fb950;   /* text-success class */
--color-danger:  #f85149;   /* text-danger class  */
```

### `'use client'` Directive
**Source:** All existing components — `trade-bar.tsx` line 1, `watchlist-panel.tsx` line 1, `header.tsx` line 1
**Apply to:** Both `trade-bar.tsx` (already has it) and `positions-table.tsx` (add at top)
```typescript
'use client'
```

### FastAPI Error Shape
**Source:** `frontend/src/stores/watchlist-store.ts` lines 27-30
**Apply to:** `trade-bar.tsx` error handling in fetch block
```typescript
const err = await res.json()
// err.detail is the error string — FastAPI default for 400/404/422 responses
setFeedback({ type: 'error', message: err.detail || 'Trade failed' })
```

### Zustand Store Selector Pattern (prevent full re-renders)
**Source:** `frontend/src/stores/portfolio-store.ts` line 13, `header.tsx` lines 18-19, `watchlist-panel.tsx` lines 13-15
**Apply to:** `trade-bar.tsx`, `positions-table.tsx`
```typescript
// Select only what the component needs — not the whole store object
const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
const positions = usePortfolioStore((s) => s.positions)
```

## No Analog Found

None — all three files have strong codebase analogs. Pattern coverage is complete.

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/stores/`, `frontend/src/types/`, `frontend/src/app/globals.css`
**Files scanned:** 9 (trade-bar.tsx, portfolio-store.ts, app-shell.tsx, market.ts, watchlist-panel.tsx, watchlist-row.tsx, header.tsx, ticker-input.tsx, placeholder-panel.tsx, watchlist-store.ts, globals.css)
**Pattern extraction date:** 2026-04-21
