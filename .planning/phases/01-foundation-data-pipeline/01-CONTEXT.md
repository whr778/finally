# Phase 1: Foundation & Data Pipeline - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the Next.js frontend project, establish the dark trading terminal theme with Tailwind CSS, create Zustand state stores, connect to the backend's SSE price stream, and display a real-time connection status indicator. This phase delivers the app shell and data pipeline that all subsequent phases build on.

</domain>

<decisions>
## Implementation Decisions

### Layout skeleton
- **D-01:** Full layout grid with all panel areas rendered as empty bordered placeholders (watchlist, main chart, positions, heatmap/P&L, trade bar). Subsequent phases fill panels in without layout rework.
- **D-02:** Chat panel starts collapsed with a toggle button (not a fixed sidebar). More screen space for charts/data until Phase 5 builds chat out.

### Dark theme style
- **D-03:** Dark panels with soft blue glow edges. Background #0d1117, panel background #161b22, borders use subtle box-shadow glow (rgba(32,157,215,0.3)). Sci-fi / modern trading feel, not flat traditional terminal.
- **D-04:** Text colors: primary #e6edf3 (off-white), muted #7d8590 (gray).
- **D-05:** Monospace font for data (prices, quantities, ticker symbols) — e.g., JetBrains Mono or Fira Code. Clean sans-serif (Inter or system font) for labels and headers.

### Connection indicator
- **D-06:** Small colored dot (8-10px circle) with text label, right-aligned in header. Green dot + "LIVE" when connected, yellow dot + "CONNECTING" when reconnecting, red dot + "OFFLINE" when disconnected. Compact, doesn't compete with price data.
- **D-07:** Must use `data-testid="connection-dot"` with text content including "LIVE" (per E2E test requirements).

### Claude's Discretion
- Zustand store architecture (number of stores, slice boundaries, selector patterns for per-ticker subscriptions)
- Frontend directory structure (component organization within `frontend/src/`)
- SSE connection management approach (custom hook vs service, reconnection logic)
- Exact panel proportions and grid sizing
- Loading skeleton design for empty placeholder panels

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project specification
- `planning/PLAN.md` — Full project spec including layout description, color scheme, SSE details, API endpoints, and frontend technical notes
- `planning/MARKET_DATA_SUMMARY.md` — Market data component summary (backend already built)

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — v1 requirements with IDs (RTD-01, RTD-03, UI-01, UI-02, UI-03 are Phase 1)
- `.planning/ROADMAP.md` — Phase breakdown, success criteria, dependency chain

### E2E test contracts
- `test/specs/startup.spec.ts` — Defines required data-testid attributes: `connection-dot`, `total-value`, `cash-balance`, `watchlist-row-{TICKER}`, `chat-panel`, `chat-input`, `trade-bar`, `trade-ticker`, `trade-qty`, `btn-buy`, `btn-sell`
- `test/specs/sse-resilience.spec.ts` — Tests SSE connection indicator shows "LIVE", prices update over time

### Backend API (already built)
- `backend/app/market/stream.py` — SSE streaming endpoint (`GET /api/stream/prices`)
- `backend/app/routes/portfolio.py` — Portfolio API (needed for header values)
- `backend/app/routes/watchlist.py` — Watchlist API
- `backend/app/models.py` — Pydantic response models (API contracts)

### Codebase maps
- `.planning/codebase/STACK.md` — Technology stack details
- `.planning/codebase/CONVENTIONS.md` — Coding conventions and patterns
- `.planning/codebase/STRUCTURE.md` — Directory layout and where to add code

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Backend is ~90% complete with full API surface — frontend consumes these APIs
- SSE endpoint at `GET /api/stream/prices` pushes price updates for all tickers at ~500ms intervals
- Portfolio endpoint at `GET /api/portfolio` returns positions, cash balance, total value
- Watchlist endpoint at `GET /api/watchlist` returns tickers with latest cached prices

### Established Patterns
- Backend uses Pydantic models for all API responses — frontend TypeScript types should mirror these
- SSE events contain: ticker, price, previous_price, timestamp, direction
- All API routes under `/api/*` — same origin, no CORS needed
- Single-user model with hardcoded `user_id="default"`

### Integration Points
- Frontend static export served by FastAPI at root (`/`)
- API calls to `/api/*` endpoints (same origin)
- SSE connection via `EventSource` to `/api/stream/prices`
- No authentication — direct API calls

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-data-pipeline*
*Context gathered: 2026-04-20*
