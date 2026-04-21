# Phase 1: Foundation & Data Pipeline - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 15 (new frontend files to create)
**Analogs found:** 5 / 15 (backend API contracts serve as analogs for data shape; no existing frontend code)

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `frontend/src/app/layout.tsx` | config | static | None (scaffolded) | no-analog |
| `frontend/src/app/page.tsx` | component | static | None (scaffolded) | no-analog |
| `frontend/src/app/globals.css` | config | static | None (new theme) | no-analog |
| `frontend/src/components/app-shell.tsx` | component | event-driven | None (layout shell) | no-analog |
| `frontend/src/components/header.tsx` | component | request-response | `backend/app/routes/portfolio.py` lines 68-70 | contract-match |
| `frontend/src/components/connection-dot.tsx` | component | event-driven | `backend/app/market/stream.py` lines 54-98 | contract-match |
| `frontend/src/components/placeholder-panel.tsx` | component | static | None (pure UI) | no-analog |
| `frontend/src/components/trade-bar.tsx` | component | static | `test/specs/startup.spec.ts` lines 53-59 | contract-match |
| `frontend/src/components/chat-drawer.tsx` | component | static | `test/specs/startup.spec.ts` lines 46-51 | contract-match |
| `frontend/src/components/chat-input.tsx` | component | static | `test/specs/startup.spec.ts` line 50 | contract-match |
| `frontend/src/stores/price-store.ts` | store | event-driven | `backend/app/market/models.py` lines 9-49 | contract-match |
| `frontend/src/stores/portfolio-store.ts` | store | request-response | `backend/app/models.py` lines 28-40 | contract-match |
| `frontend/src/stores/watchlist-store.ts` | store | request-response | `backend/app/models.py` lines 51-56 | contract-match |
| `frontend/src/hooks/use-sse.ts` | hook | streaming | `backend/app/market/stream.py` lines 54-98 | contract-match |
| `frontend/src/types/market.ts` | type | N/A | `backend/app/models.py` + `backend/app/market/models.py` | contract-match |
| `frontend/next.config.ts` | config | static | None (scaffolded) | no-analog |
| `frontend/postcss.config.mjs` | config | static | None (scaffolded) | no-analog |

## Pattern Assignments

### `frontend/src/types/market.ts` (type definitions, N/A)

**Analog:** `backend/app/market/models.py` + `backend/app/models.py`

These backend models define the exact JSON shapes the frontend receives. Frontend TypeScript types must mirror them precisely.

**SSE price event shape** — from `backend/app/market/models.py` lines 39-49 (`PriceUpdate.to_dict()`):
```python
def to_dict(self) -> dict:
    """Serialize for JSON / SSE transmission."""
    return {
        "ticker": self.ticker,
        "price": self.price,
        "previous_price": self.previous_price,
        "timestamp": self.timestamp,
        "change": self.change,
        "change_percent": self.change_percent,
        "direction": self.direction,
    }
```

**Portfolio response shape** — from `backend/app/models.py` lines 28-40:
```python
class PositionOut(BaseModel):
    ticker: str
    quantity: float
    avg_cost: float
    current_price: float | None
    unrealized_pnl: float | None
    pct_change: float | None

class PortfolioOut(BaseModel):
    cash_balance: float
    positions: list[PositionOut]
    total_value: float
```

**Watchlist entry shape** — from `backend/app/models.py` lines 51-56:
```python
class WatchlistEntry(BaseModel):
    ticker: str
    price: float | None
    previous_price: float | None
    change_percent: float | None
    direction: str | None
```

---

### `frontend/src/hooks/use-sse.ts` (hook, streaming)

**Analog:** `backend/app/market/stream.py` lines 54-98

The SSE endpoint sends data in this exact format. The hook must parse it correctly.

