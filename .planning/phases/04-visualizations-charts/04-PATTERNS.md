# Phase 4: Visualizations & Charts - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 5 (3 new components, 1 modified component, 1 modified config)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/components/heatmap-panel.tsx` | component | request-response (reads store) | `frontend/src/components/positions-table.tsx` | exact |
| `frontend/src/components/pnl-chart.tsx` | component | request-response (polling) | `frontend/src/components/watchlist-panel.tsx` | role-match |
| `frontend/src/components/ticker-chart.tsx` | component | streaming (SSE via store) | `frontend/src/components/watchlist-row.tsx` | role-match |
| `frontend/src/components/app-shell.tsx` | component (modify) | orchestrator | self | exact |
| `frontend/package.json` | config (modify) | n/a | self | exact |

## Pattern Assignments

### `frontend/src/components/heatmap-panel.tsx` (component, store-driven)

**Analog:** `frontend/src/components/positions-table.tsx`

This is the closest match: both read `usePortfolioStore` positions, render a list of position data with P&L coloring, and handle an empty state. The treemap replaces a placeholder panel in the same grid row as PositionsTable.

**Imports pattern** (positions-table.tsx lines 1-3):
```typescript
'use client'

import { usePortfolioStore } from '@/stores/portfolio-store'
```

New component will additionally need:
```typescript
import { Treemap, ResponsiveContainer } from 'recharts'
```

**Store selector pattern** (positions-table.tsx line 32):
```typescript
const positions = usePortfolioStore((s) => s.positions)
```

**Panel wrapper with glow pattern** (positions-table.tsx lines 37-42):
```typescript
<div
  className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
  <h2 className="text-base font-semibold text-text-primary mb-2">Positions</h2>
```

**Empty state pattern** (positions-table.tsx lines 44-47):
```typescript
{sorted.length === 0 ? (
  <div className="flex-1 flex items-center justify-center">
    <p className="text-xs text-text-muted">No positions yet. Execute a trade to get started.</p>
  </div>
) : (
```

**P&L color helper** (positions-table.tsx lines 12-15):
```typescript
function pnlColor(value: number | null): string {
  if (value === null || value === 0) return 'text-text-primary'
  return value > 0 ? 'text-success' : 'text-danger'
}
```

**P&L format helper** (positions-table.tsx lines 23-28):
```typescript
function formatPct(value: number | null): string {
  if (value === null) return '\u2014'
  if (value === 0) return '0.00%'
  if (value > 0) return '+' + value.toFixed(2) + '%'
  return value.toFixed(2) + '%'
}
```

**data-testid pattern** (positions-table.tsx line 63):
```typescript
<tr key={p.ticker} data-testid={`position-row-${p.ticker}`}>
```
Treemap tiles need: `data-testid={`tile-${name}`}`

**Click handler prop pattern** (from watchlist-panel.tsx lines 8-9):
```typescript
interface WatchlistPanelProps {
  onSelectTicker: (ticker: string) => void
}
```
HeatmapPanel should accept the same `onSelectTicker` prop.

---

### `frontend/src/components/pnl-chart.tsx` (component, polling)

**Analog:** `frontend/src/components/watchlist-panel.tsx` (fetch-on-mount + interval pattern), combined with `frontend/src/components/sparkline.tsx` (gradient fill pattern)

**Imports pattern** (new component will use):
```typescript
'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts'
```

**Fetch-on-mount + interval polling pattern** (from app-shell.tsx lines 16-21):
```typescript
const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)
useEffect(() => {
  fetchPortfolio()
  const interval = setInterval(fetchPortfolio, 5000)
  return () => clearInterval(interval)
}, [fetchPortfolio])
```
PnlChart adapts this: fetch `GET /api/portfolio/history` on mount, poll every 30 seconds. Uses component-local state instead of Zustand.

**Panel wrapper with glow** -- same pattern as heatmap-panel above (positions-table.tsx lines 37-42).

**Empty state** -- same structural pattern as positions-table.tsx lines 44-47.

**Gradient fill visual reference** (sparkline.tsx lines 32-36):
```typescript
<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#209dd7" stopOpacity={0.3} />
  <stop offset="100%" stopColor="#209dd7" stopOpacity={0} />
</linearGradient>
```
The Recharts `<defs>` gradient uses the same blue `#209dd7` with opacity 0.3 to 0.

**Backend response shape** (from backend/app/models.py lines 59-61):
```python
class SnapshotOut(BaseModel):
    recorded_at: str
    total_value: float
```
Frontend fetches `SnapshotOut[]` from `GET /api/portfolio/history`.

---

### `frontend/src/components/ticker-chart.tsx` (component, streaming/SSE)

**Analog:** `frontend/src/components/watchlist-row.tsx` (SSE-driven per-ticker data accumulation with refs)

This is the most complex new component. It mirrors watchlist-row's pattern of subscribing to per-ticker price data from the store and accumulating a history in a ref.

**Imports pattern** (watchlist-row.tsx lines 1-4):
```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTickerPrice } from '@/stores/price-store'
```

New component additionally needs:
```typescript
import { createChart, AreaSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
```

**Per-ticker store selector** (watchlist-row.tsx line 14, price-store.ts lines 25-26):
```typescript
const priceData = useTickerPrice(ticker)
```
```typescript
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker]);
```

**Price history accumulation in ref** (watchlist-row.tsx lines 28-31):
```typescript
pointsRef.current.push(priceData.price)
if (pointsRef.current.length > 60) {
  pointsRef.current = pointsRef.current.filter((_, i) => i % 2 === 0)
}
```
TickerChart accumulates `{ time: UTCTimestamp, value: number }` pairs instead of raw numbers.

