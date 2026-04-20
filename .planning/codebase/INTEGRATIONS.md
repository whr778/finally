# External Integrations

**Analysis Date:** 2026-04-20

## APIs & External Services

**LLM/AI:**
- OpenRouter (Cerebras inference)
  - What it's used for: Chat assistant that analyzes portfolio, suggests trades, auto-executes actions via structured outputs
  - SDK/Client: `litellm` 1.50.0+ (`backend/pyproject.toml`)
  - Model: `openrouter/openai/gpt-oss-120b`
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Implementation: `backend/app/llm.py` - `call_llm()` function sends portfolio context, chat history, and user message; receives structured JSON response with message, trades, and watchlist changes
  - Structured Outputs: Uses JSON schema validation to enforce response format (`type: "json_schema"` with strict schema)

**Market Data:**
- Massive API (Polygon.io)
  - What it's used for: Real-time market data (optional; simulator is default)
  - SDK/Client: `massive` 1.0.0+ (`backend/pyproject.toml`)
  - Auth: `MASSIVE_API_KEY` environment variable
  - Implementation: `backend/app/market/massive_client.py` - `MassiveDataSource` class polls REST endpoint `/v2/snapshot/locale/us/markets/stocks/tickers`
  - Rate limits:
    - Free tier: 5 req/min → polls every 15 seconds (default `poll_interval`)
    - Paid tiers: higher limits → configurable to 2-5 second intervals
  - Fallback: If `MASSIVE_API_KEY` is absent or empty, backend uses built-in GBM simulator instead

## Data Storage

**Databases:**
- SQLite 3
  - Type: Single-file relational database
  - Location: `db/finally.db` (volume-mounted in Docker, gitignored)
  - Client: `aiosqlite` 0.20.0+ - async SQLite3 wrapper
  - Connection: File path managed by environment variable `DB_PATH` (default: `db/finally.db`)
  - Initialization: Lazy initialization - schema and seed data created on first request if file is missing
  - Tables:
    - `users_profile` - Cash balance and user state
    - `watchlist` - Watched tickers
    - `positions` - Current holdings per ticker
    - `trades` - Trade history (append-only log)
    - `portfolio_snapshots` - Portfolio value over time (recorded every 30s and after trades)
    - `chat_messages` - Conversation history with LLM

**File Storage:**
- Local filesystem only
  - Static frontend assets served from `backend/static/` directory (Next.js static export copied here by Docker build)
  - SQLite database file at `db/finally.db`

**Caching:**
- In-memory price cache (no external service)
  - `PriceCache` class in `backend/app/market/cache.py`
  - Thread-safe store for latest price, previous price, timestamp per ticker
  - Populated by either simulator or Massive API poller
  - Read by SSE stream endpoint and portfolio calculation routes

## Authentication & Identity

**Auth Provider:**
- Custom (none) - Single default user hardcoded
  - Implementation: All database queries default `user_id='default'` - no login/auth system
  - Multi-user support planned but not implemented (schema supports it via `user_id` column)

## Monitoring & Observability

**Error Tracking:**
- None detected - Errors are logged but not sent to external service

**Logs:**
- Python logging module with `logging.getLogger(__name__)` throughout backend code
- Approaches:
  - Market data: Logs startup, ticker additions, poll intervals, API errors
  - LLM: Logs missing API key gracefully
  - Database: Implicit via exceptions
  - Routes: Standard HTTP status codes returned to client

## CI/CD & Deployment

**Hosting:**
- Docker container (single image, single port 8000)
- Deployment target: Any Docker-compatible platform (Docker Desktop, AWS, Render, etc.)
- Multi-stage Dockerfile (referenced in `test/docker-compose.test.yml`):
  - Stage 1: Node.js 20 slim → builds Next.js static export
  - Stage 2: Python 3.12 slim → runs FastAPI, includes static files
  - Exposes port 8000
  - Mounts volume at `/app/db` for SQLite persistence

**CI Pipeline:**
- Docker Compose test setup: `test/docker-compose.test.yml`
  - Spins up app service with `LLM_MOCK=true` and health check
  - Spins up Playwright service for E2E tests
  - No external CI service (GitLab, GitHub Actions) detected

## Environment Configuration

**Required env vars:**
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM chat (if absent and `LLM_MOCK` not set, chat returns error but other endpoints work)

**Optional env vars:**
- `MASSIVE_API_KEY` - Polygon.io key for real market data; omit to use simulator
- `LLM_MOCK` - Set to `true` for deterministic mock responses (used in tests)
- `DB_PATH` - Custom SQLite file path (default: `db/finally.db`)

**Secrets location:**
- `.env` file at project root (gitignored)
- Docker deployment: mounted via `--env-file .env` or Docker Compose

## Webhooks & Callbacks

**Incoming:**
- None detected - All communication is request/response via REST

**Outgoing:**
- None detected - Backend makes outbound HTTP calls only (OpenRouter API, Massive API)

---

*Integration audit: 2026-04-20*
