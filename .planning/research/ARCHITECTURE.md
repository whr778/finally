# Architecture Research

**Domain:** Real-time financial dashboard frontend (Next.js static export)
**Researched:** 2026-04-20
**Confidence:** HIGH

## System Overview

```
+-----------------------------------------------------------------------+
|                         Browser (Single Tab)                          |
+-----------------------------------------------------------------------+
|                                                                       |
|  +------------------+    +------------------+    +------------------+  |
|  | SSE Connection   |    | REST API Client  |    | UI State (Zustand)|  |
|  | (EventSource)    |    | (fetch wrappers) |    |                  |  |
|  +--------+---------+    +--------+---------+    +--------+---------+  |
|           |                       |                       |           |
|           v                       v                       v           |
|  +--------+---------+    +--------+---------+    +--------+---------+  |
|  | Price Store      |    | Portfolio Store  |    | Chat Store       |  |
|  | (Zustand slice)  |    | (Zustand slice)  |    | (Zustand slice)  |  |
|  +--------+---------+    +--------+---------+    +--------+---------+  |
|           |                       |                       |           |
|           +----------+------------+-----------+-----------+           |
|                      |                        |                       |
|                      v                        v                       |
|  +-------------------+---+    +---+-----------+-------------------+   |
|  |     Data-Dense Panels     |     Interactive Panels             |   |
|  | - Watchlist (table+spark) | - Trade Bar (inputs)               |   |
|  | - Positions Table         | - Chat Panel (messages+input)      |   |
|  | - Header (value+status)   | - Watchlist Add/Remove             |   |
|  +---------------------------+------------------------------------+   |
|  |                    Visualization Panels                        |   |
|  | - Main Price Chart (Lightweight Charts, canvas)                |   |
|  | - Portfolio Heatmap (Recharts Treemap, SVG)                    |   |
|  | - P&L History Chart (Recharts LineChart, SVG)                  |   |
|  +----------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
                    |                       |
                    v                       v
        GET /api/stream/prices      /api/* REST endpoints
        (SSE, text/event-stream)    (JSON, same origin)
+-----------------------------------------------------------------------+
|                    FastAPI Backend (port 8000)                         |
+-----------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| SSE Connection Manager | Single EventSource to `/api/stream/prices`, parse price events, push to price store, manage reconnection state | Custom hook `useSSE` wrapping native EventSource API |
| Price Store | Hold latest price per ticker, price history arrays for sparklines, track direction (up/down/flat) | Zustand store with per-ticker maps |
| Portfolio Store | Cash balance, positions, total value, P&L snapshots; fetch from REST on load and after trades | Zustand store with async fetch actions |
| Watchlist Store | Ordered ticker list; add/remove via REST, sync with price store for display data | Zustand store with optimistic updates |
| Chat Store | Message history, loading state, send messages to `/api/chat`, display trade/watchlist action results | Zustand store with async send action |
| UI State | Selected ticker, connection status, trade form state, notification/toast state | Zustand store (or co-located in relevant stores) |
| Header | Display portfolio total value, cash balance, connection status dot | React component reading from portfolio + SSE stores |
| Watchlist Panel | Table rows per ticker: symbol, price, change%, sparkline SVG; click to select; add/remove controls | React component with flash animation CSS |
| Main Chart | Large price chart for selected ticker, built from SSE price history accumulated since page load | Lightweight Charts (canvas-based, imperative via useRef) |
| Portfolio Heatmap | Treemap of positions sized by weight, colored by P&L | Recharts Treemap component |
| P&L Chart | Line chart of portfolio value over time from `/api/portfolio/history` | Recharts LineChart component |
| Positions Table | Tabular display of holdings: ticker, qty, avg cost, current price, unrealized P&L, % change | React table component reading portfolio + price stores |
| Trade Bar | Ticker input, quantity input, buy/sell buttons; calls `/api/portfolio/trade`; shows success/error feedback | Controlled form component |
| Chat Panel | Scrolling message list, text input, send button, loading indicator; inline trade/watchlist action confirmations | React component with auto-scroll |

## Recommended Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (dark theme, font, metadata)
│   │   ├── page.tsx            # Single page — the entire dashboard
│   │   └── globals.css         # Tailwind directives + custom CSS vars + flash animations
│   ├── components/
│   │   ├── Header.tsx          # Portfolio value, cash, connection dot
│   │   ├── Watchlist.tsx       # Watchlist table with sparklines
│   │   ├── WatchlistRow.tsx    # Single row with flash animation logic
│   │   ├── Sparkline.tsx       # Inline SVG sparkline (hand-rolled, ~30 lines)
│   │   ├── PriceChart.tsx      # Lightweight Charts wrapper (main chart area)
│   │   ├── PortfolioHeatmap.tsx # Recharts Treemap wrapper
│   │   ├── PnlChart.tsx        # Recharts LineChart for portfolio history
│   │   ├── PositionsTable.tsx  # Positions with live P&L
│   │   ├── TradeBar.tsx        # Trade input form
│   │   └── ChatPanel.tsx       # AI chat interface
│   ├── stores/
│   │   ├── priceStore.ts       # SSE price data + sparkline history
│   │   ├── portfolioStore.ts   # Portfolio state + fetch actions
│   │   ├── watchlistStore.ts   # Watchlist state + CRUD actions
│   │   ├── chatStore.ts        # Chat messages + send action
│   │   └── uiStore.ts          # Selected ticker, connection status, toasts
│   ├── hooks/
│   │   ├── useSSE.ts           # EventSource connection lifecycle
│   │   └── useFlash.ts         # Price flash animation trigger hook
│   └── lib/
│       └── api.ts              # Typed fetch wrappers for all REST endpoints
├── public/                     # Static assets (favicon, etc.)
├── next.config.ts              # output: 'export' configuration
├── tailwind.config.ts          # Custom dark theme, colors, animations
├── tsconfig.json
└── package.json
```

