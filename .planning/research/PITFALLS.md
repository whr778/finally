# Pitfalls Research

**Domain:** Real-time financial dashboard frontend (Next.js static export + SSE + trading UI)
**Researched:** 2026-04-20
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: SSE EventSource Connection Leak on Component Unmount

**What goes wrong:**
The SSE connection to `/api/stream/prices` is never closed when React components unmount or hot-reload during development. Each mount creates a new EventSource, but the old one stays open. After several HMR cycles or navigation changes, dozens of zombie connections accumulate, consuming browser memory and server resources. The browser's 6-connection-per-origin limit (HTTP/1.1) can also be exhausted, blocking all other requests including API calls.

**Why it happens:**
EventSource is initialized in a `useEffect` but the cleanup function either forgets to call `.close()` or the ref holding the EventSource goes stale. React 18 strict mode double-mounts in dev, which doubles the problem. Developers test with a single page load and never notice the leak.

**How to avoid:**
- Create a single, app-level SSE connection manager (custom hook or context) instantiated once at the root layout, not per-component.
- Always call `eventSource.close()` in the useEffect cleanup.
- Use a ref to hold the EventSource instance so the cleanup always has the current reference.
- Test by watching `chrome://net-internals/#events` or the Network tab for open EventSource connections after multiple hot reloads.

**Warning signs:**
- Multiple `EventSource` connections visible in browser DevTools Network tab.
- Server logs showing multiple simultaneous SSE client connections from the same browser.
- Browser becoming sluggish after extended development sessions.
- API calls (portfolio, trades) failing or timing out after extended use.

**Phase to address:**
Phase 1 (core layout + SSE connection). Must be correct from day one. Retrofitting is painful because every component consuming prices would need refactoring.

---

### Pitfall 2: Uncontrolled Re-renders from High-Frequency Price Updates

**What goes wrong:**
The SSE stream delivers price updates for all 10+ tickers every ~500ms. If price state lives in a React context or a single parent component, every price update triggers a re-render of the entire component tree: watchlist, header (total value), positions table, heatmap, charts, and trade bar. At 2 updates/second across the whole tree, the UI becomes janky with dropped frames, especially on slower machines.

**Why it happens:**
The natural React pattern is to put shared state (like prices) in a context. But when a context value changes, every consumer re-renders, even if the specific data they care about did not change. A watchlist row for AAPL re-renders when GOOGL's price changes.

**How to avoid:**
- Use a mutable ref (`useRef`) for the price cache and a subscription pattern (or a store like Zustand) to notify only affected components. Zustand's selector-based subscriptions prevent unnecessary re-renders out of the box.
- Alternatively, use `useSyncExternalStore` to subscribe individual components to specific ticker prices from a mutable external store.
- Do NOT put rapidly-changing price data in React context.
- Batch state updates: accumulate SSE events and apply them in a single `requestAnimationFrame` callback rather than updating state on every SSE event.

**Warning signs:**
- React DevTools Profiler showing the entire tree re-rendering every 500ms.
- FPS dropping below 30 when the SSE stream is active.
- Price flash animations looking choppy or being skipped.
- High CPU usage from the browser tab even when idle.

**Phase to address:**
Phase 1 (SSE integration). The state management architecture must be designed correctly before building components. Switching from context to an external store after building 10 components is a rewrite.

---

### Pitfall 3: FastAPI StaticFiles SPA Routing 404s

**What goes wrong:**
Next.js static export with `output: 'export'` generates individual HTML files (e.g., `out/index.html`). But this is a single-page app -- there is only one page (the dashboard). FastAPI's `StaticFiles(directory=..., html=True)` serves `index.html` for the root path, but any direct browser refresh on a non-root path or requests for paths that do not match a file will return 404 instead of falling back to `index.html`.

**Why it happens:**
`StaticFiles` with `html=True` maps `/foo` to `/foo.html` or `/foo/index.html`. It does not implement SPA catch-all fallback. Since this is a single-page app with only `index.html` (no multi-page routes), this mostly works, but assets in subdirectories or mismatched paths can 404. Additionally, if `trailingSlash` config is wrong, the generated file structure does not match what FastAPI expects.

**How to avoid:**
- Since this is a single-page dashboard (no client-side routing to other pages), keep the Next.js app as a single route (`/`). No complex routing needed.
- Ensure `output: 'export'` generates files that match FastAPI StaticFiles expectations: `index.html` at root, `_next/` directory for assets.
- The existing `app.mount("/", StaticFiles(..., html=True))` should work for this use case because there is only one HTML page.
- API routes are registered before the static mount, so `/api/*` takes priority. This is already correct in `main.py`.
- Do NOT use `next/image` default loader (requires a server). Use `unoptimized: true` or a custom loader.

