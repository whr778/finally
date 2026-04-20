# Feature Research

**Domain:** AI Trading Workstation (Bloomberg-style terminal with AI copilot)
**Researched:** 2026-04-20
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. For a trading terminal, the bar is set by Bloomberg, TradingView, Fidelity, and Finviz. Since this is a simulated single-user capstone project (not a production broker), "users" means course evaluators and demo viewers who expect a polished, data-rich interface.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Live price watchlist** | Core of any trading terminal. Users see a grid of tickers with updating prices. Without this, nothing else matters. | MEDIUM | Must display 10 default tickers with current price, change %, direction. SSE via EventSource. E2E tests require `watchlist-row-{TICKER}` data-testids. |
| **Price flash animations** | Every real trading terminal flashes green/red on tick. Instant visual signal of price movement. Users will notice if absent. | LOW | CSS transition on background-color, ~500ms fade. `.flash-up` (green) and `.flash-down` (red) classes. E2E test `watchlist.spec.ts` checks for `.flash-up` selector. |
| **Trade execution (buy/sell)** | A "trading workstation" without trading is just a dashboard. Market orders, instant fill, no confirmation. | MEDIUM | Trade bar with ticker input, quantity input, buy/sell buttons. Existing API: `POST /api/portfolio/trade`. E2E requires `trade-bar`, `trade-ticker`, `trade-qty`, `btn-buy`, `btn-sell`, `trade-success`, `trade-error`. |
| **Portfolio summary in header** | Total value and cash balance always visible. Bloomberg shows this permanently. | LOW | Header with `total-value` and `cash-balance` data-testids. Polls `GET /api/portfolio` and updates on trade. E2E checks for "$10,000" at startup. |
| **Positions table** | Users need to see what they own: ticker, qty, avg cost, current price, unrealized P&L, % change. Standard in every broker. | MEDIUM | Data from `GET /api/portfolio` positions array. Each position row needs `position-row-{TICKER}` data-testid. Real-time price from SSE updates current price and P&L. |
| **Connection status indicator** | Users must know if prices are live or stale. Green dot = connected, yellow = reconnecting, red = disconnected. | LOW | EventSource `onopen`, `onerror` handlers. `connection-dot` data-testid, must contain "LIVE" text when connected. |
| **Dark theme** | Bloomberg aesthetic is the whole brand. Light theme on a "terminal" looks wrong. | LOW | Tailwind dark theme. Backgrounds `#0d1117` / `#1a1a2e`, muted borders, accent yellow `#ecad0a`, blue primary `#209dd7`, purple secondary `#753991`. |
| **AI chat panel** | This is the project's core differentiator (AI copilot). Without it, this is just another trading dashboard. | HIGH | Docked sidebar with message input, conversation history, loading state. Must render trade confirmations inline. Data-testids: `chat-panel`, `chat-input`, `chat-send`, `chat-msg-user`, `chat-msg-assistant`, `chat-loading`. Send button disabled when empty. |
| **Watchlist management (add/remove)** | Users need to customize what they watch. Every terminal supports this. | MEDIUM | Add: ticker input (`ticker-input`) + add button (`add-btn`). Remove: per-row remove button (`remove-{TICKER}`). Error display (`add-error`) for duplicates/invalid tickers. |
| **Main chart area** | Clicking a ticker should show a detailed price chart. A terminal without a chart is a spreadsheet. | MEDIUM | Chart displaying price over time for selected ticker. Accumulated from SSE data since page load. E2E checks for "GOOGL -- price chart" text on click. Lightweight Charts or similar canvas-based library. |

### Differentiators (Competitive Advantage)

