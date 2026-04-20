# Testing Patterns

**Analysis Date:** 2026-04-20

## Test Framework

**Backend (Python):**
- **Runner:** pytest 8.3.0+
- **Config:** `backend/pyproject.toml` with `[tool.pytest.ini_options]`
- **Async Support:** pytest-asyncio 0.24.0+ with `asyncio_mode = "auto"`
- **Coverage:** pytest-cov 5.0.0+

**Frontend E2E (TypeScript):**
- **Runner:** Playwright 1.48.0+
- **Config:** `test/playwright.config.ts`
- **Assertion Library:** Built-in Playwright assertions (`expect()`)

**Run Commands:**
```bash
# Backend tests
cd backend
uv run --extra dev pytest -v              # Run all tests
uv run --extra dev pytest --cov=app       # With coverage report
uv run --extra dev pytest -k test_name    # Run specific test by name
uv run --extra dev pytest tests/test_api.py  # Run specific test file

# E2E tests (app must be running on localhost:8000)
cd test
npm test                                   # Run all E2E tests
npm run test:headed                        # Run with browser UI visible
npm run test:report                        # View last test report
```

## Test File Organization

**Location:**
- Backend unit/integration tests: `backend/tests/` — mirrors `app/` structure
- E2E tests: `test/specs/` — organized by feature/scenario

**Naming:**
- Python: `test_*.py` files (configured in `pyproject.toml`)
- TypeScript: `*.spec.ts` files
- Test classes: `Test*` (camelCase with `Test` prefix)
- Test functions: `test_*` (snake_case)

**Structure:**
```
backend/
├── tests/
│   ├── conftest.py           # Shared fixtures (seeded_db, client, etc.)
│   ├── test_api.py           # API integration tests
│   └── market/
│       ├── test_simulator.py
│       ├── test_cache.py
│       ├── test_factory.py
│       └── test_models.py

test/
├── specs/
│   ├── startup.spec.ts
│   ├── trading.spec.ts
│   ├── watchlist.spec.ts
│   ├── chat.spec.ts
│   └── sse-resilience.spec.ts
├── playwright.config.ts
└── package.json
```

## Test Structure

**Backend Test Suite Organization:**

```python
class TestPortfolio:
    """Test class grouping portfolio-related tests."""
    
    async def test_initial_cash_balance_is_10000(self, client):
        """Test that initial portfolio has correct cash balance."""
        resp = await client.get("/api/portfolio")
        assert resp.status_code == 200
        assert resp.json()["cash_balance"] == pytest.approx(10000.0)
```

**Patterns:**
- Use test classes to group related tests by feature
- Class name describes the API/feature tested: `TestPortfolio`, `TestTrade`, `TestHealth`
- Each test method focuses on one assertion or behavior
- Descriptive test names end with what is being tested: `test_initial_cash_balance_is_10000`

**Setup/Teardown:**
- `conftest.py` provides shared fixtures (not per-test setup methods)
- Fixtures are parameterized and reusable across test classes
- No explicit teardown; pytest handles cleanup via fixture scope

**Playwright E2E Structure:**

```typescript
test.describe("Trading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("trade-bar")).toBeVisible({ timeout: 10_000 });
  });

  test("buying shares reduces cash balance", async ({ page }) => {
    const cashEl = page.getByTestId("cash-balance");
    const cashBefore = await cashEl.textContent();
    
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("trade-qty").fill("1");
    await page.getByTestId("btn-buy").click();
    
    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });
  });
});
```

**Patterns:**
- `test.describe()` groups related tests by scenario (not class-based)
- `test.beforeEach()` setup shared before each test in the describe block
- Each test uses page fixtures and locators with `getByTestId()` or `getByText()`
- Wait timeouts explicit in assertions: `{ timeout: 5_000 }`

## Mocking

**Backend Mocking:**

**LLM Mocking:**
- Controlled via `LLM_MOCK=true` environment variable (not pytest-mock)
- Function `_is_mock()` in `app/llm.py` checks the env var
- When true, returns deterministic mock response: `_MOCK_RESPONSE` dict
- Allows all other functionality to work normally (database, API routes)

```python
_MOCK_RESPONSE = {
    "message": "I'm analyzing your portfolio. Everything looks good!...",
    "trades": [],
    "watchlist_changes": [],
}

def _is_mock() -> bool:
    return os.environ.get("LLM_MOCK", "").lower() == "true"

async def call_llm(portfolio_context: str, history: list[dict], user_message: str) -> dict[str, Any]:
    if _is_mock():
        return _MOCK_RESPONSE
    # ... real LLM call
```