**Warning signs:**
- 404 errors for `_next/static/` chunk files in browser console.
- Blank white page with no JavaScript errors (HTML served but assets 404).
- Build output structure not matching what FastAPI expects.

**Phase to address:**
Phase for Docker/static serving. Test the full pipeline (build frontend -> copy to static/ -> serve with FastAPI) early before building complex UI features.

---

### Pitfall 4: next/image Breaks in Static Export Without Configuration

**What goes wrong:**
Using `next/image` with the default image loader in a static export fails at build time. The default loader requires a Node.js server for on-the-fly image optimization, which does not exist in a static export.

**Why it happens:**
Next.js `<Image>` component has built-in optimization that resizes/converts images on the server. With `output: 'export'`, there is no server. This is documented but easy to miss, especially when following Next.js tutorials.

**How to avoid:**
- Set `images: { unoptimized: true }` in `next.config.js`. This is the simplest approach for a trading dashboard with no user-uploaded images.
- Alternatively, use regular `<img>` tags for any static icons/logos.
- Do NOT use `next/image` with the default loader.

**Warning signs:**
- Build error: "Image Optimization using the default loader is not compatible with output: export".
- Build fails during `next build` step in Docker.

**Phase to address:**
Phase 1 (project setup). Set this in `next.config.js` immediately during project scaffolding.

---

### Pitfall 5: Sparkline Memory Grows Unbounded from SSE Accumulation

**What goes wrong:**
The spec says sparklines are "accumulated from SSE since page load." If price history arrays grow unbounded (one entry every 500ms = 7,200 entries per ticker per hour, across 10+ tickers), memory usage grows steadily. After several hours, the browser tab consumes hundreds of megabytes and eventually becomes unresponsive.

**Why it happens:**
The natural implementation pushes every price update into an array per ticker. Without a cap, the array grows forever. Developers test for 5 minutes and never see the problem.

**How to avoid:**
- Cap sparkline data to a fixed window, e.g., the last 100 data points per ticker (covers ~50 seconds at 500ms intervals, which is plenty for a sparkline).
- Use a ring buffer pattern: when the array exceeds the limit, shift the oldest entry before pushing the new one.
- Apply the same limit to the main chart's accumulated data.

**Warning signs:**
- `performance.memory.usedJSHeapSize` growing steadily over time.
- Browser tab memory in Task Manager increasing without bound.
- Sparkline SVGs becoming visually compressed (thousands of points in a tiny area).

**Phase to address:**
Phase where sparklines are implemented. Must be in the initial implementation, not added later.

---

### Pitfall 6: Price Flash CSS Animations Stacking and Thrashing

**What goes wrong:**
The E2E tests expect `.flash-up` and `.flash-down` CSS classes on price changes. If a new price arrives before the previous flash animation completes (animations are ~500ms, updates arrive every ~500ms), animations stack, interrupt each other, or the class is never removed. This causes elements to stay permanently highlighted or flash erratically.

**Why it happens:**
Common approach: add a class on price change, then `setTimeout` to remove it. But if a new price arrives during the timeout, the timeout either fires too early (removing the new flash) or too late (the element stays highlighted). Multiple `setTimeout` calls accumulate.

**How to avoid:**
- Use CSS `animation` with `animation-fill-mode: none` rather than toggling classes with setTimeout. The animation runs and ends naturally.
- Use a key-based approach: change a React key on the price element to force a remount, which restarts the CSS animation.
- Alternatively, use `onAnimationEnd` event to remove the flash class, which is timing-independent.
- The simplest pattern: apply a CSS class that triggers a `@keyframes` animation, and in `onAnimationEnd`, remove the class. Then on next price change, re-apply it.

**Warning signs:**
- Price cells permanently stuck with green/red background.
- Flash animations visibly interrupting or skipping.
- E2E test `page.waitForSelector(".flash-up")` timing out or finding too many elements.

**Phase to address:**
Phase where the watchlist with live prices is implemented.

---

### Pitfall 7: data-testid Contract Mismatch with E2E Tests

**What goes wrong:**
The E2E tests are already written and depend on specific `data-testid` attributes: `total-value`, `cash-balance`, `watchlist-row-AAPL`, `trade-bar`, `trade-ticker`, `trade-qty`, `btn-buy`, `btn-sell`, `trade-success`, `trade-error`, `position-row-GOOGL`, `tile-AAPL`, `connection-dot`, `chat-panel`, `chat-input`, `chat-send`, `chat-msg-user`, `chat-msg-assistant`, `chat-loading`, `ticker-input`, `add-btn`, `remove-AMZN`, `add-error`. The CSS class `.flash-up` is also expected. Any deviation means tests fail silently or flakily.