**SSE event format** — from `backend/app/market/stream.py` lines 64-89:
```python
# First message: retry directive
yield "retry: 1000\n\n"

# Subsequent messages: JSON dictionary keyed by ticker
# Each event is:  data: {"AAPL": {...}, "GOOGL": {...}, ...}\n\n
prices = price_cache.get_all()
if prices:
    data = {ticker: update.to_dict() for ticker, update in prices.items()}
    payload = json.dumps(data)
    yield f"data: {payload}\n\n"

# Heartbeat comments (every 15 seconds):
yield ": heartbeat\n\n"
```

**Key contract details:**
- SSE endpoint: `GET /api/stream/prices`
- Media type: `text/event-stream`
- Each `data:` message is a JSON object with ticker symbols as keys
- Value for each key is a `PriceUpdate.to_dict()` object (see type definitions above)
- The `retry: 1000` directive means EventSource will auto-reconnect after 1 second
- Heartbeat comments (`: heartbeat`) keep the connection alive but are ignored by EventSource

---

### `frontend/src/stores/price-store.ts` (store, event-driven)

**Analog:** `backend/app/market/cache.py` (conceptual mirror)

The frontend price store is the client-side equivalent of the backend's `PriceCache`. It holds the latest price for each ticker, updated from SSE events.

**Backend cache structure to mirror** — from `backend/app/market/cache.py` lines 19-24:
```python
class PriceCache:
    def __init__(self) -> None:
        self._prices: dict[str, PriceUpdate] = {}
        self._version: int = 0
```

**Frontend equivalent:** `prices: Record<string, PriceData>` in Zustand store, plus `connectionStatus: 'connected' | 'reconnecting' | 'disconnected'`.

**Selector pattern** (from RESEARCH.md, verified against Zustand v5 docs):
```typescript
// Per-ticker selector -- component only re-renders when THIS ticker changes
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker])
```

---

### `frontend/src/stores/portfolio-store.ts` (store, request-response)

**Analog:** `backend/app/routes/portfolio.py` lines 68-70

**API endpoint to consume:**
```python
@router.get("/api/portfolio", response_model=PortfolioOut)
async def get_portfolio(request: Request):
    return await _get_portfolio(request.app.state.price_cache)
```

**Response shape** — `PortfolioOut` (see type definitions section above). The store fetches this on mount and maps `cash_balance` to `cashBalance`, `total_value` to `totalValue`.

---

### `frontend/src/components/header.tsx` (component, request-response)

**Analog:** `test/specs/startup.spec.ts` lines 15-28 (E2E test contract)

**Required data-testid attributes and content:**
```typescript
// From test/specs/startup.spec.ts lines 18-21
const totalValue = page.getByTestId("total-value");
await expect(totalValue).toBeVisible({ timeout: 10_000 });
await expect(totalValue).toContainText("10,000");

// From test/specs/startup.spec.ts lines 25-27
const cashBalance = page.getByTestId("cash-balance");
await expect(cashBalance).toBeVisible({ timeout: 10_000 });
await expect(cashBalance).toContainText("10,000");
```

**Header must contain:**
- Element with `data-testid="total-value"` showing formatted portfolio total (e.g., "$10,000.00")
- Element with `data-testid="cash-balance"` showing formatted cash balance (e.g., "$10,000.00")
- Logo text containing "Fin" and "Ally" separately visible (lines 11-12)
- ConnectionDot component (see below)

---

### `frontend/src/components/connection-dot.tsx` (component, event-driven)

**Analog:** `test/specs/startup.spec.ts` line 42 + `test/specs/sse-resilience.spec.ts` line 11

**Required data-testid and text content:**
```typescript
// From test/specs/startup.spec.ts lines 41-43
const dot = page.getByTestId("connection-dot");
await expect(dot).toContainText("LIVE", { timeout: 10_000 });
```

**Must render:**
- Container with `data-testid="connection-dot"`
- Text content includes "LIVE" when connected, "CONNECTING" when reconnecting, "OFFLINE" when disconnected
- Visual dot (8-10px circle) colored green/yellow/red per status (D-06)

---

### `frontend/src/components/trade-bar.tsx` (component, static placeholder)

