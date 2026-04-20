# Project Research Summary

**Project:** FinAlly -- AI Trading Workstation
**Domain:** Real-time financial dashboard / trading terminal frontend
**Researched:** 2026-04-20
**Confidence:** HIGH

## Executive Summary

FinAlly's frontend is a single-page trading terminal that must render live-streaming price data from SSE, support manual and AI-driven trading, and display portfolio visualizations (heatmap, P&L chart, sparklines). The FastAPI backend is complete -- the build task is a Next.js 15 static export served by that backend.

The defining architectural constraint is that price data arrives at ~500ms intervals across 10+ tickers. This frequency dictates every state management and rendering decision. Any approach that routes price updates through React Context or triggers full-tree re-renders will produce a janky, unusable UI.

The recommended approach: five independent Zustand stores with selector subscriptions; a single root-level `useSSE` hook managing EventSource lifecycle; TradingView Lightweight Charts (canvas) for the selected ticker chart using imperative `store.subscribe()` bypassing React's render cycle; Recharts (SVG, declarative) for treemap heatmap and P&L line chart; custom SVG `<polyline>` for sparklines.

## Key Findings

### Recommended Stack

**Core technologies:**
- Next.js 15.5.x (not 16 -- RSC static export bug #85374) -- static export SPA shell
- Tailwind CSS 4.2.x -- CSS-first config, `@tailwindcss/postcss`
- Zustand -- selector-based subscriptions prevent re-render cascade at 2Hz
- lightweight-charts 5.1.0 -- canvas-based, TradingView professional aesthetic
- Recharts 3.8.x -- built-in Treemap + LineChart for portfolio visualizations
- Custom SVG polyline -- sparklines, ~30 lines, zero dependencies

### Expected Features

**Must have (table stakes):**
- SSE connection + live watchlist + flash animations
- Connection status indicator
- Portfolio header (total value + cash)
- Trade bar (ticker, quantity, buy/sell)
- Positions table with live P&L
- Watchlist add/remove
- Main chart area (Lightweight Charts)
- AI chat panel
- Dark terminal theme
- Watchlist click-to-trade

**Should have (competitive):**
- SVG sparklines in watchlist rows
- Portfolio heatmap treemap
- P&L line chart
- Inline trade confirmation cards in chat
- Auto-refresh portfolio after AI trade

**Defer (v2+):**
- Candlestick charts (requires OHLC backend)
- Streaming AI responses (Cerebras fast enough)
- Draggable/resizable panels
- Mobile-responsive layout

### Architecture Approach

Single-page Next.js static export. Five domain-separated Zustand stores (price, portfolio, watchlist, chat, UI). Single app-level EventSource hook writes to priceStore. Components subscribe via selectors -- GOOGL update does not re-render AAPL row. Main chart subscribes outside React cycle for imperative canvas updates.

**Major components:**
1. SSE Hook + Price Store -- data pipeline foundation
2. Watchlist Panel -- most complex UI (flash, sparklines, selection)
3. Trade Bar + Positions -- order entry and portfolio display
4. Visualization Layer -- heatmap treemap, main chart, P&L chart
5. Chat Panel -- AI integration with cross-store side effects

### Critical Pitfalls

1. **SSE connection leak** -- missing `es.close()` in useEffect cleanup; React 18 strict mode doubles the problem. Must be correct from day one.
2. **React Context for prices** -- full-tree re-renders at 2/sec. Use Zustand with selectors. Recovery cost: HIGH.
3. **Flash animation race** -- `setTimeout` races with 500ms updates. Use CSS `@keyframes` + `onAnimationEnd`.
4. **data-testid contract** -- 25+ specific testids required by E2E tests; deviations cause silent failures.
5. **Docker COPY path** -- must copy from `out/` not `.next/`. Silent failure: container starts, assets 404.

## Implications for Roadmap

### Phase 1: Project Scaffold + State Foundation
**Rationale:** Everything depends on the data pipeline. SSE leak and Context pitfalls have HIGH recovery cost if deferred.
**Delivers:** Next.js config, Tailwind dark theme, 5 Zustand stores, useSSE hook, connection indicator, Docker pipeline validation.
**Addresses:** SSE connection, connection status indicator
**Avoids:** SSE leak pitfall, Context performance pitfall

### Phase 2: Watchlist Panel + Portfolio Header
**Rationale:** Most testid-dense component; flash animation pattern must be established here.
**Delivers:** Live prices, flash animations, SVG sparklines, add/remove controls, header values.
**Addresses:** Watchlist features, sparklines, header display
**Avoids:** Flash animation race pitfall

### Phase 3: Trade Bar + Positions Table
**Rationale:** Standard patterns, no major pitfalls. Requires working prices from Phase 2.
**Delivers:** Trade execution UI, portfolio refresh, positions with live P&L, click-to-trade.
**Addresses:** Trading features, positions display

### Phase 4: Visualizations (Heatmap + Charts)
**Rationale:** Requires positions data from Phase 3. Most complex rendering logic.
**Delivers:** Recharts Treemap heatmap, Lightweight Charts main price chart, P&L line chart.
**Addresses:** Portfolio heatmap, main chart, P&L chart
**Avoids:** Treemap re-layout performance trap

### Phase 5: AI Chat Panel
**Rationale:** Integrates all stores (triggers portfolio + watchlist refresh on AI actions). Build last to avoid coordination issues.
**Delivers:** Message history, loading state, inline confirmations, cross-store side effects.
**Addresses:** AI chat, inline trade confirmations

### Phase 6: Docker Build + Scripts + E2E Validation
**Rationale:** Full integration validation. Confirms static export serves correctly.
**Delivers:** Multi-stage Dockerfile, start/stop scripts, docker-compose.yml, E2E green.
**Addresses:** Deployment, production readiness
**Avoids:** Docker COPY path pitfall

### Phase Ordering Rationale

- Data flow dependencies: SSE -> prices -> watchlist -> trading -> visualizations -> chat
- E2E contract: each phase adds testids incrementally; can validate progressively
- Risk front-loading: highest-recovery-cost pitfalls (SSE, state management) addressed in Phase 1

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4:** Recharts Treemap `customContent` prop for P&L-colored tiles; Lightweight Charts v5 API
- **Phase 5:** Backend ChatOut schema field names for inline confirmation rendering

Phases with standard patterns (skip research-phase):
- **Phase 1:** Next.js + Tailwind v4 + Zustand fully documented
- **Phase 2:** Flash animation pattern fully specified in PITFALLS.md
- **Phase 3:** Form submission + REST + state refresh is standard React
- **Phase 6:** Docker COPY path is known; E2E test contract is in test specs

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions from official docs; Next.js 16 exclusion confirmed |
| Features | HIGH | E2E test specs are binding contract |
| Architecture | HIGH | Zustand + imperative canvas from official sources |
| Pitfalls | HIGH | All based on documented behaviors with reproduction conditions |

**Overall confidence:** HIGH

### Gaps to Address

- Recharts Treemap P&L color mapping: implementation decision needed during Phase 4 planning
- ChatOut schema field names: verify against backend before Phase 5
- Tailwind v4 `@theme` syntax for custom colors: confirm exact syntax before Phase 1

## Sources

### Primary (HIGH confidence)
- Next.js docs (static export configuration, v15.5.x)
- Zustand docs (selector pattern, subscribe API)
- TradingView Lightweight Charts docs (v5 React integration)
- Existing E2E test specs (test/specs/*.spec.ts)
- Backend source code (app/routes/, app/market/)

### Secondary (MEDIUM confidence)
- Recharts docs (Treemap customContent prop)
- Tailwind CSS v4 migration guide

---
*Research completed: 2026-04-20*
*Ready for roadmap: yes*
