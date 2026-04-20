# Phase 1: Foundation & Data Pipeline - Research

**Researched:** 2026-04-20
**Domain:** Next.js frontend scaffold, Tailwind CSS dark theme, Zustand state management, SSE data pipeline
**Confidence:** HIGH

## Summary

Phase 1 establishes the frontend application shell: a Next.js 15 static export project with Tailwind CSS v4 dark theming, Zustand stores for state management, and an EventSource connection to the existing backend SSE price stream. The backend is already built and provides all API endpoints; this phase creates the client-side foundation that all subsequent phases build upon.

The core technical challenge is setting up the SSE data pipeline with Zustand so that 2Hz price updates flow into the store without causing full re-renders across the component tree. The pattern is: EventSource receives batched price data, updates a `Record<string, PriceData>` in the store, and individual components subscribe to specific tickers via selectors. The layout is a CSS Grid shell with placeholder panels for future phases, a header with portfolio values, and a connection status indicator.

**Primary recommendation:** Use `npx create-next-app@15` to scaffold the project (without `--tailwind` flag since it installs v3), then manually install Tailwind CSS v4 with `@tailwindcss/postcss`. Configure fonts via `next/font/google` (Inter + JetBrains Mono) with CSS variables mapped to Tailwind `@theme inline`. All components needing state/effects must use `'use client'` directive since this is a static export.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full layout grid with all panel areas rendered as empty bordered placeholders (watchlist, main chart, positions, heatmap/P&L, trade bar). Subsequent phases fill panels in without layout rework.
- **D-02:** Chat panel starts collapsed with a toggle button (not a fixed sidebar). More screen space for charts/data until Phase 5 builds chat out.
- **D-03:** Dark panels with soft blue glow edges. Background #0d1117, panel background #161b22, borders use subtle box-shadow glow (rgba(32,157,215,0.3)). Sci-fi / modern trading feel, not flat traditional terminal.
- **D-04:** Text colors: primary #e6edf3 (off-white), muted #7d8590 (gray).
- **D-05:** Monospace font for data (prices, quantities, ticker symbols) -- JetBrains Mono or Fira Code. Clean sans-serif (Inter or system font) for labels and headers.
- **D-06:** Small colored dot (8-10px circle) with text label, right-aligned in header. Green dot + "LIVE" when connected, yellow dot + "CONNECTING" when reconnecting, red dot + "OFFLINE" when disconnected.
- **D-07:** Must use `data-testid="connection-dot"` with text content including "LIVE" (per E2E test requirements).