**Component prop interface** (from trade-bar.tsx lines 8-10):
```typescript
interface TradeBarProps {
  selectedTicker: string | null
}
```
TickerChart accepts the same `selectedTicker: string | null` prop.

**Panel wrapper with glow** -- same pattern as app-shell.tsx lines 31-36:
```typescript
<div
  className="bg-bg-panel rounded-lg p-4"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
```

**Chart header text** (must preserve for E2E -- app-shell.tsx lines 38-41):
```typescript
<h2 className="text-base font-semibold text-text-primary mb-2">Chart</h2>
<p className="text-xs text-text-muted">
  {selectedTicker ? `${selectedTicker} \u2014 price chart` : 'Click a ticker to view its chart'}
</p>
```

**PriceData type** (types/market.ts lines 1-9):
```typescript
export interface PriceData {
  ticker: string;
  price: number;
  previous_price: number;
  timestamp: number;
  change: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
}
```
The `timestamp` field (seconds since epoch) maps directly to Lightweight Charts `UTCTimestamp`.

---

### `frontend/src/components/app-shell.tsx` (modify -- orchestrator)

**Self-analog:** The current file is the template. Three targeted replacements:

**Current chart placeholder** (lines 31-42) -- replace with `<TickerChart>`:
```typescript
<div
  className="bg-bg-panel rounded-lg p-4"
  style={{
    border: '1px solid rgba(125,133,144,0.2)',
    boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
  }}
>
  <h2 className="text-base font-semibold text-text-primary mb-2">Chart</h2>
  <p className="text-xs text-text-muted">
    {selectedTicker ? `${selectedTicker} \u2014 price chart` : 'Click a ticker to view its chart'}
  </p>
</div>
```
Becomes: `<TickerChart selectedTicker={selectedTicker} />`

**Current placeholder panels** (lines 45-46):
```typescript
<PlaceholderPanel title="Portfolio Map" phaseNote="Coming in Phase 4" />
<PlaceholderPanel title="P&amp;L" phaseNote="Coming in Phase 4" />
```
Become:
```typescript
<HeatmapPanel onSelectTicker={setSelectedTicker} />
<PnlChart />
```

**Import additions needed** -- add to existing import block (lines 1-11):
```typescript
import TickerChart from '@/components/ticker-chart'
import HeatmapPanel from '@/components/heatmap-panel'
import PnlChart from '@/components/pnl-chart'
```
The `PlaceholderPanel` import can be removed if no other usages remain.

---

### `frontend/package.json` (modify -- config)

**Self-analog.** Add two new dependencies to the existing `dependencies` block (lines 12-19):
```json
"lightweight-charts": "^5.1.0",
"recharts": "^3.8.0"
```

---

## Shared Patterns

### Panel Glow Styling
**Source:** `frontend/src/components/placeholder-panel.tsx` lines 9-13, also `positions-table.tsx` lines 38-41, `watchlist-panel.tsx` lines 22-25
**Apply to:** All three new components (heatmap-panel, pnl-chart, ticker-chart)
```typescript
className="bg-bg-panel rounded-lg p-4 flex flex-col h-full overflow-hidden"
style={{
  border: '1px solid rgba(125,133,144,0.2)',
  boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
}}
```

### Empty State Pattern
**Source:** `frontend/src/components/positions-table.tsx` lines 44-47
**Apply to:** heatmap-panel (no positions), pnl-chart (no snapshots), ticker-chart (no ticker selected)
```typescript
<div className="flex-1 flex items-center justify-center">
  <p className="text-xs text-text-muted">{emptyText}</p>
</div>
```

### 'use client' Directive
**Source:** Every component in the codebase
**Apply to:** All three new components
```typescript
'use client'
```

### Blue Gradient Fill (Chart Styling)
**Source:** `frontend/src/components/sparkline.tsx` lines 32-36
**Apply to:** pnl-chart (Recharts defs), ticker-chart (Lightweight Charts topColor/bottomColor)
```
Line color: #209dd7
Gradient: rgba(32, 157, 215, 0.3) to rgba(32, 157, 215, 0)
Stroke width: 1.5
```

### Dark Theme Tokens
**Source:** `frontend/src/app/globals.css` lines 8-21
**Apply to:** All new components (use Tailwind class names, not raw hex)
```css
--color-bg-primary: #0d1117;
--color-bg-panel: #161b22;
--color-text-primary: #e6edf3;
--color-text-muted: #7d8590;
--color-accent-blue: #209dd7;
--color-success: #3fb950;
--color-danger: #f85149;
--color-border-glow: rgba(32, 157, 215, 0.15);
--color-border-subtle: rgba(125, 133, 144, 0.2);
```
For Lightweight Charts and Recharts config objects, use raw hex values (libraries don't read CSS variables).

### Per-Ticker Zustand Selector
**Source:** `frontend/src/stores/price-store.ts` lines 25-26
**Apply to:** ticker-chart
```typescript
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker]);
```
Prevents full re-renders on every 2Hz SSE update.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | -- | -- | All files have codebase analogs |

## Metadata

**Analog search scope:** `frontend/src/components/`, `frontend/src/stores/`, `frontend/src/types/`, `frontend/src/hooks/`, `frontend/src/app/`
**Files scanned:** 18 TypeScript/TSX files in frontend/src
**Pattern extraction date:** 2026-04-21
