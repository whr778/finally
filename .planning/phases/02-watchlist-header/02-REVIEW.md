---
phase: 02-watchlist-header
reviewed: 2026-04-21T11:54:07Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - frontend/src/components/sparkline.tsx
  - frontend/src/stores/watchlist-store.ts
  - frontend/src/app/globals.css
  - frontend/src/components/watchlist-row.tsx
  - frontend/src/components/ticker-input.tsx
  - frontend/src/components/watchlist-panel.tsx
  - frontend/src/components/app-shell.tsx
  - frontend/src/components/trade-bar.tsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-04-21T11:54:07Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The watchlist, header, and supporting components are well-structured and concise. The code follows project conventions (short modules, clear naming, no emojis, Zustand stores). The SSE integration, price flash animations, and sparkline rendering are implemented correctly. No security vulnerabilities or critical bugs were found.

Three warnings relate to missing error handling in the watchlist store and a stale-state issue when removing a selected ticker. Two info items cover code duplication and a non-idiomatic React re-render pattern.

## Warnings

### WR-01: fetchWatchlist does not check response status

**File:** `frontend/src/stores/watchlist-store.ts:19-20`
**Issue:** `fetchWatchlist` calls `res.json()` without checking `res.ok`. If the API returns a 4xx/5xx status, the response body will be parsed as `WatchlistEntryData[]`, silently producing garbage data or throwing on malformed JSON. The `addTicker` and `removeTicker` methods correctly check `res.ok`, but `fetchWatchlist` does not.
**Fix:**
```typescript
fetchWatchlist: async () => {
  const res = await fetch("/api/watchlist");
  if (!res.ok) {
    set({ error: "Failed to fetch watchlist" });
    return;
  }
  const data: WatchlistEntryData[] = await res.json();
  set({ tickers: data });
},
```

### WR-02: addTicker error path can throw on non-JSON response

**File:** `frontend/src/stores/watchlist-store.ts:31`
**Issue:** When `res.ok` is false, the code calls `await res.json()` to extract the error detail. If the server returns a non-JSON error response (e.g., a plain-text 502 from a reverse proxy or load balancer), `res.json()` will throw an unhandled rejection. This would crash silently rather than showing the user a meaningful error.
**Fix:**
```typescript
if (!res.ok) {
  let message = "Failed to add ticker";
  try {
    const err = await res.json();
    message = err.detail || message;
  } catch {
    // non-JSON error response
  }
  set({ error: message });
  return;
}
```

### WR-03: Selected ticker not cleared when removed from watchlist

**File:** `frontend/src/components/app-shell.tsx:23`
**Issue:** `selectedTicker` state is independent of the watchlist. If the user clicks a ticker (selecting it for the chart/trade bar), then removes that ticker from the watchlist, the chart area still displays the removed ticker name and the trade bar still shows it. This is a UX bug -- the user sees a reference to a ticker that no longer exists in their watchlist.
**Fix:** Pass a removal callback that also clears the selection:
```typescript
const handleRemoveTicker = useCallback((ticker: string) => {
  if (selectedTicker === ticker) setSelectedTicker(null);
  // removeTicker is called inside WatchlistPanel
}, [selectedTicker]);
```
Or more simply, have `WatchlistPanel` accept an `onRemoveTicker` callback that `AppShell` can use to also clear state, mirroring the `onSelectTicker` pattern already in place.

## Info

### IN-01: Duplicated panel border/shadow inline styles

**File:** `frontend/src/components/watchlist-panel.tsx:24-25`, `frontend/src/components/app-shell.tsx:33-34`, `frontend/src/components/trade-bar.tsx:14-15`
**Issue:** The same inline `style` object with `border: '1px solid rgba(125,133,144,0.2)'` and `boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)'` is repeated across three components. This duplicates the panel look and makes future design changes require edits in multiple places.
**Fix:** Extract to a shared Tailwind utility class in `globals.css` or a shared constant:
```css
/* globals.css */
.panel-border {
  border: 1px solid rgba(125, 133, 144, 0.2);
  box-shadow: 0 0 0 1px rgba(32, 157, 215, 0.15), 0 0 8px rgba(32, 157, 215, 0.08);
}
```

### IN-02: Sparkline forced remount via key on every price tick

**File:** `frontend/src/components/watchlist-row.tsx:62`
**Issue:** The `Sparkline` component receives `key={renderKey}` where `renderKey` increments on every price update. This forces React to fully unmount and remount the SVG element on every tick (~500ms). The reason is that `pointsRef` is a mutable ref that does not trigger re-renders. While this works correctly, it is non-idiomatic -- using `useState` for `points` instead of `useRef` would trigger re-renders naturally without the forced remount overhead.
**Fix:** Replace `pointsRef` with state:
```typescript
const [sparkPoints, setSparkPoints] = useState<number[]>([]);
// In the useEffect:
setSparkPoints(prev => {
  const next = [...prev, priceData.price];
  return next.length > 60 ? next.filter((_, i) => i % 2 === 0) : next;
});
// In JSX:
<Sparkline points={sparkPoints} />
```
This eliminates the need for `renderKey` and avoids unnecessary DOM teardown.

---

_Reviewed: 2026-04-21T11:54:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