Features that set this project apart from a generic dashboard. These are what make evaluators say "wow" during the demo.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-executed trades from chat** | The AI doesn't just advise -- it acts. Say "buy 10 AAPL" and it happens. This is the agentic AI demo moment. | MEDIUM (frontend only, backend complete) | Chat response includes `trades_executed` and `watchlist_changes` arrays. Frontend renders these as inline confirmations. Portfolio auto-refreshes after AI trade. |
| **Portfolio heatmap (treemap)** | Finviz-style visualization. Rectangles sized by position weight, colored by P&L. Immediate visual read on portfolio health. | HIGH | Treemap using D3, Recharts treemap, or similar. Tiles sized by `current_price * quantity / total_value`, colored green-to-red by `pct_change`. E2E expects `tile-{TICKER}` data-testid. |
| **Sparkline mini-charts** | Small inline charts next to each ticker in the watchlist. Shows price action at a glance without clicking. Progressive -- fills in as SSE data accumulates. | MEDIUM | SVG sparklines built from SSE price history stored in frontend state. E2E checks for `svg` element inside watchlist rows. 30-50 data points. Simple polyline. |
| **P&L chart (portfolio value over time)** | Line chart showing how portfolio value changes. Proves the trading simulation has "memory." | MEDIUM | Data from `GET /api/portfolio/history` (snapshots). Line chart with time on x-axis, dollar value on y-axis. Updates periodically (backend records snapshots every 30s + post-trade). |
| **Inline trade confirmations in chat** | When AI executes a trade, the chat shows a styled confirmation card (ticker, side, qty, price, success/fail). Not just text. | LOW | Parse `trades_executed` array from `ChatOut` response. Render as distinct UI elements, not just plain text messages. |
| **Watchlist click-to-trade** | Click a ticker in watchlist, it populates the trade bar ticker field AND selects it in the main chart. Fluid workflow. | LOW | E2E verifies clicking TSLA row sets `trade-ticker` value to "TSLA". Shared state between watchlist selection, chart, and trade bar. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in this specific project context.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Candlestick charts** | "Real" terminals use candlesticks. Looks professional. | Candlesticks need OHLC data (open, high, low, close). The SSE stream only provides point-in-time prices. Building OHLC aggregation adds significant frontend complexity for marginal demo value. | Simple line charts from SSE price points. Clean and readable. Candlesticks can be a v2 feature if OHLC data is added to backend. |
| **Streaming AI responses (token-by-token)** | Modern chat UIs show text appearing word by word. Feels more responsive. | Backend uses Cerebras for fast inference. Responses arrive in ~1-2 seconds total. SSE streaming from LLM adds complexity to both backend and frontend. The plan explicitly says "loading indicator is sufficient." | Loading indicator (bouncing dots) while waiting, then show complete response. Keep it simple. |
| **Draggable/resizable panels** | Bloomberg lets users rearrange everything. Feels "pro." | Massive frontend complexity for layout management, persistence, responsive breakpoints. Way beyond scope for a capstone demo. | Fixed, well-designed grid layout. Optimize the default layout so rearrangement isn't needed. |
| **Multiple chart types (bar, area, mountain)** | Variety looks feature-rich. | Each chart type needs its own component or configuration. Adds complexity without adding demo value. The plan specifies "at minimum price over time." | One chart type (line) done well. Possibly area chart with gradient fill for visual polish. |
| **Trade history page / modal** | "Where can I see my past trades?" | The trades table exists in the DB but there's no API endpoint for listing trade history. Adding a frontend view requires a new API endpoint or parsing chat actions. Out of scope per plan. | Trades are visible inline in chat history (AI confirmations) and reflected in positions table. Portfolio history chart shows value changes. |
| **Limit orders / stop loss** | Expected in "real" trading. | Plan explicitly scopes to market orders only. Limit orders need an order book, pending order management, fill logic. Massive complexity. | Market orders only. Instant fill. Zero complexity. The plan says this is deliberate. |
| **Mobile-responsive layout** | "Works on phone." | Plan says "desktop-first, functional on tablet." Terminal-style UIs with data density don't work on phones. Responsive effort would compromise desktop experience. | Desktop-first grid. Set reasonable min-width. Tablet gets a simplified layout at best. |
| **Keyboard shortcuts** | Bloomberg power users live on keyboard shortcuts. | Adds an input handling layer, keybinding conflicts, documentation requirement. Low ROI for demo. | Tab-order focus management on trade bar is sufficient. |
| **Portfolio allocation pie chart** | Classic portfolio view. | The treemap heatmap already shows allocation (by tile size) AND P&L (by color). A pie chart adds redundant information with less density. | Treemap heatmap serves both allocation and P&L visualization in one component. |

## Feature Dependencies

```
[SSE Connection / EventSource]
    |
    +--requires--> [Connection Status Indicator]
    |
    +--requires--> [Live Price Watchlist]
    |                   |
    |                   +--requires--> [Price Flash Animations]
    |                   |
    |                   +--requires--> [Sparkline Mini-Charts]
    |                   |
    |                   +--enhances--> [Main Chart Area] (click to select)
    |                   |
    |                   +--enhances--> [Watchlist Click-to-Trade]
    |
    +--requires--> [Positions Table] (needs live prices for current P&L)
    |
    +--requires--> [Portfolio Heatmap] (needs live prices for tile colors)

[GET /api/portfolio polling]
    |
    +--requires--> [Portfolio Summary in Header]
    |
    +--requires--> [Positions Table]
    |
    +--requires--> [Portfolio Heatmap]

[Trade Bar]
    |
    +--requires--> [Trade Success/Error Feedback]
    +--enhances--> [Portfolio auto-refresh after trade]

[AI Chat Panel]
    |
    +--requires--> [Chat message rendering (user + assistant)]
    |
    +--requires--> [Loading indicator]
    |
    +--enhances--> [Inline trade confirmations]
    +--enhances--> [Inline watchlist change confirmations]

[Watchlist Management]
    |
    +--requires--> [Add ticker input + button]
    +--requires--> [Remove ticker button per row]
    +--requires--> [Error display for invalid/duplicate]

[Main Chart Area] --enhances--> [Watchlist Click-to-Trade] (shared selection state)
```