**Why it happens:**
Frontend developers build the UI, name things intuitively, and discover the mismatch only when running E2E tests at the end. Renaming testids after the fact requires touching every component.

**How to avoid:**
- Extract all required `data-testid` values from the E2E test specs into a reference document BEFORE building any components.
- Use a consistent naming pattern matching the tests: `watchlist-row-{TICKER}`, `position-row-{TICKER}`, `tile-{TICKER}`, `remove-{TICKER}`.
- The ticker is dynamic in the testid (e.g., `watchlist-row-${ticker}`) so the component must use `data-testid={`watchlist-row-${ticker}`}`.

**Warning signs:**
- E2E tests timing out waiting for elements.
- Tests passing in unit tests but failing in integration.

**Phase to address:**
Every phase. Each component built must reference the E2E test contract. Best practice: check the relevant test spec before implementing each component.

---

### Pitfall 8: Docker Multi-Stage Build Copies Wrong Artifacts or Misses _next Directory

**What goes wrong:**
The multi-stage Dockerfile builds the Next.js frontend in Stage 1 (Node) and copies output to Stage 2 (Python). But the build output path is wrong, the `_next` directory is missing, or environment variables needed at build time are not available. The container starts, FastAPI serves `index.html`, but all JavaScript/CSS assets 404.

**Why it happens:**
Next.js static export outputs to `out/` by default (configurable). The Dockerfile must copy from the correct path. Common mistakes:
- Copying from `.next/` (the build cache) instead of `out/` (the static export output).
- Forgetting that `npm run build` with `output: 'export'` puts files in `out/`, not `.next/static/`.
- Not running `npm run build` (just `npm install`).
- Missing `NEXT_PUBLIC_*` env vars at build time (they are inlined into the JS bundle during build).

**How to avoid:**
- In the Dockerfile, after `npm run build`, verify the `out/` directory exists and contains `index.html` and `_next/`.
- Copy `out/` contents (not the directory itself) to the Python stage's `static/` directory.
- No `NEXT_PUBLIC_*` env vars are needed for this project since all API calls go to the same origin (`/api/*`).
- Test the Dockerfile locally before building complex UI.

**Warning signs:**
- Docker build succeeds but `static/` directory is empty or missing `_next/`.
- Browser shows HTML skeleton but no styled content (CSS/JS not loaded).
- Console full of 404 errors for `.js` and `.css` chunk files.

