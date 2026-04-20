# Coding Conventions

**Analysis Date:** 2026-04-20

## Naming Patterns

**Files:**
- All Python files use `snake_case` with lowercase: `models.py`, `database.py`, `main.py`
- TypeScript/Playwright test files use `kebab-case`: `startup.spec.ts`, `trading.spec.ts`
- Core modules grouped logically under their domain: `app/market/`, `app/routes/`, `backend/tests/`

**Functions and Methods:**
- Python uses `snake_case`: `_get_portfolio()`, `_now()`, `add_ticker()`, `get_price()`
- Private functions prefixed with underscore: `_db_path()`, `_seed()`, `_portfolio_context()`
- Async functions use `async def` naming convention consistent with sync counterparts
- Example: `async def chat(body: ChatRequest, request: Request)` — no prefix for async

**Variables:**
- Python module-level constants use `UPPER_SNAKE_CASE`: `DEFAULT_TICKERS`, `TRADING_SECONDS_PER_YEAR`, `_MODEL`, `_SYSTEM_PROMPT`
- Local variables use `snake_case`: `cash_balance`, `ticker`, `avg_cost`, `current_price`
- Type hints always present on class attributes and function parameters in Python

**Types:**
- Pydantic models end with `Request`, `Out`, or descriptive suffixes: `TradeRequest`, `PortfolioOut`, `PositionOut`, `ChatOut`
- Dataclasses use `PascalCase`: `PriceUpdate`
- Union types use modern `|` syntax (not `Union[A, B]`): `float | None`, `dict[str, float]`

## Code Style

**Formatting:**
- Python: Ruff formatter with 100-character line length (see `pyproject.toml`)
- TypeScript: Playwright tests follow browser standard patterns
- Import statement organization: `from __future__ import annotations` always first

**Linting:**
- **Python (Ruff):** `pyproject.toml` configures linting with rules: `E`, `F`, `I`, `N`, `W`
  - `E`: PEP 8 errors
  - `F`: Pyflakes (undefined names, unused imports)
  - `I`: isort (import sorting)
  - `N`: pep8-naming (naming conventions)
  - `W`: Pycodestyle warnings
  - Line-too-long (`E501`) ignored — handled by formatter
- **TypeScript:** Standard Playwright test style, no specific linter in config

**Python Type Hints:**
- Explicit type hints on all function parameters and return types
- Use `from __future__ import annotations` to avoid forward reference issues
- Examples from codebase:
  ```python
  async def execute_trade(body: TradeRequest, request: Request) -> TradeOut:
  async def call_llm(portfolio_context: str, history: list[dict], user_message: str) -> dict[str, Any]:
  def step(self) -> dict[str, float]:
  ```

## Import Organization

**Order:**
1. `from __future__ import annotations` (always first)
2. Standard library imports (`import asyncio`, `from pathlib import Path`)
3. Third-party imports (`from fastapi import`, `import numpy`, `from pydantic import`)
4. Local imports (`from app.database import`, `from .models import`)

**Path Aliases:**
- No path aliases used in the backend
- Imports use absolute paths from `app` root: `from app.database import`, `from app.market import`
- Circular imports avoided through careful module organization

**Barrel Files:**
- `app/market/__init__.py` and `app/routes/__init__.py` exist but are minimal
- Most imports reference specific modules directly rather than barrel exports
- Exception: `app/market/__init__.py` re-exports public types for convenience

## Error Handling

