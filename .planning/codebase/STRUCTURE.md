# Codebase Structure

**Analysis Date:** 2026-04-20

## Directory Layout

```
finally/
├── backend/                          # FastAPI backend (uv project)
│   ├── app/
│   │   ├── __init__.py              # Package marker
│   │   ├── main.py                  # FastAPI app, lifespan, router registration
│   │   ├── database.py              # SQLite schema, init, seed data, context manager
│   │   ├── models.py                # Pydantic request/response models
│   │   ├── llm.py                   # LiteLLM integration, structured output parsing
│   │   ├── market/                  # Market data subsystem
│   │   │   ├── __init__.py          # Public API exports
│   │   │   ├── interface.py         # Abstract MarketDataSource
│   │   │   ├── models.py            # PriceUpdate dataclass
│   │   │   ├── cache.py             # Thread-safe PriceCache
│   │   │   ├── simulator.py         # GBM simulator implementation
│   │   │   ├── massive_client.py    # Massive API client implementation
│   │   │   ├── factory.py           # create_market_data_source() factory
│   │   │   ├── stream.py            # SSE streaming endpoint
│   │   │   └── seed_prices.py       # Ticker params, correlations, seed prices
│   │   └── routes/                  # API endpoint handlers
│   │       ├── __init__.py          # Package marker
│   │       ├── health.py            # GET /api/health
│   │       ├── portfolio.py         # GET/POST portfolio; trade execution
│   │       ├── watchlist.py         # GET/POST/DELETE watchlist
│   │       └── chat.py              # POST /api/chat with auto-execution
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # Pytest fixtures (seeded_db, price_cache, client)
│   │   ├── test_api.py              # Integration tests for all routes
│   │   └── market/
│   │       ├── __init__.py
│   │       ├── test_models.py       # PriceUpdate dataclass tests
│   │       ├── test_cache.py        # PriceCache thread safety, versioning
│   │       ├── test_simulator.py    # GBM simulator math, correlation
│   │       ├── test_simulator_source.py  # SimulatorDataSource lifecycle
│   │       ├── test_massive.py      # Massive API parsing
│   │       └── test_factory.py      # Factory selection logic
│   ├── pyproject.toml               # uv dependencies, pytest config, ruff config
│   ├── uv.lock                      # Locked dependency versions
│   ├── market_data_demo.py          # Live terminal dashboard (demo tool)
│   ├── README.md                    # Backend-specific setup, running tests
│   └── CLAUDE.md                    # Backend developer guide
├── frontend/                         # Next.js project (static export, served by FastAPI)
│   └── ...                          # (Out of scope for this analysis)
├── test/                            # E2E tests
│   ├── docker-compose.test.yml      # Spins up app for Playwright tests
│   ├── playwright.config.ts         # Playwright config
│   ├── package.json
│   └── specs/                       # E2E test files
├── db/                              # SQLite database volume mount point
│   ├── .gitkeep
│   └── finally.db                   # (Created at runtime, gitignored)
├── planning/                        # Project documentation for agents
│   ├── PLAN.md                      # Full project specification
│   ├── MARKET_DATA_SUMMARY.md       # Market data component summary
│   ├── MARKET_DATA_DESIGN.md
│   ├── MARKET_SIMULATOR.md
│   ├── MARKET_INTERFACE.md
│   ├── MARKET_DATA_DESIGN.md
│   ├── MASSIVE_API.md
│   ├── CODE_REVIEW.md
│   ├── REVIEW.md
│   └── archive/                     # Historical docs
├── .planning/codebase/              # Generated codebase maps (this content)
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md
│   ├── CONVENTIONS.md
│   ├── TESTING.md
│   ├── STACK.md
│   ├── INTEGRATIONS.md
│   └── CONCERNS.md
├── scripts/
│   ├── start_mac.sh                 # Docker run wrapper (macOS/Linux)
│   ├── stop_mac.sh                  # Docker stop wrapper (macOS/Linux)
│   ├── start_windows.ps1            # Docker run wrapper (Windows)
│   └── stop_windows.ps1             # Docker stop wrapper (Windows)
├── Dockerfile                       # Multi-stage build (Node → Python)
├── docker-compose.yml               # Optional convenience wrapper
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Env var template (committed)
├── CLAUDE.md                        # Project-wide developer guidelines
└── README.md                        # High-level project overview
```