### Structure Rationale

- **`src/app/`:** Next.js App Router with a single `page.tsx` because this is an SPA. The layout handles global styles and metadata. No routing needed — everything is one page.
- **`src/components/`:** Flat component directory (no nesting). With ~10 components, sub-folders add navigation cost without benefit. Each component file is self-contained.
- **`src/stores/`:** Zustand stores separated by data domain. Each store is independent, which avoids the "god store" anti-pattern and keeps re-renders isolated to consumers of specific data.
- **`src/hooks/`:** Custom hooks that encapsulate side effects (SSE connection, flash animations). Keeps components focused on rendering.
- **`src/lib/`:** API client module with typed fetch wrappers. Single place to define all backend communication, making it easy to test and update.

## Architectural Patterns

### Pattern 1: SSE-to-Store Bridge

**What:** A single `useSSE` hook manages the EventSource connection lifecycle and pushes parsed price data into the Zustand price store. The hook lives at the top of the component tree (in `page.tsx`) and runs once.

**When to use:** Always — this is the primary real-time data pipeline.

**Trade-offs:** Centralizing SSE in one hook means all price data flows through one path (good for debugging, bad if you need multiple independent SSE streams — which we do not).

**Example:**
```typescript
// hooks/useSSE.ts
import { useEffect, useRef } from 'react';
import { usePriceStore } from '@/stores/priceStore';
import { useUIStore } from '@/stores/uiStore';

export function useSSE() {
  const updatePrices = usePriceStore((s) => s.updatePrices);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream/prices');
    sourceRef.current = es;

    es.onopen = () => setConnectionStatus('connected');

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updatePrices(data);
    };

    es.onerror = () => setConnectionStatus('reconnecting');

    return () => es.close();
  }, [updatePrices, setConnectionStatus]);
}
```

### Pattern 2: Selective Zustand Subscriptions

**What:** Components subscribe to only the specific slice of state they need using Zustand's selector pattern. This prevents re-renders when unrelated state changes — critical when prices update every 500ms.

**When to use:** Every component that reads from a store.

**Trade-offs:** Requires discipline to always use selectors. The alternative (subscribing to the whole store) causes cascade re-renders that will lag the UI at 2 updates/second across 10 tickers.

