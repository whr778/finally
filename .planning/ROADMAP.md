# Roadmap: FinAlly AI Trading Workstation

## Overview

Build the Next.js frontend for FinAlly -- a trading terminal UI that consumes the existing FastAPI backend. The work follows the data flow: establish the SSE pipeline and state stores first, then build UI layers that consume that data (watchlist, trading, visualizations), integrate AI chat last (it touches all stores), and finally package everything for Docker deployment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Data Pipeline** - Next.js scaffold, Tailwind dark theme, Zustand stores, SSE connection, connection indicator
- [ ] **Phase 2: Watchlist & Header** - Live price watchlist with flash animations, sparklines, add/remove, portfolio header values
- [ ] **Phase 3: Trading & Positions** - Trade bar, buy/sell execution, positions table with live P&L
- [ ] **Phase 4: Visualizations & Charts** - Portfolio heatmap treemap, main ticker chart, P&L line chart
- [ ] **Phase 5: AI Chat Panel** - Message history, loading state, inline confirmations, auto-trade execution
- [ ] **Phase 6: Docker & Deployment** - Multi-stage Dockerfile, start/stop scripts, docker-compose, static serving

## Phase Details

### Phase 1: Foundation & Data Pipeline
**Goal**: Users see a dark terminal-themed app that connects to the SSE stream and displays real-time connection status
**Depends on**: Nothing (first phase)
**Requirements**: RTD-01, RTD-03, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. App renders in browser with dark trading terminal theme (correct background colors, muted borders)
  2. App connects to /api/stream/prices and receives live price data at ~500ms intervals
  3. Connection status indicator shows green when connected, yellow when reconnecting, red when disconnected
  4. Price data flows into Zustand store and components can subscribe to individual ticker updates without full re-renders
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md -- Scaffold Next.js project, Tailwind v4 dark theme, TypeScript types, Zustand stores, SSE hook
- [x] 01-02-PLAN.md -- UI components (ConnectionDot, Header, AppShell, PlaceholderPanels, TradeBar, ChatDrawer), layout wiring
**UI hint**: yes

### Phase 2: Watchlist & Header
**Goal**: Users see a live-updating watchlist with price animations and can manage their watched tickers
**Depends on**: Phase 1
**Requirements**: RTD-02, RTD-04, WATCH-01, WATCH-02, WATCH-03, WATCH-04, PORT-02, PORT-03
**Success Criteria** (what must be TRUE):
  1. Watchlist displays all tickers with current price and change % since stream start
  2. Prices flash green (uptick) or red (downtick) with ~500ms fade animation on each update
  3. SVG sparkline mini-charts appear beside each ticker, accumulating price history since page load
  4. User can add and remove tickers from the watchlist
  5. Header displays live-updating total portfolio value and cash balance
**Plans:** 2 plans
Plans:
- [x] 02-01-PLAN.md -- Watchlist store enhancements, flash animation CSS, SVG sparkline component
- [x] 02-02-PLAN.md -- WatchlistRow, TickerInput, WatchlistPanel components, AppShell/TradeBar wiring, visual checkpoint
**UI hint**: yes

### Phase 3: Trading & Positions
**Goal**: Users can execute trades and see their portfolio positions with real-time P&L
**Depends on**: Phase 2
**Requirements**: TRADE-01, TRADE-02, TRADE-03, TRADE-04, TRADE-05, PORT-01
**Success Criteria** (what must be TRUE):
  1. Trade bar accepts ticker and quantity input with buy and sell buttons
  2. User can execute buy and sell market orders (including fractional shares) with instant fill
  3. Cash balance updates immediately after trade execution
  4. Positions table shows ticker, quantity, avg cost, current price, unrealized P&L, and % change
  5. Clicking a ticker in the watchlist populates the trade bar
**Plans**: TBD
**UI hint**: yes

### Phase 4: Visualizations & Charts
**Goal**: Users see rich portfolio visualizations and a detailed price chart for the selected ticker
**Depends on**: Phase 3
**Requirements**: PORT-04, PORT-05, UI-04
**Success Criteria** (what must be TRUE):
  1. Portfolio heatmap (treemap) displays positions sized by portfolio weight and colored by P&L (green=profit, red=loss)
  2. P&L line chart shows total portfolio value over time using snapshot history from the backend
  3. Main chart area displays a larger price chart for the currently selected ticker (via Lightweight Charts)
**Plans**: TBD
**UI hint**: yes

### Phase 5: AI Chat Panel
**Goal**: Users can converse with the AI assistant and have it execute trades and manage the watchlist
**Depends on**: Phase 4
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User can type and send messages to the AI assistant
  2. Scrolling conversation history displays all messages
  3. Loading indicator appears while waiting for AI response
  4. Trade executions and watchlist changes from AI are shown inline as confirmation cards
  5. AI-triggered trades actually execute (portfolio and watchlist refresh after AI actions)
**Plans**: TBD
**UI hint**: yes

### Phase 6: Docker & Deployment
**Goal**: The entire app builds and runs in a single Docker container with one command
**Depends on**: Phase 5
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. Multi-stage Dockerfile builds frontend (Node) and copies static export into Python runtime stage
  2. FastAPI serves the static Next.js export and all API routes on port 8000
  3. start_mac.sh / stop_mac.sh scripts build, run, and stop the container (macOS/Linux)
  4. start_windows.ps1 / stop_windows.ps1 scripts build, run, and stop the container (Windows)
  5. docker-compose.yml provides a convenience wrapper that mounts the db volume and passes env vars
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data Pipeline | 2/2 | Planned | - |
| 2. Watchlist & Header | 0/2 | Planned | - |
| 3. Trading & Positions | 0/? | Not started | - |
| 4. Visualizations & Charts | 0/? | Not started | - |
| 5. AI Chat Panel | 0/? | Not started | - |
| 6. Docker & Deployment | 0/? | Not started | - |