**Phase to address:**
Docker/deployment phase. Test early with a minimal "hello world" frontend to validate the pipeline.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using React context for price data | Fast to implement, familiar pattern | Full tree re-renders on every update (2/sec), unusable at scale | Never for high-frequency data. Use Zustand or useSyncExternalStore from the start |
| Inline SVG sparklines without a library | No dependency to install | Must handle path calculation, scaling, and responsive sizing manually | Acceptable if kept simple (polyline from normalized points). Avoid if needing axes or tooltips |
| Polling portfolio instead of refreshing after trades | Simpler than event-driven refresh | Stale data shown for up to N seconds after a trade; user confusion | Acceptable for P&L chart history. NOT acceptable for cash balance and positions after a trade -- refresh immediately on trade completion |
| Single monolithic page component | Quick to get something on screen | Untestable, hard to modify, everything re-renders together | Only for initial prototype. Decompose within the same phase |
| setTimeout for animation cleanup | Works in simple cases | Races with incoming SSE events, can leave stuck highlights | Never. Use `onAnimationEnd` event instead |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SSE `/api/stream/prices` | Parsing `event.data` as individual ticker update | The SSE data payload is a JSON object with ALL tickers keyed by symbol: `{"AAPL": {...}, "GOOGL": {...}, ...}`. Parse the entire object, not individual entries |
| `POST /api/portfolio/trade` | Not handling 400/404 errors from the backend | Backend returns `{"detail": "..."}` for errors. Show `detail` in the `trade-error` testid element. Common errors: "Insufficient cash", "Insufficient shares", "No price available for X", "quantity must be > 0" |
| `POST /api/chat` | Treating it like a streaming endpoint | The chat endpoint returns a single complete JSON response (not streamed). Show a loading indicator while waiting, then render the full response. Cerebras inference is fast but not instant |
| `POST /api/watchlist` | Not handling 409 (duplicate ticker) | Backend returns 409 with `detail` when a ticker already exists. Display in the `add-error` testid element. Also handle 400 for invalid ticker format |
| `DELETE /api/watchlist/{ticker}` | Expecting a response body | Returns 204 No Content on success. Check status code, do not try to parse response body |
| Chat `trades_executed` array | Ignoring failed trades in the response | Each trade has a `success` boolean and optional `error` string. Display both successful and failed trade results inline in chat |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering entire watchlist on any price update | FPS drops below 30, visible jank when scrolling | Use memoized row components (`React.memo`) with ticker-specific price selectors from an external store | Immediately noticeable with 10+ tickers at 500ms updates |
| Rebuilding treemap/heatmap SVG on every price tick | Heatmap flickers, CPU spikes | Only recalculate treemap layout when positions change (buy/sell). Update tile colors on price change without re-laying-out the whole treemap | Noticeable as soon as heatmap + SSE are both active |
| Lightweight Charts creating new series on every data update | Chart flickers, memory leak, series stack on top of each other | Create the chart and series once (`useRef`). Call `series.update()` for new data points, not `chart.addLineSeries()` repeatedly | Immediately visible as overlapping charts |
| Accumulating `setTimeout` handles for flash animations | Hundreds of pending timeouts, browser sluggishness | Use CSS `animation` with `onAnimationEnd`, or clear previous timeout before setting a new one | After a few minutes of streaming prices |
| Not memoizing derived portfolio calculations | Total value, P&L percentages recalculated on every render | Use `useMemo` for derived values that depend on positions + prices | Becomes noticeable with 5+ positions and frequent price updates |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing `OPENROUTER_API_KEY` in frontend bundle | API key visible in browser DevTools, anyone can use your credits | API key is only in the backend `.env`. The frontend calls `/api/chat` which proxies to OpenRouter. Never set API keys as `NEXT_PUBLIC_*` env vars |
| Trusting ticker input without sanitization | XSS if ticker symbol is rendered with `dangerouslySetInnerHTML` | Always render ticker symbols as text content, never as HTML. Backend validates tickers match `^[A-Z]{1,5}$` but the frontend should also sanitize display |
| Chat message content rendered as HTML | XSS from LLM-generated content containing script tags | Render chat messages as plain text or use a markdown renderer with HTML sanitization. Never use `dangerouslySetInnerHTML` for LLM output |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state on trade execution | User clicks Buy/Sell multiple times, executes duplicate trades | Disable the buy/sell buttons while a trade request is in flight. Show a spinner or "Executing..." state. Re-enable on success/error |
| Flash animations on initial page load | Every ticker "flashes" green/red on the first SSE event because there is no previous price to compare against (or previous_price equals the initial seed) | Skip the flash animation on the first price update received for each ticker. Track "has received at least one update" per ticker |
| Stale portfolio data after trade | User buys AAPL, but positions table and cash balance do not update until the next polling cycle | Immediately re-fetch `/api/portfolio` after a successful trade. Do not rely solely on periodic polling |
| Chat panel covers critical data on narrow screens | User cannot see portfolio while chatting with AI | Make the chat panel collapsible/dockable. Show it as a sidebar that can be toggled, not an overlay |
| No feedback on SSE disconnect | User sees stale prices without knowing the stream is dead | Implement the connection status indicator (`connection-dot` testid) showing LIVE/RECONNECTING/DISCONNECTED. Use EventSource `onerror` and `onopen` events to track state |
| Trade bar accepts invalid input silently | User enters negative quantity, blank ticker, or non-numeric values | Validate inputs client-side before sending. Show `trade-error` for empty quantity, non-numeric input, or empty ticker. The backend also validates, but client-side gives faster feedback |

## "Looks Done But Isn't" Checklist