**Example:**
```typescript
// A watchlist row only subscribes to its own ticker's price
function WatchlistRow({ ticker }: { ticker: string }) {
  const price = usePriceStore((s) => s.prices[ticker]?.price);
  const direction = usePriceStore((s) => s.prices[ticker]?.direction);
  const history = usePriceStore((s) => s.sparklineData[ticker]);
  // Only re-renders when THIS ticker's data changes
}
```

### Pattern 3: Imperative Chart Updates (Lightweight Charts)

**What:** The main price chart uses TradingView Lightweight Charts, which has an imperative API (not declarative React). The chart is created once in a `useRef` + `useEffect`, and subsequent price updates are pushed via `series.update()` — not by re-rendering the component.

**When to use:** For the main price chart only. Sparklines and other charts use declarative Recharts/SVG.

**Trade-offs:** More complex code (imperative + React lifecycle management), but necessary for canvas performance with live data. Declarative re-rendering of a canvas chart at 500ms intervals would cause visible lag and GC pressure.

**Example:**
```typescript
// components/PriceChart.tsx
import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { usePriceStore } from '@/stores/priceStore';

export function PriceChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: '#0d1117' }, textColor: '#d1d5db' },
      grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
    });
    const series = chart.addLineSeries({ color: '#209dd7' });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => chart.remove();
  }, []);

  // Subscribe to price updates outside React render cycle
  useEffect(() => {
    const unsub = usePriceStore.subscribe(
      (state) => state.prices[ticker],
      (update) => {
        if (update && seriesRef.current) {
          seriesRef.current.update({
            time: Math.floor(update.timestamp) as any,
            value: update.price,
          });
        }
      }
    );
    return unsub;
  }, [ticker]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

### Pattern 4: CSS Flash Animation via Class Toggle

**What:** When a price updates, a CSS class (`flash-up` or `flash-down`) is applied to the row element for ~500ms, then removed. The class applies a background-color transition that fades from green/red to transparent. This avoids React re-render overhead for animation.

**When to use:** Watchlist rows on every price update.

**Trade-offs:** Requires a small custom hook or effect to manage the class toggle timer. Pure CSS transitions are more performant than JS-driven animation libraries for this use case.

**Example:**
```css
/* globals.css */
.flash-up {
  background-color: rgba(34, 197, 94, 0.2);
  transition: background-color 0.5s ease-out;
}
.flash-down {
  background-color: rgba(239, 68, 68, 0.2);
  transition: background-color 0.5s ease-out;
}
.flash-none {
  background-color: transparent;
  transition: background-color 0.5s ease-out;
}
```

```typescript
// hooks/useFlash.ts
import { useEffect, useRef, useState } from 'react';

export function useFlash(direction: string | undefined): string {
  const [flashClass, setFlashClass] = useState('flash-none');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!direction || direction === 'flat') return;
    setFlashClass(direction === 'up' ? 'flash-up' : 'flash-down');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashClass('flash-none'), 500);
  }, [direction]);

  return flashClass;
}
```

## Data Flow

### Real-Time Price Flow (SSE)

```
FastAPI price cache (500ms updates)
        |
        v
GET /api/stream/prices (SSE)
        |
        v
EventSource.onmessage (useSSE hook)
        |
        v
Parse JSON -> { "AAPL": { ticker, price, previous_price, timestamp, change, change_percent, direction }, ... }
        |
        v
priceStore.updatePrices(data)
        |
        +---> Each WatchlistRow re-renders (via selector on its ticker)
        |         |---> Flash animation triggered via useFlash(direction)
        |         |---> Sparkline SVG re-renders with new data point appended
        |
        +---> PriceChart updates imperatively (Zustand.subscribe, not React re-render)
        |
        +---> PositionsTable re-renders with updated current_price and P&L
        |
        +---> Header total value recalculated
```

### Trade Execution Flow

```
User fills Trade Bar (ticker, quantity) -> clicks Buy/Sell
        |
        v
POST /api/portfolio/trade { ticker, side, quantity }
        |
        v
Backend validates -> executes -> returns TradeOut { ticker, side, quantity, price, executed_at }
        |
        v
Frontend shows success toast (data-testid="trade-success")
        |
        v
portfolioStore.fetchPortfolio() -> GET /api/portfolio
        |
        v