**Analog:** `test/specs/startup.spec.ts` lines 53-59

**Required data-testid attributes:**
```typescript
// From test/specs/startup.spec.ts lines 54-59
await expect(page.getByTestId("trade-bar")).toBeVisible();
await expect(page.getByTestId("trade-ticker")).toBeVisible();
await expect(page.getByTestId("trade-qty")).toBeVisible();
await expect(page.getByTestId("btn-buy")).toBeVisible();
await expect(page.getByTestId("btn-sell")).toBeVisible();
```

**Must render (disabled placeholder in Phase 1):**
- Wrapper with `data-testid="trade-bar"`
- Text input with `data-testid="trade-ticker"`
- Number input with `data-testid="trade-qty"`
- Buy button with `data-testid="btn-buy"` (disabled)
- Sell button with `data-testid="btn-sell"` (disabled)

---

### `frontend/src/components/chat-drawer.tsx` + `chat-input.tsx` (component, static placeholder)

**Analog:** `test/specs/startup.spec.ts` lines 46-51

**Required data-testid attributes and text:**
```typescript
// From test/specs/startup.spec.ts lines 47-50
await expect(page.getByTestId("chat-panel")).toBeVisible();
await expect(page.getByText("AI Assistant")).toBeVisible();
await expect(page.getByTestId("chat-input")).toBeVisible();
```

**Must render (visible by default per Pitfall 4 resolution):**
- Container with `data-testid="chat-panel"`
- Text "AI Assistant" visible somewhere in the panel
- Input element with `data-testid="chat-input"` (disabled in Phase 1)
- Toggle button to collapse/expand the panel (D-02)

---

### `frontend/src/app/globals.css` (config, Tailwind v4 theme)

**No codebase analog.** Use RESEARCH.md Pattern 3 for Tailwind v4 `@theme` configuration.

**Theme values from CONTEXT.md decisions:**
- D-03: Background `#0d1117`, panel `#161b22`, glow `rgba(32,157,215,0.3)`
- D-04: Text primary `#e6edf3`, muted `#7d8590`
- PLAN.md color scheme: accent yellow `#ecad0a`, blue `#209dd7`, purple `#753991`

---

### `frontend/src/app/layout.tsx` (config, root layout)

**No codebase analog.** Use RESEARCH.md Pattern 5 for `next/font/google` + Tailwind v4 integration.

**Key requirements:**
- Load Inter (sans-serif) and JetBrains Mono (monospace) via `next/font/google`
- Expose as CSS variables `--font-inter` and `--font-jetbrains-mono`
- Map to Tailwind via `@theme inline` in globals.css
- Static export: layout is a server component rendered at build time

---

### `frontend/next.config.ts` (config, static export)

**No codebase analog.** Use RESEARCH.md Pattern 4.

**Required setting:**
```typescript
const nextConfig: NextConfig = {
  output: 'export',
}
```

---

### `frontend/postcss.config.mjs` (config, Tailwind v4 PostCSS)

**No codebase analog.** Use RESEARCH.md PostCSS Configuration example.

**Required:**
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

---

## Shared Patterns

### SSE Data Contract
**Source:** `backend/app/market/stream.py` lines 85-88, `backend/app/market/models.py` lines 39-49
**Apply to:** `use-sse.ts` hook, `price-store.ts`, `types/market.ts`

The SSE stream sends a JSON object where keys are ticker symbols and values are `PriceUpdate.to_dict()` objects:
```json
{
  "AAPL": {
    "ticker": "AAPL",
    "price": 190.50,
    "previous_price": 190.25,
    "timestamp": 1713600000.0,
    "change": 0.25,
    "change_percent": 0.1314,
    "direction": "up"
  },
  "GOOGL": { ... }
}
```

### Portfolio API Contract
**Source:** `backend/app/routes/portfolio.py` lines 68-70, `backend/app/models.py` lines 28-40
**Apply to:** `portfolio-store.ts`, `header.tsx`, `types/market.ts`

