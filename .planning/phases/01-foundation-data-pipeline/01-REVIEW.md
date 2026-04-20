---
phase: 01-foundation-data-pipeline
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - frontend/src/app/globals.css
  - frontend/src/app/layout.tsx
  - frontend/src/app/page.tsx
  - frontend/src/components/app-shell.tsx
  - frontend/src/components/chat-drawer.tsx
  - frontend/src/components/chat-input.tsx
  - frontend/src/components/connection-dot.tsx
  - frontend/src/components/header.tsx
  - frontend/src/components/placeholder-panel.tsx
  - frontend/src/components/trade-bar.tsx
  - frontend/src/hooks/use-sse.ts
  - frontend/src/stores/portfolio-store.ts
  - frontend/src/stores/price-store.ts
  - frontend/src/stores/watchlist-store.ts
  - frontend/src/types/market.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase delivers the frontend skeleton: layout, SSE price streaming, Zustand stores, and type definitions. The implementation is clean and well-structured. SSE connection management and store design are sound. Three warnings flag missing error handling that will cause silent failures at runtime, and three info items cover minor quality issues.

## Warnings

### WR-01: `fetchPortfolio` silently swallows network and HTTP errors

**File:** `frontend/src/stores/portfolio-store.ts:17-25`
**Issue:** `fetch("/api/portfolio")` is called with no error handling. If the network is down or the server returns a non-2xx status (e.g., 500 during startup), `res.json()` will throw or return unexpected data, leaving `cashBalance`, `totalValue`, and `positions` at their zero/empty defaults with no indication to the user that the fetch failed. The header will display `$0.00` with no error state.
**Fix:**
```typescript
fetchPortfolio: async () => {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error(`Portfolio fetch failed: ${res.status}`);
  const data: PortfolioData = await res.json();
  set({
    cashBalance: data.cash_balance,
    totalValue: data.total_value,
    positions: data.positions,
  });
},
```
At minimum add the `res.ok` guard so callers can catch and surface the error.

---

### WR-02: `fetchWatchlist` has no error handling

**File:** `frontend/src/stores/watchlist-store.ts:12-17`
**Issue:** Same pattern as WR-01. A failed watchlist fetch leaves `tickers` empty with no error state exposed. When the Watchlist panel is implemented in Phase 2, this silent failure will render an empty list that looks identical to a successfully loaded empty watchlist.
**Fix:**
```typescript
fetchWatchlist: async () => {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error(`Watchlist fetch failed: ${res.status}`);
  const data: WatchlistEntryData[] = await res.json();
  set({ tickers: data });
},
```

---

### WR-03: SSE JSON parse error is unhandled and will crash the message handler

**File:** `frontend/src/hooks/use-sse.ts:19`
**Issue:** `JSON.parse(event.data)` will throw a `SyntaxError` if the server sends a malformed SSE message (e.g., keep-alive comments like `: ping`, partial frames, or error payloads). An uncaught exception inside `es.onmessage` will surface as an unhandled error in the browser console and may disrupt the connection state machine.
**Fix:**
```typescript
es.onmessage = (event: MessageEvent) => {
  let data: Record<string, PriceData>;
  try {
    data = JSON.parse(event.data);
  } catch {
    return; // ignore non-JSON frames (keep-alives, comments)
  }
  updatePrices(data);
  setConnectionStatus("connected");
};
```

---

## Info

### IN-01: `useWatchlistStore` is imported nowhere — dead store

**File:** `frontend/src/stores/watchlist-store.ts`
**Issue:** `watchlist-store.ts` is defined but never imported in any component in this phase. `app-shell.tsx` calls `fetchPortfolio` but not `fetchWatchlist`. The store exists correctly and will be used in Phase 2, but the initial fetch is not wired up yet. This is fine for a placeholder phase, but worth noting for Phase 2 implementation.
**Fix:** In Phase 2, add `fetchWatchlist` call in `app-shell.tsx` alongside `fetchPortfolio`:
```typescript
const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist)
useEffect(() => { fetchWatchlist() }, [fetchWatchlist])
```

---

### IN-02: Inline `style` props duplicate CSS custom property values

**File:** `frontend/src/components/chat-drawer.tsx:20-24`, `frontend/src/components/placeholder-panel.tsx:11-14`, `frontend/src/components/trade-bar.tsx:8-12`, `frontend/src/components/header.tsx:24`
**Issue:** Border and box-shadow values are hardcoded as inline style strings (e.g., `rgba(125,133,144,0.2)`, `rgba(32,157,215,0.15)`) that duplicate the CSS custom properties `--color-border-subtle` and `--color-border-glow` already defined in `globals.css`. If the design values change, they must be updated in multiple places.
**Fix:** Define Tailwind utility classes or use CSS variables directly:
```css
/* globals.css — add reusable panel border */
.panel-border {
  border: 1px solid var(--color-border-subtle);
  box-shadow: 0 0 0 1px var(--color-border-glow), 0 0 8px rgba(32,157,215,0.08);
}
```
Or use Tailwind's `border-border-subtle` and a ring utility class. This is low priority since all values are consistent, but will matter when theming.

---

### IN-03: `P&amp;L` HTML entity in JSX is unnecessary

**File:** `frontend/src/components/app-shell.tsx:30`
**Issue:** The string `P&amp;L` uses the HTML entity `&amp;` inside JSX. In JSX, `&` in text content does not need escaping — JSX handles it natively. The entity renders correctly but is not idiomatic.
**Fix:**
```tsx
<PlaceholderPanel title="P&L" phaseNote="Coming in Phase 4" />
```

---

_Reviewed: 2026-04-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
