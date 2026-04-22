---
phase: 04-visualizations-charts
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - frontend/package.json
  - frontend/src/components/app-shell.tsx
  - frontend/src/components/heatmap-panel.tsx
  - frontend/src/components/pnl-chart.tsx
  - frontend/src/components/ticker-chart.tsx
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Four visualization/chart components plus the app shell were reviewed. The implementation is clean overall — the lightweight-charts integration in `ticker-chart.tsx` is well-structured with correct cleanup, and the heatmap tile renderer handles edge cases properly. Four warnings were found: an unhandled fetch error in the portfolio store that will silently corrupt state, an unhandled fetch error in `pnl-chart.tsx` that swallows network failures, a `CustomTile` component defined inside the render function causing unnecessary re-mounts on every render, and a missing `Tooltip` in the heatmap that makes P&L values inaccessible for small tiles. Two info items cover a stale-closure risk in `app-shell.tsx` and the absence of a `Tooltip` on the P&L chart.

---

## Warnings

### WR-01: `fetchPortfolio` silently corrupts state on non-OK responses

**File:** `frontend/src/stores/portfolio-store.ts:18`

**Issue:** `fetchPortfolio` does `await fetch('/api/portfolio')` and then immediately calls `res.json()` without checking `res.ok`. If the backend returns a 4xx/5xx response the JSON body may be an error object instead of `PortfolioData`, causing `cashBalance`, `totalValue`, and `positions` to be set to `undefined` — silently breaking every downstream consumer including `HeatmapPanel`.

**Fix:**
```typescript
fetchPortfolio: async () => {
  const res = await fetch('/api/portfolio')
  if (!res.ok) return            // keep previous state on error
  const data: PortfolioData = await res.json()
  set({ cashBalance: data.cash_balance, totalValue: data.total_value, positions: data.positions })
},
```

---

### WR-02: `PnlChart` fetch error is silently swallowed

**File:** `frontend/src/components/pnl-chart.tsx:27`

**Issue:** The `load()` function inside the `useEffect` calls `fetch('/api/portfolio/history')` without a `try/catch`. A network failure or JSON parse error throws an unhandled promise rejection inside the interval; `active` is never set to `false` on error so the interval continues firing against a failing endpoint indefinitely. The chart shows the stale "no data" state with no user feedback.

**Fix:**
```typescript
async function load() {
  try {
    const res = await fetch('/api/portfolio/history')
    if (res.ok && active) {
      const data: Snapshot[] = await res.json()
      setSnapshots(data)
    }
  } catch {
    // network error: retain previous snapshots, interval will retry
  }
}
```

---

### WR-03: `CustomTile` defined inside component body causes remounts on every render

**File:** `frontend/src/components/heatmap-panel.tsx:41`

**Issue:** `CustomTile` is declared as a function inside `HeatmapPanel`. React treats a new function reference as a new component type on every render, so Recharts destroys and remounts all tiles whenever `hoveredTile` changes (i.e., on every mouse-enter/leave). This causes visible flicker — the `fill` and `fillOpacity` transitions stutter because the DOM nodes are replaced rather than updated.

**Fix:** Move `CustomTile` outside `HeatmapPanel` and pass hover state via a ref or a stable callback:

```typescript
// Outside component — stable reference
const CustomTile = memo(function CustomTile(props: Record<string, unknown> & { isHovered: boolean }) {
  // ...same render logic, isHovered passed as prop
})

export default function HeatmapPanel({ onSelectTicker }: HeatmapPanelProps) {
  const [hoveredTile, setHoveredTile] = useState<string | null>(null)
  // pass isHovered per-item via a wrapper or render prop
```

A simpler immediate fix with no API change is to use a `useCallback`-memoized render function or to lift `CustomTile` entirely out of the module scope with `hoveredTile` passed as an explicit prop.

---

### WR-04: Heatmap tiles with small dimensions display ticker but no P&L — no fallback

**File:** `frontend/src/components/heatmap-panel.tsx:50-55`

**Issue:** `CustomTile` suppresses the percentage label when `width < 40 || height < 30` (line 55). There is no `<title>` element or Recharts `<Tooltip>` covering these tiles, so small positions give the user no way to see P&L without clicking through to the chart. This is a UX gap but also a correctness issue: the color alone is insufficient for colorblind users.

**Fix:** Add a Recharts `Tooltip` to the `<Treemap>` that renders on hover, or add a native SVG `<title>` element inside the `<g>` for each tile:

```tsx
// Inside CustomTile, always render an accessible title
<title>{`${name}: ${formatPct(pct)} | $${unrealized_pnl?.toFixed(2)}`}</title>
```

---

## Info

### IN-01: `fetchPortfolio` in `useEffect` dependency array may cause interval reset if store is recreated

**File:** `frontend/src/components/app-shell.tsx:21-23`

**Issue:** `fetchPortfolio` is included in the `useEffect` dependency array. Zustand guarantees function stability across renders for actions defined in `create()`, so this is safe in practice. However, if the store is ever replaced (e.g., in tests using `usePortfolioStore.setState`) the reference changes and the interval is torn down and reset. The dependency is correct per React lint rules; this is an informational note, not a bug.

---

### IN-02: `PnlChart` has no `Tooltip` — Y-axis labels are the only way to read exact values

**File:** `frontend/src/components/pnl-chart.tsx:54`

**Issue:** The `<AreaChart>` renders without a `<Tooltip>` component. Users cannot hover to see the exact portfolio value at a given time; they can only read from the Y-axis ticks. Given that this is a P&L chart, exact values on hover are expected by traders.

**Fix:**
```tsx
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
// ...
<Tooltip
  formatter={(value: number) => [formatDollar(value), 'Portfolio Value']}
  labelFormatter={formatTime}
  contentStyle={{ background: '#161b22', border: '1px solid rgba(125,133,144,0.2)', borderRadius: 4 }}
/>
```

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