`GET /api/portfolio` returns:
```json
{
  "cash_balance": 10000.0,
  "positions": [],
  "total_value": 10000.0
}
```

### E2E Test Contract (data-testid requirements)
**Source:** `test/specs/startup.spec.ts` (full file), `test/specs/sse-resilience.spec.ts` (full file)
**Apply to:** All components

Required `data-testid` attributes across all Phase 1 components:

| data-testid | Component | Content Requirement |
|-------------|-----------|---------------------|
| `connection-dot` | `connection-dot.tsx` | Contains "LIVE" when connected |
| `total-value` | `header.tsx` | Contains "10,000" (formatted portfolio value) |
| `cash-balance` | `header.tsx` | Contains "10,000" (formatted cash) |
| `chat-panel` | `chat-drawer.tsx` | Visible on load |
| `chat-input` | `chat-input.tsx` | Visible on load |
| `trade-bar` | `trade-bar.tsx` | Visible on load |
| `trade-ticker` | `trade-bar.tsx` | Input visible |
| `trade-qty` | `trade-bar.tsx` | Input visible |
| `btn-buy` | `trade-bar.tsx` | Button visible |
| `btn-sell` | `trade-bar.tsx` | Button visible |

Note: `watchlist-row-{TICKER}` is tested in `startup.spec.ts` line 33 but will not be implemented until Phase 2. These tests are expected to fail in Phase 1.

### Theme Design Tokens (D-03, D-04)
**Source:** CONTEXT.md decisions D-03, D-04; PLAN.md Section 2 Color Scheme
**Apply to:** `globals.css`, all components

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0d1117` | Page background |
| `bg-panel` | `#161b22` | Panel backgrounds |
| `text-primary` | `#e6edf3` | Main text color |
| `text-muted` | `#7d8590` | Secondary text |
| `accent-yellow` | `#ecad0a` | Accent highlights |
| `accent-blue` | `#209dd7` | Primary action color, glow borders |
| `accent-purple` | `#753991` | Submit buttons |
| `success` | `#3fb950` | Green (uptick, connected) |
| `warning` | `#d29922` | Yellow (reconnecting) |
| `danger` | `#f85149` | Red (downtick, disconnected) |

Panel glow effect (D-03):
```css
box-shadow: 0 0 10px rgba(32, 157, 215, 0.15), inset 0 0 10px rgba(32, 157, 215, 0.05);
border: 1px solid rgba(32, 157, 215, 0.15);
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/app/layout.tsx` | config | static | Greenfield frontend; use RESEARCH.md Pattern 5 |
| `frontend/src/app/page.tsx` | component | static | Simple page rendering AppShell; trivial |
| `frontend/src/app/globals.css` | config | static | Greenfield theme; use RESEARCH.md Pattern 3 |
| `frontend/src/components/app-shell.tsx` | component | event-driven | Layout orchestrator; no analog; use CSS Grid |
| `frontend/src/components/placeholder-panel.tsx` | component | static | Pure UI; no data flow; no analog needed |
| `frontend/src/stores/watchlist-store.ts` | store | request-response | Stub for Phase 2; minimal shell only |
| `frontend/next.config.ts` | config | static | Use RESEARCH.md Pattern 4 |
| `frontend/postcss.config.mjs` | config | static | Use RESEARCH.md PostCSS example |

---

## Metadata

**Analog search scope:** `backend/app/`, `test/specs/`, `.planning/codebase/`
**Files scanned:** Backend models, routes, market data models, cache, stream endpoint, E2E test specs
**Pattern extraction date:** 2026-04-20
**Note:** This is a greenfield frontend project. The `frontend/` directory does not exist yet. All "analogs" are backend API contracts and E2E test contracts that define the data shapes and test IDs the new frontend code must conform to. RESEARCH.md provides the primary code patterns (Zustand stores, SSE hooks, Tailwind theme) since no existing frontend code exists to copy from.