- [ ] **SSE Connection:** Connection established, but no cleanup on unmount. Verify the EventSource `.close()` is called in useEffect cleanup. Check Network tab shows exactly one EventSource connection.
- [ ] **Price Flash:** Animations work on first update, but break on rapid consecutive updates. Test by watching for 30+ seconds with prices changing every 500ms. Verify no cells stay permanently highlighted.
- [ ] **Watchlist Removal:** Remove button works, but the ticker's sparkline data and price subscription are not cleaned up. Verify memory does not grow after removing and re-adding tickers repeatedly.
- [ ] **Trade Success/Error Feedback:** Success message appears, but is never cleared. Verify `trade-success` and `trade-error` elements auto-dismiss or are cleared before the next trade.
- [ ] **Chat Loading State:** Loading indicator shows, but is never hidden if the LLM call fails (502 from backend). Verify error responses also clear the loading state.
- [ ] **Portfolio Heatmap:** Heatmap renders with one position, but breaks with zero positions (division by zero for weight calculation) or negative P&L (color mapping assumes positive range). Test with 0, 1, and 5+ positions.
- [ ] **Static Export:** `next build` succeeds locally, but the `out/` directory is not properly copied in Docker. Verify by running the Docker image and checking that `/_next/static/` assets are served.
- [ ] **Connection Dot:** Shows LIVE on connect, but never transitions to DISCONNECTED on network failure. Test by throttling network in DevTools or stopping the backend while the frontend is open.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context-based price state (re-render storm) | HIGH | Requires migrating from context to an external store (Zustand), updating every component that consumes prices, and re-testing the entire app |
| EventSource leak | MEDIUM | Centralize the SSE connection in a single hook/context. Update all consumers to use the centralized store. Relatively mechanical but touches many files |
| Wrong Docker COPY path | LOW | Fix the one COPY line in Dockerfile, rebuild. Quick fix once diagnosed |
| Unbounded sparkline arrays | LOW | Add a `.slice(-MAX_POINTS)` to the push logic. One-line fix per ticker |
| Missing data-testid attributes | LOW-MEDIUM | Add testids to components. Mechanical but tedious if many are missing. Best to get right from the start |
| next/image build failure | LOW | Add `images: { unoptimized: true }` to next.config.js. One-line fix |
| Flash animation race conditions | MEDIUM | Replace setTimeout-based approach with CSS animation + onAnimationEnd. Requires rewriting the flash logic in every price-displaying component |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSE Connection Leak | Phase 1: Core layout + SSE | Single EventSource in Network tab after multiple HMR reloads |
| Uncontrolled Re-renders | Phase 1: State management architecture | React DevTools Profiler shows only affected rows re-rendering on price update |
| FastAPI SPA Routing 404s | Docker/Deployment phase | Browser refresh on any route still loads the app |
| next/image in Static Export | Phase 1: Project scaffolding | `next build` succeeds without image optimization errors |
| Sparkline Memory Growth | Phase 2: Watchlist with sparklines | `performance.memory.usedJSHeapSize` stable after 5 minutes of streaming |
| Flash Animation Stacking | Phase 2: Watchlist with live prices | No permanently highlighted cells after 30+ seconds of streaming |
| data-testid Mismatch | Every phase | E2E tests pass for each component as it is built |
| Docker Build Artifacts | Docker/Deployment phase | Container serves styled page with working JS at `http://localhost:8000` |

## Sources

- [Next.js Static Exports Guide](https://nextjs.org/docs/app/guides/static-exports)
- [Next.js Static Export 404 Issues (GitHub Discussion)](https://github.com/vercel/next.js/issues/9213)
- [Next.js App Router SPA Mode Discussion](https://github.com/vercel/next.js/discussions/49517)
- [FastAPI Static Files Documentation](https://fastapi.tiangolo.com/tutorial/static-files/)
- [FastAPI Serving React Frontend](https://davidmuraya.com/blog/serving-a-react-frontend-application-with-fastapi/)
- [SSE Implementation in React (OneUptime 2026)](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view)
- [Enterprise SSE Systems in React (Medium)](https://medium.com/doping-technology-blog/building-enterprise-level-sse-systems-in-react-native-a-complete-guide-d84786eecbeb)
- [Real-Time Dashboard Performance (Segev Sinay)](https://www.segevsinay.com/blog/real-time-dashboard-performance)
- [Front-End Performance for HFT Interfaces](https://oceanobe.com/news/front%E2%80%91end-performance-optimization-for-high%E2%80%91frequency-trading-interfaces/1634)
- [TradingView Lightweight Charts React Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/react/simple)
- [Lightweight Charts Primitives Sync Issue](https://github.com/tradingview/lightweight-charts/issues/1920)
- [Docker Multi-Stage Builds Guide](https://docs.docker.com/build/building/multi-stage/)
- [CSS vs JS Animation Performance (MDN)](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)
- [Recharts Treemap API](https://recharts.github.io/en-US/api/Treemap/)
- [react-sparklines Library](https://github.com/borisyankov/react-sparklines)
- Existing E2E test specs in `test/specs/` (startup, trading, watchlist, chat, sse-resilience)
- Existing backend source in `backend/app/` (routes, models, market stream)

---
*Pitfalls research for: FinAlly AI Trading Workstation Frontend*
*Researched: 2026-04-20*