Portfolio data refreshed -> PositionsTable, Heatmap, Header all re-render
```

### Chat Flow

```
User types message -> clicks Send
        |
        v
chatStore.sendMessage(content)
        |
        +---> Optimistic: add user message to chatStore.messages
        |     Show loading indicator (data-testid="chat-loading")
        |
        v
POST /api/chat { content }
        |
        v
Backend: LLM call + auto-execute trades/watchlist changes -> returns ChatOut
        |
        v
chatStore receives response:
        |---> Add assistant message to chatStore.messages
        |---> If trades_executed: portfolioStore.fetchPortfolio()
        |---> If watchlist_changes: watchlistStore.fetchWatchlist()
        |---> Display action confirmations inline in chat
```

### Watchlist Management Flow

```
User enters ticker in input (data-testid="ticker-input") -> clicks Add
        |
        v
POST /api/watchlist { ticker }
        |
        +---> Success: watchlistStore adds ticker, market source starts streaming it
        |     New row appears in Watchlist, prices start flowing via SSE
        |
        +---> Error (409 duplicate, 400 invalid): show error (data-testid="add-error")

User clicks remove button (data-testid="remove-{TICKER}")
        |
        v
DELETE /api/watchlist/{ticker}
        |
        v
watchlistStore removes ticker -> row disappears from Watchlist
```

### State Management Overview

```
+-------------------+     +-------------------+     +-------------------+
|   priceStore      |     |  portfolioStore   |     |   chatStore       |
| - prices: Map     |     | - cash: number    |     | - messages: []    |
| - sparklineData   |     | - positions: []   |     | - loading: bool   |
| - updatePrices()  |     | - totalValue: num |     | - sendMessage()   |
+-------------------+     | - fetchPortfolio()|     +-------------------+
                          +-------------------+