## Directory Purposes

**`backend/app/`:**
- Purpose: Main FastAPI application source code
- Contains: Application bootstrap, routes, models, database, market data, and LLM integration
- Key files: `main.py` (entry point), `database.py` (schema), `models.py` (API contracts)

**`backend/app/market/`:**
- Purpose: Market data subsystem with pluggable data source implementations
- Contains: Abstract interface, two implementations (simulator + Massive), cache, models, factory, and SSE streaming
- Key files: `interface.py` (contract), `cache.py` (thread-safe store), `simulator.py` (GBM), `massive_client.py` (REST API)

**`backend/app/routes/`:**
- Purpose: HTTP request handlers organized by domain
- Contains: Health checks, portfolio operations, watchlist management, chat with AI, and market data streaming
- Key files: `portfolio.py` (trades + P&L), `chat.py` (LLM integration + auto-execution), `watchlist.py` (add/remove tickers)

**`backend/tests/`:**
- Purpose: Pytest unit and integration tests
- Contains: Test fixtures, API integration tests, market data subsystem tests
- Key files: `conftest.py` (fixtures), `test_api.py` (route tests), `market/` subdirectory (data source tests)

**`db/`:**
- Purpose: Volume mount point for persistent SQLite database
- Contains: `finally.db` file created at runtime
- Created by: Backend on first startup if not present; persists across container restarts

**`planning/`:**
- Purpose: Agent reference documentation (project specification, market data design, code review notes)
- Contains: Full specification (PLAN.md), design documents, historical archives
- Consumed by: Other agents during phase planning and execution

**`.planning/codebase/`:**
- Purpose: Generated codebase maps (architecture, conventions, testing patterns, concerns)
- Generated by: GSD mappers
- Consumed by: `/gsd-plan-phase` and `/gsd-execute-phase` commands

## Key File Locations

**Entry Points:**
- `backend/app/main.py` — FastAPI application bootstrap; lifespan for startup/shutdown

**Configuration:**
- `backend/pyproject.toml` — Dependencies, test config, linting rules, coverage settings
- `.env` — Runtime environment variables (OPENROUTER_API_KEY, MASSIVE_API_KEY, LLM_MOCK, DB_PATH)
- `.env.example` — Template for required env vars

**Core Logic:**
- `backend/app/database.py` — SQLite schema definition, lazy init, seed data
- `backend/app/models.py` — Pydantic request/response models (TradeRequest, PortfolioOut, ChatOut, etc.)
- `backend/app/llm.py` — LLM integration, structured output schema, mock mode
- `backend/app/market/cache.py` — In-memory price cache, thread-safe
- `backend/app/market/interface.py` — Abstract market data source contract
- `backend/app/market/simulator.py` — GBM simulator with correlated price movements

**Routes (API Endpoints):**
- `backend/app/routes/portfolio.py` — Trade execution, P&L calculation, history
- `backend/app/routes/watchlist.py` — Add/remove tickers, validation
- `backend/app/routes/chat.py` — Message handling, LLM calls, auto-execution of trades/watchlist changes
- `backend/app/market/stream.py` — SSE endpoint for live price updates

**Testing:**
- `backend/tests/conftest.py` — Shared fixtures for all tests
- `backend/tests/test_api.py` — Integration tests for all HTTP routes
- `backend/tests/market/test_cache.py` — PriceCache thread safety, versioning
- `backend/tests/market/test_simulator.py` — GBM math, correlation verification
- `backend/tests/market/test_massive.py` — Massive API response parsing

## Naming Conventions

**Files:**
- `*.py` — Python source files
- `test_*.py` — Pytest test files
- `conftest.py` — Pytest configuration and shared fixtures
- `pyproject.toml` — uv/pip project metadata
- `main.py` — Application entry point