### Dependency Notes

- **SSE Connection is the foundation:** Nearly every visual feature depends on live price data from the SSE stream. Build and verify SSE first.
- **Portfolio polling is the second foundation:** Header values, positions table, and heatmap all need portfolio data. Must work before any visualization.
- **Watchlist click-to-trade links three features:** Clicking a watchlist row must update selection state consumed by the main chart, the trade bar ticker input, and visual highlighting. Shared state management (React context or zustand) is needed.
- **Trade bar is independent of chat:** Users can trade manually or via AI. Both paths hit the same API. Portfolio refreshes after either.
- **Heatmap depends on positions existing:** The heatmap is empty with $10K cash and no positions. It only appears after at least one buy trade. E2E test buys AAPL first, then checks for `tile-AAPL`.

## MVP Definition

### Launch With (v1)

Minimum set to pass all E2E tests and deliver a credible demo.

- [ ] **SSE connection with EventSource** -- everything else is dead without prices
- [ ] **Connection status indicator** -- `connection-dot` with "LIVE" text
- [ ] **Watchlist with live prices and flash animations** -- `watchlist-row-{TICKER}`, `.flash-up`/`.flash-down`
- [ ] **Header with total value and cash balance** -- `total-value`, `cash-balance`
- [ ] **Trade bar** -- `trade-bar`, `trade-ticker`, `trade-qty`, `btn-buy`, `btn-sell`, `trade-success`, `trade-error`
- [ ] **Positions table** -- `position-row-{TICKER}`
- [ ] **Watchlist management (add/remove)** -- `ticker-input`, `add-btn`, `remove-{TICKER}`, `add-error`
- [ ] **Main chart area** -- selected ticker chart, updates on watchlist click, "GOOGL -- price chart" pattern
- [ ] **AI chat panel** -- `chat-panel`, `chat-input`, `chat-send`, `chat-msg-user`, `chat-msg-assistant`, `chat-loading`
- [ ] **Dark theme layout** -- backgrounds, accent colors, data-dense grid
- [ ] **Watchlist click-to-trade** -- clicking row populates trade ticker field

### Add After Validation (v1.x)

Features to add once core is working and E2E tests pass.

- [ ] **Sparkline mini-charts** -- E2E tests check for SVG in watchlist rows, but sparklines can be empty initially
- [ ] **Portfolio heatmap (treemap)** -- E2E checks `tile-AAPL` after buying; complex visualization
- [ ] **P&L chart** -- portfolio value over time from `/api/portfolio/history`
- [ ] **Inline trade confirmations in chat** -- styled cards for AI-executed trades
- [ ] **Auto-refresh portfolio after AI chat trade** -- seamless AI trading loop

### Future Consideration (v2+)

Features to defer until the core is solid.

- [ ] **Responsive tablet layout** -- low ROI until desktop is polished
- [ ] **Chat conversation persistence across page reloads** -- backend stores history, but frontend starts fresh
- [ ] **Watchlist reordering (drag-and-drop)** -- nice but unnecessary
- [ ] **Candlestick charts** -- requires OHLC aggregation
- [ ] **Dark/light theme toggle** -- dark only is fine for terminal aesthetic

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SSE connection + live prices | HIGH | MEDIUM | P1 |
| Price flash animations | HIGH | LOW | P1 |
| Connection status indicator | MEDIUM | LOW | P1 |
| Trade bar (buy/sell) | HIGH | MEDIUM | P1 |
| Portfolio header (value + cash) | HIGH | LOW | P1 |
| Positions table | HIGH | MEDIUM | P1 |
| Watchlist management (add/remove) | MEDIUM | MEDIUM | P1 |
| AI chat panel | HIGH | HIGH | P1 |
| Main chart area | HIGH | MEDIUM | P1 |
| Dark terminal theme | HIGH | LOW | P1 |
| Watchlist click-to-trade | MEDIUM | LOW | P1 |
| Sparkline mini-charts | MEDIUM | MEDIUM | P2 |
| Portfolio heatmap (treemap) | HIGH | HIGH | P2 |
| P&L chart | MEDIUM | MEDIUM | P2 |
| Inline chat trade confirmations | MEDIUM | LOW | P2 |
| Auto-refresh after AI trade | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Must have for launch -- required by E2E tests or core user experience
- P2: Should have, add immediately after P1 -- delivers "wow" factor for demo
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Bloomberg Terminal | TradingView | Finviz | Robinhood | Our Approach |
|---------|-------------------|-------------|--------|-----------|--------------|
| Live prices | Dedicated feed, sub-ms | WebSocket | Delayed 15min | WebSocket | SSE stream, ~500ms |
| Watchlist | Multi-list, sortable, linked | Multi-list, alerts | Screener-based | Single list | Single list, add/remove, click-to-chart |
| Charts | Full OHLC, technical indicators, multi-pane | Full OHLC, community scripts | Static snapshots | Simple line/candle | Line chart from SSE accumulation |
| Order entry | Complex (limits, stops, brackets) | Via broker integration | None | Swipe to trade | Simple bar: ticker, qty, buy/sell |
| Portfolio view | Account manager widget | Via broker | None | List + chart | Positions table + heatmap + P&L chart |
| Heatmap | Custom, sector-based | Market heatmap | Treemap map (famous) | None | Treemap of holdings, Finviz-inspired |
| AI assistant | Bloomberg GPT (limited) | Pine script AI | None | None | **Full agentic AI: chat, analyze, execute trades** |
| Price flash | Yes (tick colors) | Subtle | No | Subtle | Green/red flash with CSS transitions |
| Dark theme | Default | Optional | Light only | White/dark | Dark only, terminal aesthetic |