+-------------------+     +-------------------+
|  watchlistStore   |     |    uiStore        |
| - tickers: []     |     | - selectedTicker  |
| - addTicker()     |     | - connectionStatus|
| - removeTicker()  |     | - toasts: []      |
| - fetchWatchlist()|     +-------------------+
+-------------------+
```

Stores are independent. Cross-store communication happens through component-level orchestration (a component reads from one store and calls actions on another), not through store-to-store subscriptions.

## Key Data Flows

1. **Price broadcast:** SSE event -> priceStore -> all price-aware components (watchlist rows, chart, positions, header). This is the highest-frequency flow (~2 events/second).

2. **Portfolio refresh:** Triggered after trade execution or chat actions. Single REST call updates portfolioStore, which re-renders portfolio-dependent components (heatmap, positions table, header values).

3. **Ticker selection:** User clicks watchlist row -> uiStore.selectedTicker updates -> PriceChart switches to new ticker, TradeBar pre-fills ticker symbol. Low frequency, simple prop/selector flow.

4. **Chat round-trip:** Synchronous POST with loading state. On response, may trigger side effects in portfolio and watchlist stores if the AI executed actions.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user (this project) | All state in-browser, one SSE connection, one SQLite DB. No changes needed. |
| 10 concurrent users | Backend handles multiple SSE connections (asyncio handles this naturally). Frontend unchanged. |
| 100+ users | SSE fan-out becomes a concern. Add Redis pub/sub for price distribution. Frontend unchanged. |

### Scaling Priorities

1. **First bottleneck:** SSE connections per process. FastAPI/uvicorn can handle hundreds of concurrent SSE clients, but each is a long-lived connection. For this single-user project, not a concern.
2. **Second bottleneck:** Frontend rendering performance with high-frequency updates. Solved by selective Zustand subscriptions and imperative chart updates. If more tickers are added (50+), consider throttling SSE updates in the priceStore to batch into 200ms windows.

## Anti-Patterns

### Anti-Pattern 1: Using Context API for Price Data

**What people do:** Put frequently-updating price data in React Context.
**Why it's wrong:** Context re-renders every consumer on every update. With 10 tickers updating every 500ms, this means 20 re-renders/second for every component in the context tree, including components that only care about one ticker.
**Do this instead:** Use Zustand with selectors. Each component subscribes to exactly the data it needs, so a price change in AAPL only re-renders AAPL's row, not all 10.

### Anti-Pattern 2: Re-rendering Canvas Charts Declaratively

**What people do:** Pass data as props to a chart component and let React re-render the entire chart on every update.
**Why it's wrong:** Canvas chart creation is expensive. Recreating the chart (or even redrawing all series data) every 500ms causes visible jank, dropped frames, and GC pressure from discarded canvas contexts.
**Do this instead:** Create the chart once in a useEffect, store the chart/series refs, and push updates imperatively via `series.update()`. Subscribe to the Zustand store outside the React render cycle using `store.subscribe()`.

### Anti-Pattern 3: Fetching Portfolio Data on a Timer

**What people do:** Poll `/api/portfolio` every N seconds to keep positions fresh.
**Why it's wrong:** Portfolio state only changes after trades. Polling wastes bandwidth, creates flickering, and makes the UI feel sluggish (changes appear delayed by up to the poll interval).
**Do this instead:** Fetch portfolio data on mount and immediately after every trade execution (manual or AI-initiated). For live P&L updates, compute unrealized P&L on the frontend by combining position data (avg_cost, quantity from portfolioStore) with live prices (from priceStore). No polling needed.

### Anti-Pattern 4: One Monolithic Zustand Store

**What people do:** Put all application state (prices, portfolio, chat, UI) in a single Zustand store.
**Why it's wrong:** Every state update triggers subscription checks across all consumers. A price update at 500ms intervals will fire selectors for chat, portfolio, and UI components that don't care about prices. Harder to reason about, test, and maintain.
**Do this instead:** Separate stores by domain (priceStore, portfolioStore, chatStore, watchlistStore, uiStore). Each store has focused responsibilities and independent subscription trees.

### Anti-Pattern 5: Building Sparklines with a Charting Library

**What people do:** Use Recharts or Lightweight Charts for tiny inline sparklines in the watchlist table.
**Why it's wrong:** Each charting library instance has overhead (DOM nodes, event listeners, layout calculations). With 10 sparklines updating at 500ms, this creates noticeable lag.
**Do this instead:** Use a simple hand-rolled SVG `<polyline>` component. A sparkline is just a polyline mapping data points to x/y coordinates. ~30 lines of code, zero library overhead, renders in microseconds.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| SSE `/api/stream/prices` | Native `EventSource` API in `useSSE` hook | Browser auto-reconnects on disconnect (retry: 1000ms set by server). Parse JSON `data` field. Each event contains all tickers as a dict. |
| REST `/api/*` | Typed `fetch` wrappers in `lib/api.ts` | Same origin, no CORS. All responses are JSON. Use `response.ok` check + parse error `detail` field from FastAPI HTTPException responses. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Stores <-> Components | Zustand selectors (`useStore(selector)`) | Always use selectors; never subscribe to entire store |
| useSSE hook <-> priceStore | Direct store action call (`updatePrices`) | Hook runs once at app root; pushes parsed SSE data directly into store |
| PriceChart <-> priceStore | `store.subscribe()` (non-React) | Imperative chart updates bypass React render cycle for performance |
| TradeBar -> portfolioStore | Component calls `portfolioStore.executeTrade()` then `fetchPortfolio()` | Sequential: trade must complete before portfolio refresh |
| ChatPanel -> multiple stores | Chat response may trigger `portfolioStore.fetchPortfolio()` + `watchlistStore.fetchWatchlist()` | Side effects from AI actions require cross-store coordination at the component level |

## Build Order (Dependencies)

The following order reflects actual implementation dependencies:

1. **Project scaffold + Layout shell** -- Next.js project with static export config, Tailwind dark theme, root layout, empty page with grid skeleton. No data. Establishes the visual foundation.

2. **API client + Stores** -- `lib/api.ts` typed fetch wrappers, all five Zustand stores with their actions. No UI yet, but all data plumbing is in place. Can be tested in isolation.

3. **SSE hook + Connection indicator** -- `useSSE` hook connecting to `/api/stream/prices`, pushing to priceStore. Header component with connection status dot. First sign of life: "LIVE" indicator appears.

4. **Watchlist panel** -- WatchlistRow with price display, flash animations, sparkline SVG. Watchlist add/remove controls. This is the most data-testid-dense component and the visual centerpiece.

5. **Header + Trade bar** -- Header showing total value and cash balance. Trade bar with ticker/qty inputs and buy/sell buttons. Wire up to portfolio store. Enables the core trading loop.

6. **Positions table + Portfolio heatmap** -- Positions table with live P&L (computed from priceStore + portfolioStore). Heatmap treemap visualization. Depends on having positions from trades.

7. **Main price chart** -- Lightweight Charts integration for selected ticker. Depends on ticker selection from watchlist (step 4) and price data flowing (step 3).

8. **P&L chart** -- Recharts line chart from `/api/portfolio/history`. Depends on portfolio snapshots existing (requires trades from step 5).

9. **Chat panel** -- AI chat interface with message history, loading state, inline action confirmations. Cross-store side effects for AI-executed trades. Last because it integrates everything.

## Required data-testid Attributes

These are mandated by the existing E2E test specs and must be present in the final UI:

| Test ID | Component | Element |
|---------|-----------|---------|
| `total-value` | Header | Portfolio total value display |
| `cash-balance` | Header | Cash balance display |
| `connection-dot` | Header | SSE connection status (contains text "LIVE") |
| `watchlist-row-{TICKER}` | WatchlistRow | Each watchlist row (e.g., `watchlist-row-AAPL`) |
| `ticker-input` | Watchlist | Add ticker input field |
| `add-btn` | Watchlist | Add ticker button |
| `add-error` | Watchlist | Error message for invalid/duplicate ticker add |
| `remove-{TICKER}` | WatchlistRow | Remove button per ticker (e.g., `remove-AMZN`) |
| `trade-bar` | TradeBar | Trade bar container |
| `trade-ticker` | TradeBar | Ticker input field |
| `trade-qty` | TradeBar | Quantity input field |
| `btn-buy` | TradeBar | Buy button |
| `btn-sell` | TradeBar | Sell button |
| `trade-success` | TradeBar | Success feedback (contains ticker and BUY/SELL) |
| `trade-error` | TradeBar | Error feedback |
| `position-row-{TICKER}` | PositionsTable | Position row (e.g., `position-row-GOOGL`) |
| `tile-{TICKER}` | PortfolioHeatmap | Heatmap tile (e.g., `tile-AAPL`) |
| `chat-panel` | ChatPanel | Chat panel container |
| `chat-input` | ChatPanel | Message input field |
| `chat-send` | ChatPanel | Send button (disabled when input empty) |
| `chat-msg-user` | ChatPanel | User message bubble |
| `chat-msg-assistant` | ChatPanel | Assistant message bubble |
| `chat-loading` | ChatPanel | Loading indicator |

Additionally, the E2E tests expect:
- CSS class `.flash-up` to appear on elements during price uptick animation
- SVG element inside watchlist rows for sparklines
- Text "GOOGL -- price chart" visible when GOOGL is selected
- Clicking a watchlist row populates the trade-ticker input
- Text "Fin" and "Ally" visible in the header
- Text "AI Assistant" visible in the chat panel

## Sources

- [Next.js Static Export Guide](https://nextjs.org/docs/app/guides/static-exports) -- confirmed `output: 'export'` configuration for SPA mode
- [Next.js SPA Guide](https://nextjs.org/docs/app/guides/single-page-applications) -- client-side data fetching patterns
- [TradingView Lightweight Charts React Tutorial (Basic)](https://tradingview.github.io/lightweight-charts/tutorials/react/simple) -- useRef + useEffect pattern for chart creation
- [TradingView Lightweight Charts React Tutorial (Advanced)](https://tradingview.github.io/lightweight-charts/tutorials/react/advanced) -- useImperativeHandle pattern for exposing chart API
- [Recharts Treemap API](https://recharts.github.io/en-US/api/Treemap/) -- Treemap component for portfolio heatmap
- [React State Management 2025 Comparison](https://www.developerway.com/posts/react-state-management-2025) -- Zustand as default choice for dashboards
- [Zustand vs Context for Real-time Data](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k) -- Context re-render issues with high-frequency updates

---
*Architecture research for: FinAlly AI Trading Workstation frontend*
*Researched: 2026-04-20*