### Claude's Discretion
- Zustand store architecture (number of stores, slice boundaries, selector patterns for per-ticker subscriptions)
- Frontend directory structure (component organization within `frontend/src/`)
- SSE connection management approach (custom hook vs service, reconnection logic)
- Exact panel proportions and grid sizing
- Loading skeleton design for empty placeholder panels

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTD-01 | User sees live price updates streaming at ~500ms intervals for all watched tickers | SSE EventSource connection to `/api/stream/prices`, Zustand price store with per-ticker selectors |
| RTD-03 | User sees connection status indicator (green=connected, yellow=reconnecting, red=disconnected) | ConnectionDot component subscribing to `connectionStatus` in price store; EventSource `onopen`/`onerror` handlers |
| UI-01 | App displays dark trading terminal theme (backgrounds #0d1117/#1a1a2e, muted gray borders) | Tailwind CSS v4 `@theme` directive with custom color tokens; panel glow CSS from UI-SPEC |
| UI-02 | App uses color scheme: accent yellow #ecad0a, blue #209dd7, purple #753991 | Defined as `@theme` color tokens in globals.css |
| UI-03 | Layout is data-dense and desktop-first (Bloomberg/terminal-inspired) | CSS Grid layout with fixed header, 2-column body grid, all panels as bordered placeholders |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Use `uv` as Python package manager (backend only -- not relevant for this frontend phase)
- Always use latest library APIs
- Do not overengineer; do not program defensively
- Work incrementally with small steps; validate each increment
- Favor short modules, short methods/functions; name things clearly
- Never use emojis in code, print statements, or logging
- Favor clear, concise docstring comments; be sparing with other comments

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dark theme styling | Browser / Client | -- | Pure CSS via Tailwind, no server involvement |
| SSE price stream consumption | Browser / Client | -- | EventSource is a browser API; data comes from backend SSE endpoint |
| Connection status tracking | Browser / Client | -- | Derived from EventSource readyState, displayed in UI |
| Price state management | Browser / Client | -- | Zustand store in browser memory; no persistence needed |
| Portfolio/cash display | Browser / Client | API / Backend | Client fetches from `GET /api/portfolio` on mount, backend provides data |
| Layout grid | Browser / Client | -- | Pure CSS Grid, client-side only |
| Font loading | CDN / Static | Browser / Client | `next/font/google` self-hosts fonts at build time; served as static assets |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.15 | React framework, static export | Latest 15.x stable; locked decision to avoid 16.x RSC static export bug [VERIFIED: npm registry] |
| React | 19.x | UI rendering | Peer dependency of Next.js 15.5.x [VERIFIED: npm view next@15.5.15 peerDependencies] |
| React DOM | 19.x | DOM rendering | Peer dependency of Next.js 15.5.x [VERIFIED: npm view next@15.5.15 peerDependencies] |
| TypeScript | 5.x | Type safety | Next.js 15 ships with TS 5 support [VERIFIED: npm registry] |
| Tailwind CSS | 4.2.2 | Utility-first CSS, dark theme | CSS-first config via `@theme` directive; locked decision [VERIFIED: npm registry] |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for Tailwind v4 | Required integration for Next.js [VERIFIED: npm registry, official docs] |
| Zustand | 5.0.12 | Client state management | Locked decision: 5 stores for 2Hz price updates; minimal boilerplate, selector-based re-renders [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postcss | latest | CSS processing | Required by @tailwindcss/postcss [CITED: tailwindcss.com/docs/guides/nextjs] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context | Context causes full subtree re-renders on every state change -- unsuitable for 2Hz updates |
| Tailwind CSS v4 | Tailwind CSS v3 | v3 uses JS config file; v4 uses CSS-first `@theme` which is simpler and aligned with project decision |
| Next.js 16 | Next.js 15 | 16 has RSC static export bug per project research; 15.5.x is stable for `output: 'export'` |

**Installation:**
```bash
# Scaffold project (no --tailwind flag, it installs v3)
npx create-next-app@15 frontend --typescript --eslint --app --no-src-dir --no-import-alias

# Install Tailwind CSS v4
cd frontend
npm install tailwindcss @tailwindcss/postcss postcss

# Install Zustand
npm install zustand
```

**Note on --no-src-dir:** The UI-SPEC says "component organization within `frontend/src/`" implying a src directory is expected. Use `--src-dir` flag instead:
```bash
npx create-next-app@15 frontend --typescript --eslint --app --src-dir --no-import-alias
```

**Version verification:**
- next@15.5.15: verified 2026-04-20 via npm registry [VERIFIED: npm registry]
- tailwindcss@4.2.2: verified 2026-04-20 via npm registry [VERIFIED: npm registry]
- zustand@5.0.12: verified 2026-04-20 via npm registry [VERIFIED: npm registry]
- @tailwindcss/postcss@4.2.2: verified 2026-04-20 via npm registry [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client)
  |
  +-- Next.js Static Export (HTML/CSS/JS served by FastAPI)
  |     |
  |     +-- RootLayout (app/layout.tsx)
  |           |
  |           +-- AppShell (client component)
  |                 |
  |                 +-- Header
  |                 |     +-- Logo ("Fin" + "Ally")
  |                 |     +-- Total Value (from portfolioStore)
  |                 |     +-- Cash Balance (from portfolioStore)
  |                 |     +-- ConnectionDot (from priceStore.connectionStatus)
  |                 |     +-- Chat Toggle Button
  |                 |
  |                 +-- Grid Body (CSS Grid)
  |                 |     +-- PlaceholderPanel (Watchlist)
  |                 |     +-- PlaceholderPanel (Chart)
  |                 |     +-- PlaceholderPanel (Positions)
  |                 |     +-- PlaceholderPanel (Heatmap)
  |                 |     +-- PlaceholderPanel (P&L)
  |                 |     +-- TradeBar (disabled placeholder)
  |                 |
  |                 +-- ChatDrawer (collapsed by default, visible for E2E)
  |
  +-- Zustand Stores (in-memory)
  |     +-- usePriceStore { prices: Record<string, PriceData>, connectionStatus }
  |     +-- usePortfolioStore { cashBalance, totalValue, positions }
  |     +-- useWatchlistStore { tickers }  (created but not used until Phase 2)
  |
  +-- SSE Connection (EventSource)
        |
        +--[onopen]--> priceStore.setConnectionStatus("connected")
        +--[onmessage]--> priceStore.updatePrices(parsed JSON)
        +--[onerror]--> priceStore.setConnectionStatus("reconnecting"|"disconnected")
        |
        v
  Backend (FastAPI, port 8000)
    GET /api/stream/prices  --> SSE stream (JSON per event, all tickers)
    GET /api/portfolio      --> { cash_balance, positions, total_value }
    GET /api/watchlist      --> [ { ticker, price, ... } ]
```

### Recommended Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # RootLayout: fonts, metadata, global CSS import
│   │   ├── page.tsx           # Home page: renders AppShell
│   │   └── globals.css        # Tailwind import + @theme + custom CSS
│   ├── components/
│   │   ├── app-shell.tsx      # Main layout: header + grid + chat drawer
│   │   ├── header.tsx         # Logo, portfolio values, connection dot
│   │   ├── connection-dot.tsx # SSE status indicator
│   │   ├── placeholder-panel.tsx  # Reusable bordered placeholder
│   │   ├── trade-bar.tsx      # Disabled trade inputs placeholder
│   │   ├── chat-drawer.tsx    # Collapsible right-side panel
│   │   └── chat-input.tsx     # Chat text input (disabled in Phase 1)
│   ├── stores/
│   │   ├── price-store.ts     # SSE price data + connection status
│   │   ├── portfolio-store.ts # Cash balance, total value, positions
│   │   └── watchlist-store.ts # Ticker list (stub for Phase 2)
│   ├── hooks/
│   │   └── use-sse.ts         # EventSource connection management hook
│   └── types/
│       └── market.ts          # TypeScript types mirroring backend models
├── public/                    # Static assets
├── next.config.ts             # output: 'export'
├── postcss.config.mjs         # @tailwindcss/postcss plugin
├── tsconfig.json              # TypeScript config
└── package.json
```

### Pattern 1: Zustand Store with Per-Ticker Selectors

**What:** Create a price store where individual components can subscribe to a single ticker's price without re-rendering when other tickers update.

**When to use:** Any component displaying a single ticker's data (watchlist rows in Phase 2, position rows in Phase 3).

**Example:**
```typescript
// Source: https://zustand.docs.pmnd.rs/guides/beginner-typescript
// stores/price-store.ts
'use client'

import { create } from 'zustand'

interface PriceData {
  ticker: string
  price: number
  previous_price: number
  timestamp: number
  change: number
  change_percent: number
  direction: 'up' | 'down' | 'flat'
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

interface PriceState {
  prices: Record<string, PriceData>
  connectionStatus: ConnectionStatus
  updatePrices: (data: Record<string, PriceData>) => void
  setConnectionStatus: (status: ConnectionStatus) => void
}

export const usePriceStore = create<PriceState>()((set) => ({
  prices: {},
  connectionStatus: 'disconnected',
  updatePrices: (data) =>
    set((state) => ({
      prices: { ...state.prices, ...data },
    })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}))

// Per-ticker selector -- component only re-renders when THIS ticker changes
export const useTickerPrice = (ticker: string) =>
  usePriceStore((state) => state.prices[ticker])

// Connection status selector
export const useConnectionStatus = () =>
  usePriceStore((state) => state.connectionStatus)
```

### Pattern 2: SSE Connection Hook with Auto-Reconnect

**What:** Custom React hook that manages an EventSource connection, parsing incoming price data and updating the Zustand store.

**When to use:** Mount once at the app shell level; runs for the lifetime of the page.

**Example:**
```typescript
// hooks/use-sse.ts
'use client'

import { useEffect, useRef } from 'react'
import { usePriceStore } from '@/stores/price-store'

export function useSSE() {
  const updatePrices = usePriceStore((s) => s.updatePrices)
  const setConnectionStatus = usePriceStore((s) => s.setConnectionStatus)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/stream/prices')
    esRef.current = es

    es.onopen = () => {
      setConnectionStatus('connected')
    }

    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      updatePrices(data)
      // First message also confirms connection
      setConnectionStatus('connected')
    }

    es.onerror = () => {
      if (es.readyState === EventSource.CONNECTING) {
        setConnectionStatus('reconnecting')
      } else if (es.readyState === EventSource.CLOSED) {
        setConnectionStatus('disconnected')
      }
    }

    return () => {
      es.close()
    }
  }, [updatePrices, setConnectionStatus])
}
```

### Pattern 3: Tailwind v4 Theme Configuration

**What:** Define the full dark theme color palette and fonts using Tailwind CSS v4's `@theme` directive in CSS.

**When to use:** In `globals.css`, replacing JavaScript configuration.

**Example:**
```css
/* Source: https://tailwindcss.com/docs/theme */
/* app/globals.css */
@import 'tailwindcss';

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
}

@theme {
  --color-bg-primary: #0d1117;
  --color-bg-panel: #161b22;
  --color-text-primary: #e6edf3;
  --color-text-muted: #7d8590;
  --color-accent-yellow: #ecad0a;
  --color-accent-blue: #209dd7;
  --color-accent-purple: #753991;
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-danger: #f85149;
  --color-border-glow: rgba(32, 157, 215, 0.15);
  --color-border-subtle: rgba(125, 133, 144, 0.2);
}
```

### Pattern 4: Next.js Static Export Configuration

**What:** Configure Next.js for static HTML/CSS/JS output with no server runtime.

**When to use:** Required for this project -- FastAPI serves the static export.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/static-exports
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
}

export default nextConfig
```

### Pattern 5: Font Loading with next/font/google + Tailwind v4

**What:** Self-host Google Fonts via Next.js, expose as CSS variables, map to Tailwind theme.

**When to use:** In root layout to make fonts available app-wide.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/components/font
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg-primary text-text-primary font-sans">
        {children}
      </body>
    </html>
  )
}
```

### Anti-Patterns to Avoid

- **Subscribing to entire price store:** Never do `const state = usePriceStore()` in a component -- it re-renders on every 500ms price update for all tickers. Always use a selector: `usePriceStore((s) => s.prices[ticker])`.
- **Using React Context for high-frequency data:** React Context triggers re-renders for all consumers on any state change. Zustand with selectors is the correct tool for 2Hz price streams.
- **Server Components with client state:** In static export mode, all components using hooks (useState, useEffect, Zustand) must have the `'use client'` directive. The root layout can be a server component, but anything interactive must be a client component.
- **Using `tailwind.config.js` with Tailwind v4:** The v4 CSS-first approach uses `@theme` in CSS. A JS config file is not needed and would cause confusion.
- **Fetching data in Server Components:** With `output: 'export'`, there is no server runtime. All data fetching must happen client-side in `useEffect` or via Zustand actions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE reconnection logic | Custom retry/backoff | Native `EventSource` built-in retry | EventSource auto-reconnects; backend sends `retry: 1000` directive |
| State management with selectors | Custom pub/sub system | Zustand `create` + selector functions | Zustand handles subscription granularity, equality checks, React integration |
| Font loading/optimization | Manual @font-face rules | `next/font/google` | Handles self-hosting, font-display, variable fonts, zero layout shift |
| CSS processing pipeline | Manual PostCSS setup | `@tailwindcss/postcss` | Single plugin replaces postcss + autoprefixer + tailwind config |
| Number formatting | Manual string manipulation | `Intl.NumberFormat` | Handles locale-aware currency formatting with commas, decimal places |

**Key insight:** The browser's native EventSource API handles reconnection automatically -- the backend already sends `retry: 1000` in the SSE stream header. Do not build custom reconnection logic; just listen for `onopen`, `onmessage`, and `onerror` events and update state accordingly.

## Common Pitfalls

### Pitfall 1: Static Export + Server Components Confusion
**What goes wrong:** Developers try to use server-side features (data fetching in server components, API routes, middleware) with `output: 'export'`, which produces only static HTML/JS/CSS.
**Why it happens:** Next.js App Router defaults to server components; with static export, they are rendered at build time only.
**How to avoid:** Mark all components that use hooks, browser APIs, or dynamic data with `'use client'`. The root layout can stay as a server component (it renders once at build time). Data fetching happens client-side via `useEffect` or store actions.
**Warning signs:** Build errors about "dynamic server usage" or "headers/cookies not available in static export."

### Pitfall 2: Zustand Full-Store Subscription
**What goes wrong:** Components re-render 2 times per second because they subscribe to the entire price store instead of a specific ticker.
**Why it happens:** Using `usePriceStore()` without a selector returns the entire state object, which changes on every SSE message.
**How to avoid:** Always use selectors: `usePriceStore((s) => s.prices['AAPL'])`. For derived arrays/objects, use `useShallow` from `zustand/react/shallow`.
**Warning signs:** React DevTools showing excessive re-renders; UI lag/stuttering.

### Pitfall 3: Tailwind v4 @theme vs :root Variables
**What goes wrong:** Custom CSS variables defined in `:root` don't generate Tailwind utility classes. Writing `--color-primary: #209dd7` in `:root` means `bg-primary` won't work.
**Why it happens:** Tailwind v4 only generates utilities from variables declared in `@theme` blocks, not arbitrary CSS custom properties.
**How to avoid:** Use `@theme { --color-*: ... }` for any value that needs corresponding utility classes. Use `:root` only for variables that don't need utilities.
**Warning signs:** Tailwind utility classes like `bg-accent-blue` not working despite the CSS variable being defined.

### Pitfall 4: Chat Panel Visibility vs E2E Tests
**What goes wrong:** E2E test `startup.spec.ts` line 48 checks `expect(page.getByTestId("chat-panel")).toBeVisible()`. If the chat panel starts collapsed (CONTEXT.md D-02), the test fails.
**Why it happens:** Conflict between design decision (collapsed by default) and E2E test expectation (visible on load).
**How to avoid:** Per UI-SPEC resolution: render the chat panel visible by default in Phase 1, but make it closable/collapsible. The toggle button allows hiding it. This satisfies both the design intent (it CAN be collapsed) and the E2E test (it IS visible on load).
**Warning signs:** E2E test `startup.spec.ts` "AI chat panel is visible" failing.

### Pitfall 5: next/font CSS Variables + Tailwind v4 Integration
**What goes wrong:** Font CSS variables from `next/font/google` are set on the `<html>` element, but Tailwind v4's `@theme` directive doesn't resolve `var()` references correctly.
**Why it happens:** `@theme` generates static CSS at build time; `var()` references are runtime values that `@theme` can't resolve statically.
**How to avoid:** Use `@theme inline` (not `@theme`) when mapping font CSS variables: `@theme inline { --font-sans: var(--font-inter); }`. The `inline` keyword tells Tailwind to inline the variable reference.
**Warning signs:** `font-sans` and `font-mono` utility classes not applying the correct font.

### Pitfall 6: EventSource Error State Ambiguity
**What goes wrong:** Treating all `onerror` events as "disconnected" when the browser may be auto-reconnecting.
**Why it happens:** EventSource fires `onerror` both when it's reconnecting (readyState = CONNECTING) and when it's permanently closed (readyState = CLOSED).
**How to avoid:** Check `es.readyState` inside the `onerror` handler: `EventSource.CONNECTING` (0) means reconnecting, `EventSource.CLOSED` (2) means disconnected.
**Warning signs:** Connection indicator showing "OFFLINE" briefly during normal reconnection attempts.

## Code Examples

### TypeScript Types Mirroring Backend Models

```typescript
// Source: backend/app/models.py and backend/app/market/models.py
// types/market.ts

export interface PriceData {
  ticker: string
  price: number
  previous_price: number
  timestamp: number
  change: number
  change_percent: number
  direction: 'up' | 'down' | 'flat'
}

export interface PositionData {
  ticker: string
  quantity: number
  avg_cost: number
  current_price: number | null
  unrealized_pnl: number | null
  pct_change: number | null
}

export interface PortfolioData {
  cash_balance: number
  positions: PositionData[]
  total_value: number
}

export interface WatchlistEntryData {
  ticker: string
  price: number | null
  previous_price: number | null
  change_percent: number | null
  direction: string | null
}
```

### Portfolio Store with Fetch-on-Mount

```typescript
// stores/portfolio-store.ts
'use client'

import { create } from 'zustand'
import type { PortfolioData, PositionData } from '@/types/market'

interface PortfolioState {
  cashBalance: number
  totalValue: number
  positions: PositionData[]
  fetchPortfolio: () => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  cashBalance: 0,
  totalValue: 0,
  positions: [],
  fetchPortfolio: async () => {
    const res = await fetch('/api/portfolio')
    const data: PortfolioData = await res.json()
    set({
      cashBalance: data.cash_balance,
      totalValue: data.total_value,
      positions: data.positions,
    })
  },
}))
```

### Connection Dot Component

```typescript
// components/connection-dot.tsx
'use client'

import { useConnectionStatus } from '@/stores/price-store'

const STATUS_CONFIG = {
  connected: { color: 'bg-success', label: 'LIVE' },
  reconnecting: { color: 'bg-warning', label: 'CONNECTING' },
  disconnected: { color: 'bg-danger', label: 'OFFLINE' },
} as const

export function ConnectionDot() {
  const status = useConnectionStatus()
  const config = STATUS_CONFIG[status]

  return (
    <div data-testid="connection-dot" className="flex items-center gap-1">
      <span className={`size-2 rounded-full ${config.color}`} />
      <span className="text-xs font-normal text-text-muted">{config.label}</span>
    </div>
  )
}
```

### PostCSS Configuration

```javascript
// Source: https://tailwindcss.com/docs/guides/nextjs
// postcss.config.mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

### Number Formatting Utility

```typescript
// Using built-in Intl.NumberFormat -- do NOT hand-roll
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js (JS) | @theme directive (CSS) | Tailwind CSS v4 (Jan 2025) | No more JS config file; theme defined in CSS with @theme blocks |
| @tailwind directives | @import 'tailwindcss' | Tailwind CSS v4 (Jan 2025) | Single CSS import replaces three @tailwind directives |
| postcss + autoprefixer | @tailwindcss/postcss | Tailwind CSS v4 (Jan 2025) | Single PostCSS plugin; autoprefixer no longer needed separately |
| Zustand v4 create() | Zustand v5 create() | Zustand v5 (2024) | Simplified API; `useShallow` moved to `zustand/react/shallow` |
| React 18 | React 19 | React 19 (Dec 2024) | Used with Next.js 15; no breaking changes for this use case |

**Deprecated/outdated:**
- `tailwind.config.js` / `tailwind.config.ts`: Not needed with Tailwind CSS v4. Use `@theme` in CSS instead.
- `@tailwind base/components/utilities`: Replaced by `@import 'tailwindcss'` in v4.
- `autoprefixer` PostCSS plugin: Built into `@tailwindcss/postcss` in v4.
- `create-next-app --tailwind` flag: Installs Tailwind v3, not v4. Install v4 manually after scaffolding.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--no-import-alias` flag is available on create-next-app@15 | Standard Stack / Installation | Minor -- can manually edit tsconfig.json to remove alias |
| A2 | `JetBrains_Mono` is available in next/font/google | Code Examples / Font Loading | Low -- confirmed via Google Fonts; could fall back to Fira_Code |
| A3 | The chat panel should be visible by default (not collapsed) to satisfy E2E tests | Common Pitfalls / Pitfall 4 | Medium -- if collapsed, startup.spec.ts "AI chat panel" test will fail; UI-SPEC already resolves this |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **src directory convention**
   - What we know: CONTEXT.md mentions "component organization within `frontend/src/`" suggesting a src directory is expected. `create-next-app` has a `--src-dir` flag.
   - What's unclear: Whether to use `--src-dir` or put everything directly under `frontend/app/`.
   - Recommendation: Use `--src-dir` to match the CONTEXT.md expectation and keep a clean separation between framework files (next.config.ts, package.json) and source code.

2. **Chat panel initial visibility for E2E**
   - What we know: CONTEXT.md D-02 says collapsed by default. E2E `startup.spec.ts` line 48 expects `chat-panel` to be visible. UI-SPEC resolves: "render visible by default, but make closable."
   - What's unclear: Nothing -- UI-SPEC resolution is clear.
   - Recommendation: Follow UI-SPEC: visible by default, closable via toggle.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js build/dev | Yes | v25.9.0 | -- |
| npm | Package installation | Yes | 11.12.1 | -- |
| Docker | E2E testing (later phases) | Yes | 29.4.0 | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.48.0 (E2E, in `test/`) |
| Config file | `test/playwright.config.ts` |
| Quick run command | `cd test && npx playwright test specs/startup.spec.ts` |
| Full suite command | `cd test && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTD-01 | SSE price updates streaming at ~500ms | E2E | `cd test && npx playwright test specs/sse-resilience.spec.ts` | Yes |
| RTD-03 | Connection indicator shows LIVE/CONNECTING/OFFLINE | E2E | `cd test && npx playwright test specs/startup.spec.ts -g "SSE connection indicator"` | Yes |
| UI-01 | Dark trading terminal theme | E2E / manual | `cd test && npx playwright test specs/startup.spec.ts -g "page loads"` | Partial (checks header, not colors) |
| UI-02 | Color scheme applied | Manual-only | Visual inspection | N/A |
| UI-03 | Data-dense desktop layout | E2E | `cd test && npx playwright test specs/startup.spec.ts -g "trade bar"` | Partial (checks visibility) |

### Sampling Rate
- **Per task commit:** `cd test && npx playwright test specs/startup.spec.ts --timeout 15000` (requires app running)
- **Per wave merge:** `cd test && npx playwright test` (full E2E suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- Note: E2E tests require the full Docker container running (backend + frontend). Frontend unit tests would need a separate test framework (e.g., Vitest + React Testing Library) but are not required for Phase 1 -- all Phase 1 requirements are covered by existing E2E specs.
- The `watchlist-row-{TICKER}` tests in startup.spec.ts and sse-resilience.spec.ts will fail until Phase 2 -- this is expected and documented in the UI-SPEC.

## Security Domain

This phase has minimal security surface:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in project (single-user by design) |
| V3 Session Management | No | No sessions (stateless static app) |
| V4 Access Control | No | No authorization needed |
| V5 Input Validation | No | No user input processed in Phase 1 (trade bar disabled) |
| V6 Cryptography | No | No secrets handled client-side |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSE stream injection | Tampering | Same-origin policy; all API calls to same host |
| XSS via price data | Tampering | React auto-escapes JSX; no `dangerouslySetInnerHTML` |

## Sources

### Primary (HIGH confidence)
- [/websites/nextjs] - Static export configuration, font loading, client components, Tailwind integration [Context7]
- [/websites/zustand_pmnd_rs] - Store creation, selectors, useShallow, TypeScript patterns [Context7]
- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) - @theme directive, CSS-first configuration, namespaces [Official docs]
- [tailwindcss.com/docs/guides/nextjs](https://tailwindcss.com/docs/guides/nextjs) - Tailwind v4 + Next.js installation steps [Official docs]
- npm registry - Version verification for next, zustand, tailwindcss, @tailwindcss/postcss [VERIFIED]

### Secondary (MEDIUM confidence)
- backend/app/models.py, backend/app/market/models.py, backend/app/market/stream.py - API response shapes and SSE format [Codebase]
- test/specs/startup.spec.ts, test/specs/sse-resilience.spec.ts - E2E test contracts and data-testid requirements [Codebase]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry; Next.js 15 static export and Tailwind v4 are well-documented
- Architecture: HIGH - Zustand selector pattern and EventSource API are established patterns with official documentation
- Pitfalls: HIGH - Pitfalls derived from official documentation (static export limitations, Tailwind v4 migration), E2E test contracts (codebase inspection), and Zustand docs

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable stack, 30-day validity)