**Our key advantage:** The AI assistant that can analyze AND execute trades is genuinely novel. Most competitors either have no AI, or have AI that only advises. Ours acts.

## E2E Test Contract (Required data-testids)

This is a hard requirement. The frontend MUST implement these exact `data-testid` attributes.

| data-testid | Component | Spec File |
|-------------|-----------|-----------|
| `total-value` | Header: portfolio total value | startup |
| `cash-balance` | Header: cash balance | startup, trading |
| `connection-dot` | Header: SSE status indicator | startup, sse-resilience |
| `watchlist-row-{TICKER}` | Watchlist: each ticker row | startup, trading, watchlist, sse-resilience |
| `ticker-input` | Watchlist: add ticker input | watchlist |
| `add-btn` | Watchlist: add ticker button | watchlist |
| `remove-{TICKER}` | Watchlist: remove button per row | watchlist |
| `add-error` | Watchlist: error message | watchlist |
| `trade-bar` | Trade bar container | startup, trading |
| `trade-ticker` | Trade bar: ticker input | startup, trading, watchlist |
| `trade-qty` | Trade bar: quantity input | startup, trading |
| `btn-buy` | Trade bar: buy button | startup, trading |
| `btn-sell` | Trade bar: sell button | startup, trading |
| `trade-success` | Trade bar: success message | trading |
| `trade-error` | Trade bar: error message | trading |
| `position-row-{TICKER}` | Positions table: each position row | trading |
| `tile-{TICKER}` | Heatmap: treemap tile per ticker | trading |
| `chat-panel` | Chat: panel container | startup, chat |
| `chat-input` | Chat: message input | startup, chat |
| `chat-send` | Chat: send button | chat |
| `chat-msg-user` | Chat: user message bubble | chat |
| `chat-msg-assistant` | Chat: assistant message bubble | chat |
| `chat-loading` | Chat: loading indicator | chat |

Additionally, the CSS class `.flash-up` must be applied to watchlist rows on price uptick (checked by `watchlist.spec.ts`).

## Sources

- [Bloomberg Terminal UX design](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/) -- HIGH confidence, official source
- [Bloomberg Terminal innovation](https://www.bloomberg.com/company/stories/innovating-a-modern-icon-how-bloomberg-keeps-the-terminal-cutting-edge/) -- HIGH confidence, official source
- [TradingView Advanced Charts docs](https://www.tradingview.com/charting-library-docs/latest/trading_terminal/) -- HIGH confidence, official docs
- [Trading GUI patterns](https://somcosoftware.com/en/blog/trading-gui-building-interfaces-for-financial-applications) -- MEDIUM confidence, industry article
- [Trading UX design guide](https://medium.com/@markpascal4343/user-experience-design-for-trading-apps-a-comprehensive-guide-b29445203c71) -- MEDIUM confidence, community article
- [Finviz treemap](https://finviz.com/map.ashx) -- HIGH confidence, direct product reference
- [Stock heatmap guide 2026](https://www.greatworklife.com/stock-heatmaps/) -- MEDIUM confidence, roundup article
- [React chart libraries for financial data](https://querio.ai/articles/top-react-chart-libraries-data-visualization) -- MEDIUM confidence, comparison article
- [AI trading assistants 2026](https://chartinglens.com/blog/best-ai-trading-assistants) -- MEDIUM confidence, roundup
- Project PLAN.md, E2E test specs, backend API routes -- HIGH confidence, primary source (project codebase)

---
*Feature research for: AI Trading Workstation (Bloomberg-style terminal with AI copilot)*
*Researched: 2026-04-20*
