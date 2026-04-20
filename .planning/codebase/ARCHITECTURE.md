# Architecture

**Analysis Date:** 2026-04-20

## Pattern Overview

**Overall:** Layered monolith with clean separation of concerns: data access (database), business logic (routes), external integrations (market data, LLM), and streaming (SSE).

**Key Characteristics:**
- Single-container deployment: FastAPI backend + static-served Next.js frontend on port 8000
- Market data abstraction: pluggable implementations (simulator vs. Massive API) sharing a single interface and cache
- Async/await throughout: all I/O (database, API calls, streaming) is non-blocking
- Stateless routes: all application state lives in SQLite or the in-memory price cache
- Lifespan-managed background tasks: market data updates and portfolio snapshots run independently

## Layers

**Presentation (HTTP API):**
- Purpose: Accept HTTP requests and return JSON responses or SSE streams
- Location: `app/routes/` directory
- Contains: FastAPI routers for health, portfolio, watchlist, chat, and market data streaming
- Depends on: Database layer, market data cache, LLM integration
- Used by: Frontend via `/api/*` endpoints and `/api/stream/prices` SSE connection

**Business Logic / Routes:**
- Purpose: Implement trading operations, portfolio calculations, chat interactions, and watchlist management
- Location: `app/routes/portfolio.py`, `app/routes/chat.py`, `app/routes/watchlist.py`
- Contains: Trade execution (buy/sell with cash validation), position P&L calculation, trade history, chat message processing with auto-executed trades/watchlist changes
- Depends on: Database (models, queries), price cache (for current prices), LLM module (for chat)
- Used by: HTTP routes, triggered by client requests

**Market Data Abstraction:**
- Purpose: Provide unified interface for multiple market data sources; manage in-memory price cache
- Location: `app/market/` directory
- Contains: Abstract `MarketDataSource` interface, two implementations (simulator and Massive API), `PriceCache`, `PriceUpdate` models, factory, and SSE streaming router
- Depends on: External APIs (Massive if configured), numpy (simulator math)
- Used by: Lifespan for startup/shutdown, routes for price lookup, SSE endpoint for streaming

**Data Access Layer:**
- Purpose: Manage SQLite database schema, initialization, queries
- Location: `app/database.py` (schema definition and lazy initialization)
- Contains: Database schema (users_profile, watchlist, positions, trades, portfolio_snapshots, chat_messages), lazy initialization on first request, context manager for connections
- Depends on: aiosqlite (async SQLite driver)
- Used by: All routes for reading and writing application state

**LLM Integration:**
- Purpose: Call OpenRouter/Cerebras via LiteLLM; parse structured JSON responses
- Location: `app/llm.py`
- Contains: System prompt, response schema definition, mock fallback for testing, API key validation
- Depends on: LiteLLM library, OpenRouter (if `OPENROUTER_API_KEY` configured)
- Used by: Chat route for generating AI responses with auto-executable trades/watchlist changes

**Application Bootstrap:**
- Purpose: Initialize FastAPI, mount middleware, start background tasks, serve static files
- Location: `app/main.py`
- Contains: Lifespan context manager, static file mounting, router registration, market data source creation
- Depends on: All modules above
- Used by: ASGI entry point (uvicorn)

## Data Flow

**Market Price Update → SSE Stream:**

1. On startup, `lifespan()` creates a `PriceCache` and market data source (simulator or Massive)
2. Market data source calls `source.start(tickers)` with initial watchlist tickers from database
3. Simulator or Massive runs in background: periodically updates `PriceCache` with new prices
4. SSE endpoint (`/api/stream/prices`) continuously polls cache version; when it changes, sends all prices to connected clients
5. Client receives JSON: `{ticker: {price, previous_price, change, direction, ...}, ...}`

**Trade Execution Flow:**

1. User submits POST `/api/portfolio/trade` with `{ticker, side, quantity}`
2. Route looks up current price in `PriceCache`, validates buy/sell (sufficient cash/shares)
3. If valid:
   - Updates `users_profile.cash_balance`
   - Creates or updates `positions` row (quantity, avg_cost)
   - Appends to `trades` log
   - Commits to SQLite
4. Returns `TradeOut` with execution details

**Chat → Trade Execution Flow:**

1. User sends POST `/api/chat` with message
2. Route builds portfolio context (cash, positions with P&L, watchlist) from database + price cache
3. Loads last 5 messages from `chat_messages` table
4. Calls `call_llm()` with system prompt + portfolio context + history + user message
5. LLM returns structured JSON: `{message, trades[], watchlist_changes[]}`
6. Route auto-executes each trade (same logic as manual trade) and watchlist changes
7. Records execution results and assistant response in `chat_messages`
8. Returns `ChatOut` with message + execution results to frontend