**Directories:**
- `app/` — Main application source
- `app/routes/` — HTTP request handlers (one per domain)
- `app/market/` — Market data subsystem
- `tests/` — Test files (structure mirrors `app/`)
- `db/` — Database volume mount point

**Python Modules:**
- `interface.py` — Abstract base class (MarketDataSource)
- `models.py` — Data classes or Pydantic models
- `cache.py` — In-memory or persistent caching logic
- `simulator.py` — Simulation implementation
- `factory.py` — Factory function (create_market_data_source)
- `stream.py` — Streaming/WebSocket/SSE handling
- `conftest.py` — Pytest configuration

**Functions/Classes:**
- `create_*` — Factory functions (create_market_data_source, create_stream_router)
- `_*` — Private functions (internal helpers, not part of public API)
- `Test*` — Test classes (TestHealth, TestPortfolio, TestTrade)
- `*Source` — Market data source implementations (SimulatorDataSource, MassiveDataSource)
- `*Request` / `*Out` — Pydantic request/response models (TradeRequest, PortfolioOut)

**Variables:**
- `_SCHEMA` — Module-level constant (database schema string)
- `_MODEL` — Constant (LLM model identifier)
- `_RESPONSE_SCHEMA` — Constant (JSON schema for LLM output)
- `USER_ID` — Constant (hardcoded "default" for single-user)
- `router` — FastAPI APIRouter instance

## Where to Add New Code

**New API Endpoint:**
- Primary code: Create route function in appropriate file under `app/routes/` (or new file if domain doesn't exist)
- Path aliases: Use FastAPI decorator `@router.get()`, `@router.post()`, etc.
- Models: Define request/response Pydantic models in `app/models.py` (or route file if very small)
- Tests: Add test class to `backend/tests/test_api.py` or new file if large
- Example: To add `/api/orders`, create new route function in new `app/routes/orders.py`, define models in `app/models.py`, add tests to `tests/test_api.py`

**New Market Data Source:**
- Implementation: New class inheriting from `MarketDataSource` in new file `app/market/{source_name}.py`
- Factory: Update `app/market/factory.py` to detect and instantiate new source
- Tests: Add test class to `backend/tests/market/test_{source_name}.py`
- Example: To add Bloomberg API, create `app/market/bloomberg_client.py`, implement interface, update factory, add tests

**New Feature Spanning Multiple Routes:**
- Database: Update schema in `app/database.py` (add table or column)
- Models: Add request/response models to `app/models.py`
- Routes: Create/update route files in `app/routes/`
- Tests: Add tests to `backend/tests/test_api.py`
- Example: To add position alerts, add table to schema, add route to handle alert config, add tests

**Utility Functions:**
- Location: Create new file in `app/` if general; otherwise add to domain module
- Example: Add `app/calculations.py` for shared math logic; add `portfolio_functions()` to `app/routes/portfolio.py` if specific to portfolio domain

**Test Fixtures:**
- Location: `backend/tests/conftest.py` for shared fixtures (used by multiple test files)
- Scope: Use `@pytest.fixture` for function scope (default), `@pytest_asyncio.fixture` for async fixtures
- Example: Add `@pytest.fixture def mock_llm_response()` to conftest for use across chat tests

## Special Directories

**`backend/.venv/`:**
- Purpose: Python virtual environment (created by `uv sync`)
- Generated: Yes, by uv
- Committed: No (in .gitignore)

**`backend/.pytest_cache/`:**
- Purpose: Pytest cache for test discovery optimization
- Generated: Yes, by pytest
- Committed: No (in .gitignore)

**`backend/.ruff_cache/`:**
- Purpose: Ruff linter cache
- Generated: Yes, by ruff
- Committed: No (in .gitignore)

**`backend/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes, by Python
- Committed: No (in .gitignore)

**`db/`:**
- Purpose: SQLite database file storage location (mounted as volume in Docker)
- Generated: Yes, by backend on first startup
- Committed: No; `db/finally.db` in .gitignore, but `db/.gitkeep` committed to ensure directory exists

---

*Structure analysis: 2026-04-20*
