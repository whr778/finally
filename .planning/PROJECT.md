# FinAlly — AI Trading Workstation

## What This Is

A visually stunning AI-powered trading workstation that streams live market data, lets users trade a simulated portfolio, and integrates an LLM chat assistant that can analyze positions and execute trades. Looks and feels like a modern Bloomberg terminal with an AI copilot. Built as the capstone project for an agentic AI coding course.

## Core Value

Users see live-updating prices and can trade a simulated portfolio through both manual controls and natural language AI commands — all from a single browser tab with zero setup.

## Requirements

### Validated

- Market data streaming via SSE with pluggable sources (simulator + Massive API) — existing
- Portfolio management (buy/sell market orders, positions, P&L tracking) — existing
- Watchlist CRUD with live price integration — existing
- AI chat with structured output and auto-trade execution — existing
- SQLite database with lazy initialization and full schema — existing
- Health check endpoint — existing
- Portfolio snapshot recording (30s intervals + post-trade) — existing
- LLM mock mode for testing — existing
- Backend unit tests (73 passing, 84% coverage) — existing
- E2E test specs (5 Playwright tests defined) — existing

### Active

- [ ] Next.js frontend with dark trading terminal UI
- [x] Live price watchlist with flash animations and sparklines — Validated in Phase 02: watchlist-header
- [ ] Portfolio heatmap (treemap) and P&L chart
- [x] Positions table with real-time P&L — Validated in Phase 03: trading-positions
- [x] Trade bar for manual order entry — Validated in Phase 03: trading-positions
- [ ] AI chat panel with inline trade confirmations
- [ ] Main chart area (selected ticker detail view)
- [ ] Connection status indicator
- [ ] Multi-stage Dockerfile (Node build + Python runtime)
- [ ] Start/stop scripts (macOS + Windows)
- [ ] docker-compose.yml convenience wrapper
- [ ] Static file serving from FastAPI

### Out of Scope

- User authentication/login — single-user by design
- Real money trading — simulated environment only
- Mobile app — desktop-first web app
- Cloud deployment (Terraform/App Runner) — stretch goal, not core
- Real-time chat (WebSocket) — SSE is sufficient
- Limit orders / order book — market orders only

## Context

- Backend is ~90% complete with full API surface, market data pipeline, and LLM integration
- Frontend has watchlist, trade bar, and positions table with live P&L (Phase 03 complete)
- E2E tests reference specific `data-testid` attributes that the frontend must implement
- Single Docker container serves both backend API and static frontend on port 8000
- Color scheme: accent yellow #ecad0a, blue primary #209dd7, purple secondary #753991
- Dark theme backgrounds: #0d1117 or #1a1a2e

## Constraints

- **Architecture**: Single container, single port (8000), no CORS needed
- **Frontend**: Next.js static export (`output: 'export'`), served by FastAPI
- **Package manager**: uv for Python, npm for Node.js
- **Database**: SQLite only, no external database server
- **Market data**: SSE streaming (not WebSocket), EventSource API on client
- **LLM**: LiteLLM via OpenRouter with Cerebras inference, structured outputs
- **Styling**: Tailwind CSS with custom dark theme

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SSE over WebSocket | One-way push sufficient, simpler, universal browser support | -- Pending |
| Static Next.js export | Single origin, no CORS, one container | -- Pending |
| SQLite over Postgres | Single-user, zero config, self-contained | -- Pending |
| Market orders only | Eliminates order book complexity | -- Pending |
| No trade confirmation dialog | Simulated money, fluid demo, shows agentic AI | -- Pending |
| Canvas charting (Lightweight Charts) | Performance for live-updating financial data | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-21 after Phase 03 completion*