**HTTP Errors:**
- FastAPI `HTTPException` raised for all HTTP-level errors
- Status codes follow REST conventions:
  - 200/201: Success
  - 400: Bad request (validation, business logic failure)
  - 404: Not found (ticker not in cache, position doesn't exist)
  - 409: Conflict (duplicate watchlist entry)
  - 502: Gateway error (LLM service failure)

**Example patterns:**
```python
if body.quantity <= 0:
    raise HTTPException(status_code=400, detail="quantity must be > 0")
if update is None:
    raise HTTPException(status_code=404, detail=f"No price available for {ticker}")
if existing:
    raise HTTPException(status_code=409, detail=f"{ticker} is already on your watchlist")
```

**Database Errors:**
- No explicit try-catch for database operations; failures propagate as exceptions
- Database context manager (`get_db()`) handles connection lifecycle
- Failed queries result in automatic HTTP 500 errors (not caught explicitly)

**LLM Errors:**
- Mock mode (`LLM_MOCK=true`) returns deterministic safe responses
- Missing API key returns descriptive error message in chat response, not HTTP error
- Invalid JSON from LLM is gracefully handled: `except json.JSONDecodeError: return {"message": raw, ...}`

## Logging

**Framework:** Python `logging` module, accessed via `logger = logging.getLogger(__name__)`

**Patterns:**
- Module-level logger definition: `logger = logging.getLogger(__name__)`
- Used sparingly in long-running background tasks: `SimulatorDataSource`, `MassiveDataSource`
- Example from `simulator.py`: `logger.info(f"GBMSimulator: started with {n} tickers")`
- No structured logging; simple formatted messages

**Guidelines:**
- Log lifecycle events (start/stop) in background tasks
- Do NOT log every price update or cache operation (too verbose)
- Log errors or unusual conditions (e.g., missing tickers, API failures)

## Comments

**When to Comment:**
- Function/class docstrings required for all public APIs and classes
- Inline comments used sparingly — only for non-obvious algorithmic details
- No redundant comments that restate code: `x = 5  # Set x to 5` is bad

**JSDoc/TSDoc:**
- Python docstrings (triple-quoted) used for all public functions and classes
- Format: Single-line or multi-line as needed
- Example from `models.py`:
  ```python
  def update(self, ticker: str, price: float, timestamp: float | None = None) -> PriceUpdate:
      """Record a new price for a ticker. Returns the created PriceUpdate.

      Automatically computes direction and change from the previous price.
      If this is the first update for the ticker, previous_price == price (direction='flat').
      """
  ```

## Function Design

**Size:**
- Functions kept short; complex logic broken into helpers
- Example: `_get_portfolio()`, `_portfolio_context()`, `_load_history()` are all extracted helpers for clarity

**Parameters:**
- Prefer explicit parameters over global state
- Use Pydantic models for request bodies: `body: TradeRequest`, `body: ChatRequest`
- Request object passed explicitly for access to app state: `request: Request` gives access to `request.app.state.price_cache`
- No magic implicit dependencies

**Return Values:**
- Functions return Pydantic models or plain data structures, never None for success cases
- Optional returns explicitly typed: `PriceUpdate | None`, `dict[str, Any]`
- Trade execution and chat endpoints return structured models, never raw JSON strings

## Module Design

**Exports:**
- `app/` directory is a package with `__init__.py` (present but minimal)
- Public APIs exported from module-level: `from app.market import PriceCache, create_market_data_source`
- Routes registered in `main.py` via `include_router()`

**Barrel Files:**
- `app/market/__init__.py` re-exports key types for convenience:
  ```python
  from .cache import PriceCache
  from .models import PriceUpdate
  from .factory import create_market_data_source
  from .stream import create_stream_router
  ```
- `app/routes/__init__.py` is empty; routes imported directly in `main.py`

**Module Cohesion:**
- Market data subsystem (`app/market/`) fully self-contained: `SimulatorDataSource`, `MassiveDataSource`, `PriceCache`, `stream router`
- Routes (`app/routes/`) depend on core models and database but are loosely coupled
- Database module (`app/database.py`) has no external dependencies besides SQLite

## Data Classes and Models

**Pydantic Models:**
- Used for all API request/response validation: `TradeRequest`, `PortfolioOut`, `ChatOut`
- Immutable where appropriate (no explicit `frozen=True`, but treated as immutable)
- Minimal field validation; business logic validation in route handlers

**Dataclasses:**
- `PriceUpdate` defined as `frozen=True, slots=True` for immutability and memory efficiency
- Properties computed on-demand: `change`, `change_percent`, `direction`
- Explicit `to_dict()` method for serialization: `update.to_dict()` for JSON/SSE

## Transaction and State Management

**Database:**
- All writes wrapped in explicit `await db.commit()` after execute
- No ORM; raw SQL with parameterized queries to prevent injection
- Transactions are implicit per statement (aiosqlite auto-commits unless in explicit transaction)

**Price Cache:**
- Thread-safe via `threading.Lock` (not `asyncio.Lock` — intentional, see code comment)
- Single writer (SimulatorDataSource or MassiveDataSource, never both)
- Multiple readers (SSE, portfolio routes, trade execution)

## Async/Await Patterns

**FastAPI Routes:**
- All route handlers are `async def` even if not awaiting anything
- Database operations use `await get_db()` context manager
- Example: `async def get_portfolio(request: Request):`

**Background Tasks:**
- Long-lived tasks wrapped in `asyncio.create_task()` in lifespan: `await source.start(initial_tickers)`
- Cleanup on shutdown: `snapshot_task.cancel()` and `await source.stop()`

**Generators and Context Managers:**
- Database access via `async with get_db() as db:` context manager
- Lifespan management via `@asynccontextmanager async def lifespan(app):`

## Constants and Configuration

**Environment Variables:**
- Read from `.env` file via `python-dotenv` load at startup
- Examples: `OPENROUTER_API_KEY`, `MASSIVE_API_KEY`, `LLM_MOCK`, `DB_PATH`
- Configuration logic: `def _api_key() -> str | None:` and `def _is_mock() -> bool:`
- Defaults applied if not set

**Magic Strings:**
- Minimal magic strings; ticker validation uses regex: `_TICKER_RE = re.compile(r"^[A-Z]{1,5}$")`
- User ID hardcoded as `"default"` for single-user mode (duplicated in routes for clarity)

## Code Examples

**Async Database Pattern:**
```python
async with get_db() as db:
    row = await (
        await db.execute(
            "SELECT cash_balance FROM users_profile WHERE user_id = ?", (USER_ID,)
        )
    ).fetchone()
    cash = row["cash_balance"] if row else 10000.0
```

**Error Handling Pattern:**
```python
if body.side not in ("buy", "sell"):
    raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")
```

**Type Hinting Pattern:**
```python
async def call_llm(portfolio_context: str, history: list[dict], user_message: str) -> dict[str, Any]:
```

---

*Convention analysis: 2026-04-20*