**Price Cache Mocking:**
- In test fixtures, inject a pre-populated `PriceCache` instance
- Example from `conftest.py`:
  ```python
  @pytest.fixture
  def price_cache_with_prices():
      cache = PriceCache()
      cache.update("AAPL", 190.50)
      cache.update("GOOGL", 175.00)
      cache.update("TSLA", 250.00)
      return cache
  ```
- Override app state: `app.state.price_cache = price_cache_with_prices`

**Database Mocking:**
- No mocking; tests use real SQLite temp files
- Each test gets a fresh database via `seeded_db` fixture
- Fixture path patched via `monkeypatch.setenv("DB_PATH", db_file)`

**Market Data Source:**
- Not explicitly mocked; tests bypass by directly updating price cache
- Background market data source is NOT started in tests (avoids threads/async conflicts)

**Playwright Mocking:**
- No network mocking; tests run against real running backend
- LLM responses mocked via `LLM_MOCK=true` environment variable passed to backend
- All other APIs return real data (prices, trades, positions)

## Fixtures and Factories

**Backend Test Fixtures (from `conftest.py`):**

```python
@pytest_asyncio.fixture
async def seeded_db(tmp_path, monkeypatch):
    """Patch DB_PATH to a fresh per-test SQLite file and seed it."""
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    yield db_file

@pytest.fixture
def price_cache_with_prices():
    """A PriceCache pre-loaded with test prices."""
    cache = PriceCache()
    cache.update("AAPL", 190.50)
    cache.update("GOOGL", 175.00)
    cache.update("TSLA", 250.00)
    return cache

@pytest_asyncio.fixture
async def client(seeded_db, price_cache_with_prices, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient for the FastAPI app with a test database and mock price cache."""
    from app.main import app
    app.state.price_cache = price_cache_with_prices
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
```

**Fixture Scope:**
- `seeded_db`: Function scope (fresh database per test)
- `price_cache_with_prices`: Function scope (fresh cache per test)
- `client`: Function scope (new AsyncClient per test)

**Test Data Location:**
- Hardcoded seed prices in fixtures or test methods
- No external test data files; data created inline

## Coverage

**Requirements:** 
- No explicitly enforced coverage threshold
- `.coverage` file exists (generated by pytest-cov runs)
- Pragmatically tested: business logic, error cases, edge cases

**View Coverage:**
```bash
cd backend
uv run --extra dev pytest --cov=app --cov-report=html
# Opens coverage/index.html in browser
```

**Excluded from Coverage (see `pyproject.toml`):**
```
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
```

## Test Types

**Unit Tests (Backend):**
- **Scope:** Single class or function in isolation
- **Examples:** `TestPriceCache`, `TestGBMSimulator`, `test_direction_up`
- **Approach:** Instantiate the class, call methods, assert outputs
- **No external deps:** Cache tests create their own PriceCache instances
- **Location:** `backend/tests/market/test_cache.py`, `backend/tests/market/test_simulator.py`

**Integration Tests (Backend):**
- **Scope:** Full API endpoint with database
- **Examples:** `TestTrade`, `TestPortfolio`
- **Approach:** POST/GET requests via AsyncClient, assert response structure and side effects
- **External deps:** Real SQLite database (temp file), price cache fixture
- **Location:** `backend/tests/test_api.py`
- **Pattern:**
  ```python
  async def test_buy_reduces_cash_and_creates_position(self, client):
      resp = await client.post(
          "/api/portfolio/trade",
          json={"ticker": "AAPL", "side": "buy", "quantity": 10},
      )
      assert resp.status_code == 200
      portfolio = (await client.get("/api/portfolio")).json()
      assert portfolio["cash_balance"] == pytest.approx(10000.0 - 10 * 190.50)
  ```

**E2E Tests (Playwright):**
- **Scope:** Full application flow from user perspective
- **Examples:** `startup.spec.ts`, `trading.spec.ts`, `chat.spec.ts`
- **Approach:** Navigate page, interact with UI elements, wait for expected states
- **External deps:** Running backend at localhost:8000 (optionally with LLM_MOCK=true)
- **Location:** `test/specs/*.spec.ts`
- **Infrastructure:** `docker-compose.test.yml` spins up app + Playwright container
- **Pattern:**
  ```typescript
  test("buying shares reduces cash balance", async ({ page }) => {
    const cashBefore = await page.getByTestId("cash-balance").textContent();
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("trade-qty").fill("1");
    await page.getByTestId("btn-buy").click();
    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });
    const cashAfter = await page.getByTestId("cash-balance").textContent();
    expect(cashBefore).not.toBe(cashAfter);
  });
  ```

