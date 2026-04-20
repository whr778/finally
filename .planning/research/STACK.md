# Technology Stack

**Project:** FinAlly Frontend -- AI Trading Workstation UI
**Researched:** 2026-04-20

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.x | Static export SPA framework | Stable static export (`output: 'export'`). Next.js 16 has a known RSC payload 404 bug in static exports (issue #85374). Since this is served by FastAPI as static files, 15.5.x is the safe, proven choice. Still supported through Oct 2026. | HIGH |
| React | 18.x | UI library | Next.js 15 ships with React 18. React 19 is Next.js 16 territory. React 18 is stable, well-documented, and all target libraries support it. | HIGH |
| TypeScript | 5.x | Type safety | Required by PLAN.md. Next.js 15 has excellent TypeScript support out of the box. | HIGH |

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.2.x | Utility-first CSS | Specified in PLAN.md. v4 is current stable (4.2.2 as of April 2026). CSS-first config -- no `tailwind.config.js`, just `@import "tailwindcss"` in globals.css. | HIGH |
| @tailwindcss/postcss | 4.2.x | PostCSS plugin | Required for Tailwind v4 + Next.js integration. Replaces the old `tailwindcss` PostCSS plugin from v3. | HIGH |

### Charting -- Financial Data

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| lightweight-charts | 5.1.0 | Main ticker chart (selected ticker detail view) | TradingView's canvas-based financial charting. Professional trading terminal look out of the box. Dark theme support, real-time data updates via `setData()` / `update()`. Used directly with `useRef`/`useEffect` -- no wrapper library needed (official React tutorial pattern). | HIGH |

### Charting -- General Data Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | 3.8.x | P&L line chart + portfolio treemap/heatmap | SVG-based, React-native declarative API. Built-in `Treemap` component with custom content rendering (needed for portfolio heatmap colored by P&L). Built-in `LineChart` for portfolio value over time. `ResponsiveContainer` for auto-sizing. | HIGH |

### Sparklines

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Custom SVG `<polyline>` | N/A | Watchlist mini-charts | Build a tiny (~30 line) custom component. The E2E tests expect an `<svg>` element inside each watchlist row. A hand-rolled `<svg><polyline>` from accumulated SSE price data is simpler, lighter, and more controllable than any library. No dependency needed for something this simple. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| postcss | 8.x | CSS processing pipeline | Required by @tailwindcss/postcss | HIGH |

### NOT Recommended

These were considered and explicitly rejected:

| Library | Why Not |
|---------|---------|
| Next.js 16 | Known RSC payload 404 bug in static exports (issue #85374). Single-page app mitigates this, but unnecessary risk for zero benefit. The project needs nothing from Next.js 16. |
| lightweight-charts-react-wrapper | Last published 2+ years ago, stuck on v4 API. The official TradingView React tutorial uses direct `useRef`/`useEffect` with v5 -- follow that pattern. |
| lightweight-charts-react-components | Third-party wrapper (v1.4.0). Adds abstraction over a library we only use in 1-2 components. Direct integration is cleaner and matches official docs. |
| react-sparklines | Last published 9 years ago. Works but unmaintained. A custom 30-line SVG component is better than depending on abandoned code. |
| D3.js directly | Overkill. Recharts wraps D3 internally. Using D3 directly for treemaps/line charts adds complexity with no benefit for this use case. |
| Chart.js / react-chartjs-2 | Not financial-chart-focused. Lightweight Charts gives the Bloomberg terminal aesthetic for free. Chart.js sparklines would be fine but we don't need another charting lib. |
| Zustand / Redux | Overkill for single-page, single-user app with 5-6 pieces of state. React Context + useReducer or simple useState + lifting state is sufficient. E2E tests don't test state management -- they test rendered output. |
| SWR / React Query | The data fetching pattern here is: (1) SSE stream (EventSource, not HTTP), (2) a few REST calls on trade/watchlist actions. Neither benefits from cache invalidation libraries. Plain `fetch` + `useEffect` is the right tool. |
| shadcn/ui | Adds a component library abstraction over Tailwind. This is a data-dense terminal UI with custom aesthetics -- prebuilt components would fight the design. Tailwind directly is better here. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 15 | Next.js 16 | RSC static export bug; no features needed from 16 |
| Framework | Next.js 15 | Vite + React | PLAN.md specifies Next.js; Dockerfile expects `npm run build` producing static export |
| Financial charts | Lightweight Charts 5 | Recharts | Recharts is SVG-based, not canvas. For a live-updating price chart with 100+ data points, canvas performs better. Lightweight Charts also provides the professional terminal look. |
| General charts | Recharts 3 | Lightweight Charts for everything | Lightweight Charts does not have a Treemap/heatmap component. Recharts fills this gap with its Treemap and LineChart. |
| Sparklines | Custom SVG | react-sparklines | Abandoned (9 years). Custom is trivial and dependency-free. |
| State | React Context/useState | Zustand | Unnecessary layer for this scale. Can add later if complexity warrants it. |
| Data fetching | Plain fetch | SWR/React Query | SSE + occasional REST doesn't benefit from these. Adds bundle weight and concepts for no gain. |

## Installation

```bash
# Initialize Next.js project (from frontend/ directory)
npx create-next-app@15 . --typescript --tailwind --eslint --app --no-src-dir

# Core dependencies
npm install lightweight-charts recharts

# Tailwind v4 (if not already set up by create-next-app)
npm install tailwindcss @tailwindcss/postcss postcss

# Dev dependencies (should be set up by create-next-app)
npm install -D typescript @types/react @types/node
```

### PostCSS Configuration

`postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### Next.js Configuration

`next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
}

export default nextConfig
```

### Global CSS

`app/globals.css`:
```css
@import "tailwindcss";
```

## Key Integration Patterns

### Lightweight Charts (Direct React Integration)

Use the official TradingView pattern -- `useRef` for DOM container, `useEffect` for lifecycle:

```typescript
import { createChart, LineSeries, ColorType } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

function PriceChart({ data, ticker }: { data: { time: number; value: number }[]; ticker: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0d1117' }, textColor: '#d1d5db' },
      width: containerRef.current.clientWidth,
      height: 300,
      grid: { vertLines: { color: '#1a1a2e' }, horzLines: { color: '#1a1a2e' } },
    });

    const series = chart.addSeries(LineSeries, { color: '#209dd7' });
    series.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => chart.applyOptions({ width: containerRef.current!.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} />;
}
```

### SSE Connection (EventSource)

```typescript
useEffect(() => {
  const es = new EventSource('/api/stream/prices');
  es.onmessage = (event) => {
    const prices = JSON.parse(event.data);
    // Update state with new prices
  };
  es.onerror = () => {
    // Update connection status indicator
  };
  return () => es.close();
}, []);
```

### Custom SVG Sparkline

```typescript
function Sparkline({ prices, width = 80, height = 24 }: { prices: number[]; width?: number; height?: number }) {
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices
    .map((p, i) => `${(i / (prices.length - 1)) * width},${height - ((p - min) / range) * height}`)
    .join(' ');
  return (
    <svg width={width} height={height}>
      <polyline fill="none" stroke="#209dd7" strokeWidth="1.5" points={points} />
    </svg>
  );
}
```

## Version Pinning Strategy

Pin major + minor in `package.json`, allow patch updates:

```json
{
  "dependencies": {
    "next": "~15.5.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lightweight-charts": "^5.1.0",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "tailwindcss": "^4.2.2",
    "@tailwindcss/postcss": "^4.2.2",
    "postcss": "^8.5.0",
    "typescript": "^5.7.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.0.0"
  }
}
```

## Sources

- Next.js 15 static export docs: https://nextjs.org/docs/app/guides/static-exports (HIGH confidence -- official docs)
- Next.js 16 RSC bug: https://github.com/vercel/next.js/issues/85374 (HIGH confidence -- official issue tracker)
- Next.js end-of-life: https://endoflife.date/nextjs (HIGH confidence -- version tracking)
- Lightweight Charts v5 React tutorial: https://tradingview.github.io/lightweight-charts/tutorials/react/simple (HIGH confidence -- official TradingView docs)
- Lightweight Charts v5 API: https://tradingview.github.io/lightweight-charts/docs (HIGH confidence -- official docs)
- Recharts Treemap: https://recharts.github.io/en-US/api/Treemap/ (HIGH confidence -- official docs)
- Recharts custom content treemap: https://recharts.github.io/en-US/examples/CustomContentTreemap/ (HIGH confidence -- official example)
- Tailwind CSS v4 + Next.js: https://tailwindcss.com/docs/guides/nextjs (HIGH confidence -- official guide)
- Tailwind CSS v4 release: https://tailwindcss.com/blog/tailwindcss-v4 (HIGH confidence -- official blog)