**Watchlist Addition → Market Data Source Update:**

1. User POST `/api/watchlist` with ticker
2. Route validates ticker (regex: 1-5 uppercase letters), checks for duplicate
3. Inserts into `watchlist` table
4. Calls `await market_source.add_ticker(ticker)` to begin tracking
5. Market data source begins including ticker in next update cycle
6. Price appears in SSE stream and becomes available for trading

**State Management:**

- **Price state:** In-memory `PriceCache`, monotonically versioned, thread-safe with mutex lock
- **Application state:** SQLite single-user database (all queries filtered by `user_id='default'`)
- **Request context:** FastAPI `Request.app.state` holds `price_cache` and `market_source` references
- **Portfolio snapshots:** Recorded every 30 seconds by background task, optionally summarized at market close

## Key Abstractions

**MarketDataSource Interface:**
- Purpose: Abstract contract for price providers
- Examples: `app/market/simulator.py`, `app/market/massive_client.py`
- Pattern: All implementations accept a `PriceCache` and push updates via `cache.update(ticker, price)`; expose `start(tickers)`, `stop()`, `add_ticker()`, `remove_ticker()`, `get_tickers()` lifecycle methods

**PriceUpdate Dataclass:**
- Purpose: Immutable snapshot of ticker price at a moment in time
- Examples: Created by `PriceCache.update()`, serialized via `to_dict()` for JSON/SSE
- Pattern: Frozen dataclass with computed properties (`change`, `change_percent`, `direction`)

**PriceCache:**
- Purpose: Thread-safe in-memory store of latest price per ticker
- Pattern: Mutex-protected dict + monotonic version counter for change detection; single writer (market data source), multiple readers (routes, SSE)

## Entry Points

**HTTP Server:**
- Location: `app/main.py`
- Triggers: Uvicorn startup
- Responsibilities: Initialize database, create market data source, register routes, mount static files, manage lifespan

**Market Data Task:**
- Location: Background task in lifespan
- Triggers: On app startup
- Responsibilities: Run simulator or Massive API polling loop, update cache every 500ms

**Portfolio Snapshot Task:**
- Location: `_snapshot_loop()` in `app/main.py`
- Triggers: On app startup
- Responsibilities: Record portfolio value every 30 seconds to `portfolio_snapshots` table

**API Routes:**
- `/api/health` — `app/routes/health.py`
- `/api/portfolio` — `app/routes/portfolio.py` (GET: fetch portfolio state)
- `/api/portfolio/trade` — `app/routes/portfolio.py` (POST: execute trade)
- `/api/portfolio/history` — `app/routes/portfolio.py` (GET: portfolio value snapshots)
- `/api/watchlist` — `app/routes/watchlist.py` (GET: fetch watchlist; POST: add ticker)
- `/api/watchlist/{ticker}` — `app/routes/watchlist.py` (DELETE: remove ticker)
- `/api/chat` — `app/routes/chat.py` (POST: send message, auto-execute LLM trades)
- `/api/stream/prices` — `app/market/stream.py` (GET: SSE stream of price updates)
- `/*` — Static file server for Next.js frontend (fallback)

## Error Handling

**Strategy:** HTTP exceptions (4xx/5xx) returned to client; database errors propagate as 500; validation errors as 400; not-found as 404; LLM failures as 502.

**Patterns:**
- Trade validation: Check price exists, cash sufficient (buy) or shares sufficient (sell) before database write
- Chat trade execution: Wrapped in try-catch; failures recorded in `trades_executed` with error messages, do not abort watchlist changes
- Price lookups: Return null/None and let route decide (return 404 or proceed with calculations)

## Cross-Cutting Concerns

**Logging:** Python `logging` module; info level for startup/SSE connect/disconnect, debug for internal ops.

**Validation:** 
- Ticker format: Regex `^[A-Z]{1,5}$` checked in watchlist routes
- Trade quantities: Must be > 0
- Trade sides: Must be 'buy' or 'sell'
- Pydantic models enforce request/response schema

**Authentication:** Single-user hardcoded (`user_id='default'`) — no auth layer needed.

**Timezone:** All timestamps stored as ISO 8601 UTC strings (via `datetime.now(timezone.utc).isoformat()`).

---

*Architecture analysis: 2026-04-20*