## Common Patterns

**Async Testing (Backend):**

All backend tests are async by default due to `asyncio_mode = "auto"` in pytest config.

```python
async def test_buy_reduces_cash_and_creates_position(self, client):
    resp = await client.post("/api/portfolio/trade", json={...})
    assert resp.status_code == 200
```

Async fixtures use `@pytest_asyncio.fixture`:
```python
@pytest_asyncio.fixture
async def seeded_db(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("DB_PATH", db_file)
    await init_db()
    yield db_file
```

**Error Testing (Backend):**

Errors are tested via HTTP status codes and detail messages:

```python
async def test_buy_requires_sufficient_cash(self, client):
    resp = await client.post(
        "/api/portfolio/trade",
        json={"ticker": "AAPL", "side": "buy", "quantity": 100000},
    )
    assert resp.status_code == 400
    assert "cash" in resp.json()["detail"].lower()
```

**Waiting in E2E Tests:**

Playwright uses timeout assertions to wait for async state changes:

```typescript
// Wait for element to appear with explicit timeout
await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });

// Wait for text content to change
const cashAfter = await page.getByTestId("cash-balance").textContent();
expect(cashBefore).not.toBe(cashAfter);

// Explicit wait for DOM
await page.waitForTimeout(1000);  // Only when necessary; prefer expect() timeouts
```

**Floating Point Comparisons:**

Use `pytest.approx()` for floating point comparisons to handle rounding:

```python
assert resp.json()["cash_balance"] == pytest.approx(10000.0 - 10 * 190.50)
assert position["avg_cost"] == pytest.approx(190.50)
```

**Test Isolation:**

Each test is independent:
- Fixtures create fresh database per test
- No shared state between tests
- Async fixtures properly cleaned up by pytest-asyncio

## Test Configuration Details

**`pyproject.toml` Settings:**
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]              # Where to find tests
python_files = ["test_*.py"]       # Test file naming pattern
python_classes = ["Test*"]         # Test class naming pattern
python_functions = ["test_*"]      # Test function naming pattern
asyncio_mode = "auto"              # Auto-detect async tests
asyncio_default_fixture_loop_scope = "function"  # Fresh event loop per test
```

**`playwright.config.ts` Settings:**
```typescript
{
  testDir: "./specs",
  timeout: 30_000,                 // 30 second per-test timeout
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: 1,                      // Run tests sequentially (not in parallel)
  reporter: [["html"], ["list"]], // HTML report + console list
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8000",
    trace: "on-first-retry",       // Record trace on first failure
    screenshot: "only-on-failure", // Capture screenshot on failure
    video: "retain-on-failure",    // Record video on failure
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
}
```

## Running Tests

**Backend All Tests:**
```bash
cd backend
uv run --extra dev pytest -v
```

**Backend Specific Test File:**
```bash
cd backend
uv run --extra dev pytest tests/test_api.py -v
```

**Backend Specific Test by Name:**
```bash
cd backend
uv run --extra dev pytest -k "test_buy_reduces_cash" -v
```

**Backend with Coverage:**
```bash
cd backend
uv run --extra dev pytest --cov=app --cov-report=html
# View coverage/index.html
```

**E2E Tests (via docker-compose):**
```bash
cd test
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
# Or manually:
# 1. cd .. && docker build -t finally . && docker run -p 8000:8000 finally
# 2. cd test && npm test
```

**E2E Tests (headed mode with browser UI):**
```bash
cd test
npm run test:headed
```

**View E2E Test Report:**
```bash
cd test
npm run test:report
```

## Test-Specific Environment

**LLM_MOCK=true:**
- Set automatically for E2E tests via docker-compose.test.yml
- Can be set manually for backend integration tests if testing chat endpoints
- Causes `app/llm.py` to return deterministic mock response instead of calling OpenRouter

**Example docker-compose.test.yml:**
```yaml
services:
  app:
    environment:
      LLM_MOCK: "true"
      # Other vars
```

## Gaps and Limitations

- **No frontend unit tests** (React/Next.js component tests) — E2E via Playwright is primary coverage
- **No load/performance tests** — manual testing only
- **Market data source** (SimulatorDataSource, MassiveDataSource) tested via unit tests, not integration tests with actual network calls
- **Portfolio snapshot background task** tested indirectly via integration tests, not directly

---

*Testing analysis: 2026-04-20*
