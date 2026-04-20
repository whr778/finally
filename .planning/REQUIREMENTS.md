# Requirements: FinAlly AI Trading Workstation

**Defined:** 2026-04-20
**Core Value:** Users see live-updating prices and can trade a simulated portfolio through both manual controls and natural language AI commands

## v1 Requirements

### Real-Time Data

- [ ] **RTD-01**: User sees live price updates streaming at ~500ms intervals for all watched tickers
- [ ] **RTD-02**: User sees green/red flash animation on price change that fades over ~500ms
- [ ] **RTD-03**: User sees connection status indicator (green=connected, yellow=reconnecting, red=disconnected)
- [ ] **RTD-04**: User sees SVG sparkline mini-charts beside each ticker accumulated from SSE since page load

### Watchlist

- [ ] **WATCH-01**: User sees watchlist grid with ticker symbol, current price, and change % since stream start
- [ ] **WATCH-02**: User can add a ticker to the watchlist
- [ ] **WATCH-03**: User can remove a ticker from the watchlist
- [ ] **WATCH-04**: User can click a ticker in the watchlist to select it for the main chart

### Trading

- [ ] **TRADE-01**: User can enter a ticker and quantity in the trade bar
- [ ] **TRADE-02**: User can execute a buy order (market order, instant fill)
- [ ] **TRADE-03**: User can execute a sell order (market order, instant fill)
- [ ] **TRADE-04**: User sees cash balance update immediately after trade execution
- [ ] **TRADE-05**: User can trade fractional shares (quantity > 0.00)

### Portfolio

- [ ] **PORT-01**: User sees positions table with ticker, quantity, avg cost, current price, unrealized P&L, % change
- [ ] **PORT-02**: User sees total portfolio value in the header (updating live)
- [ ] **PORT-03**: User sees cash balance in the header
- [ ] **PORT-04**: User sees portfolio heatmap (treemap) with positions sized by weight and colored by P&L
- [ ] **PORT-05**: User sees P&L chart showing total portfolio value over time

### AI Chat

- [ ] **CHAT-01**: User can send a message to the AI assistant
- [ ] **CHAT-02**: User sees scrolling conversation history
- [ ] **CHAT-03**: User sees loading indicator while waiting for AI response
- [ ] **CHAT-04**: User sees trade executions and watchlist changes shown inline as confirmations
- [ ] **CHAT-05**: AI can auto-execute trades specified in its structured response

### Layout & Theme

- [ ] **UI-01**: App displays dark trading terminal theme (backgrounds #0d1117/#1a1a2e, muted gray borders)
- [ ] **UI-02**: App uses color scheme: accent yellow #ecad0a, blue #209dd7, purple #753991
- [ ] **UI-03**: Layout is data-dense and desktop-first (Bloomberg/terminal-inspired)
- [ ] **UI-04**: Main chart area displays larger chart for currently selected ticker

### Deployment

- [ ] **DEPLOY-01**: Multi-stage Dockerfile builds frontend (Node) and serves via backend (Python)
- [ ] **DEPLOY-02**: Start/stop scripts exist for macOS/Linux (start_mac.sh, stop_mac.sh)
- [ ] **DEPLOY-03**: Start/stop scripts exist for Windows (start_windows.ps1, stop_windows.ps1)
- [ ] **DEPLOY-04**: docker-compose.yml provides convenience wrapper for running the app
- [ ] **DEPLOY-05**: FastAPI serves static Next.js export on port 8000

## v2 Requirements

### Enhanced Visualization

- **VIZ-01**: Candlestick chart option (requires OHLC backend support)
- **VIZ-02**: Multiple chart timeframes (1m, 5m, 15m, 1h)

### Mobile & UX

- **UX-01**: Responsive layout for tablet screens
- **UX-02**: Draggable/resizable panels
- **UX-03**: Keyboard shortcuts for trading

### AI Enhancements

- **AI-01**: Streaming AI response tokens
- **AI-02**: AI-suggested portfolio rebalancing alerts

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication/login | Single-user by design, no multi-user needed |
| Real money integration | Simulated environment only, zero stakes |
| Mobile native app | Desktop-first web app, mobile deferred |
| Cloud deployment (Terraform) | Stretch goal, not core to demo |
| WebSocket for data | SSE is sufficient for one-way push |
| Limit orders / order book | Market orders only, dramatically simpler |
| Trade confirmation dialogs | Simulated money, fluid demo, agentic AI showcase |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RTD-01 | Phase 1 | Pending |
| RTD-02 | Phase 2 | Pending |
| RTD-03 | Phase 1 | Pending |
| RTD-04 | Phase 2 | Pending |
| WATCH-01 | Phase 2 | Pending |
| WATCH-02 | Phase 2 | Pending |
| WATCH-03 | Phase 2 | Pending |
| WATCH-04 | Phase 2 | Pending |
| TRADE-01 | Phase 3 | Pending |
| TRADE-02 | Phase 3 | Pending |
| TRADE-03 | Phase 3 | Pending |
| TRADE-04 | Phase 3 | Pending |
| TRADE-05 | Phase 3 | Pending |
| PORT-01 | Phase 3 | Pending |
| PORT-02 | Phase 2 | Pending |
| PORT-03 | Phase 2 | Pending |
| PORT-04 | Phase 4 | Pending |
| PORT-05 | Phase 4 | Pending |
| CHAT-01 | Phase 5 | Pending |
| CHAT-02 | Phase 5 | Pending |
| CHAT-03 | Phase 5 | Pending |
| CHAT-04 | Phase 5 | Pending |
| CHAT-05 | Phase 5 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| UI-04 | Phase 4 | Pending |
| DEPLOY-01 | Phase 6 | Pending |
| DEPLOY-02 | Phase 6 | Pending |
| DEPLOY-03 | Phase 6 | Pending |
| DEPLOY-04 | Phase 6 | Pending |
| DEPLOY-05 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 after initial definition*
