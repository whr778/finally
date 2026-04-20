# Codebase Concerns

**Analysis Date:** 2026-04-20

## Tech Debt

**Database schema inconsistency in `users_profile` table:**
- Issue: The table defines both `id TEXT PRIMARY KEY` and `user_id TEXT DEFAULT 'default'`. Queries in `portfolio.py` filter by `id` while all other tables filter by `user_id`. The plan specifies only `user_id` as the identifier.
- Files: `backend/app/database.py` (lines 14-18), `backend/app/routes/portfolio.py` (lines 25-27, 95-97)
- Impact: Watchlist and chat routes will need to normalize this inconsistency. Multi-user migration will require schema changes. Confusing queries reduce maintainability.
- Fix approach: Refactor `users_profile` to use only `user_id TEXT PRIMARY KEY` (no separate `id` column). Update all queries in `portfolio.py` to filter by `user_id` instead. Create a database migration or update `init_db()` to handle the schema change.

**Bare `except: pass` silently swallows errors in critical paths:**
- Issue: Exception handlers at `main.py:64`, `portfolio.py:169`, and `market/simulator.py:238` catch all exceptions and pass silently. Errors are neither logged nor propagated, making debugging production issues difficult.
- Files: `backend/app/main.py` (line 64), `backend/app/routes/portfolio.py` (line 169), `backend/app/market/simulator.py` (line 238)
- Impact: Snapshot failures in the background task disappear. Trade snapshot logic errors hide. Simulator exceptions silently halt the update loop, leaving stale prices. The frontend receives no indication of failure.
- Fix approach: Replace bare `except:` with `except Exception as e:` and log the error at minimum. In `main.py`, log the snapshot failure but maintain the silent failure pattern (snapshot loss is acceptable). In `portfolio.py`, wrap the snapshot call in a try/except so snapshot failure does not surface as a trade failure (already partially implemented). In `simulator.py`, add logging and optionally re-raise if the exception is non-recoverable.

**Duplicate trade execution logic between portfolio and chat routes:**
- Issue: Buy/sell logic is duplicated across `portfolio.py` (lines 100-153) and `chat.py` (lines 137-183). Changes to position math, cash updates, or validation must be replicated in both places. This violates DRY and creates divergence risk.
- Files: `backend/app/routes/portfolio.py`, `backend/app/routes/chat.py`
- Impact: Bug fix or logic change must be applied twice. The chat route may execute trades differently than manual trades, confusing users. If one is updated and the other is not, the behavior diverges.
- Fix approach: Extract trade execution logic into a shared function in `backend/app/services/trading.py` (new file). Both routes call this function with trade parameters. Return a structured result that includes success/failure and error details. The chat route uses the same error handling as the portfolio route.

## Known Bugs

**Test database isolation is broken:**
- Symptoms: Tests share database state across functions. `test_initial_cash_balance_is_10000` fails if run after `test_buy_reduces_cash_and_creates_position`. Trade tests modify cash balance, subsequent tests observe the modified value.
- Files: `backend/tests/conftest.py`
- Trigger: Run tests in a random order (pytest is often configured to randomize). Reproducer: `pytest -v --random-order` or run portfolio trade tests before portfolio cash balance tests.
- Workaround: Force test execution order (fragile). Always run as `pytest -p no:randomly` (defeats the point of random testing).
- Root cause: `db_path` fixture is `scope="session"` (one temp file for entire test run), but `seeded_db` re-initializes it before each test. The app module is imported once per process, so the cached DB connection may be reused across tests. Fix: make `db_path` function-scoped (`scope="function"`).

**Snapshot failure after successful trade returns 500 error:**
- Symptoms: Trade executes (cash and position update correctly), but the API response is HTTP 500 and an error message is returned to the client. The client sees failure although the trade committed.
- Files: `backend/app/routes/portfolio.py` (lines 166-169)
- Trigger: Trade endpoint is called when the database is locked or another error occurs during `_insert_snapshot()`. The try/except at line 168 currently does nothing; the exception propagates.
- Workaround: None. The user sees failure and may retry, creating duplicate trades.
- Root cause: `_insert_snapshot()` is called outside the transaction block and errors are not caught. The trade itself has already committed, so the error should not fail the trade endpoint. Fix: wrap `_insert_snapshot()` in try/except and return success even if snapshot fails. Log the snapshot error separately.

**Massive API client test is flaky:**
- Symptoms: `test_malformed_snapshot_skipped` fails with `AssertionError: assert <MagicMock...> is None`. The test expects that malformed snapshots are skipped (no price recorded), but a MagicMock is returned instead.
- Files: `backend/tests/market/test_massive.py` (line 68)
- Trigger: Run the test. The mock snapshot object has a `.day.close` attribute chain, which the `_extract_price()` method can access (MagicMock creates attributes on access). The method does not find `.last_trade` but succeeds on `.day.close`, so a mocked price is stored.
- Workaround: Make the mock more explicit by setting all fallback attributes to None: `bad_snap.day = MagicMock(close=None)`.
- Root cause: The test's mock object is too permissive. The `_extract_price()` method has three fallback chains, and MagicMock allows all of them. Fix: explicitly set `day` and `prev_day` to None in the bad snapshot mock, not just `last_trade`.

## Security Considerations

**No input validation on ticker symbols in watchlist add endpoint:**
- Risk: The watchlist add route (`watchlist.py` line 54) validates tickers with regex `^[A-Z]{1,5}$`, rejecting invalid symbols. However, the chat route (`chat.py` line 206) does not validate tickers before passing them to the watchlist or trade logic. An LLM could generate an invalid ticker string and the route accepts it.
- Files: `backend/app/routes/watchlist.py` (line 54), `backend/app/routes/chat.py` (line 206)
- Current mitigation: The watchlist add logic at line 218 will reject invalid tickers with a 400 error, but the chat response will include the failure. For trades, the cache.get() lookup will fail and return an error. The error is not catastrophic but is inconsistent.
- Recommendations: Extract the ticker validation regex to a shared utility function (`backend/app/utils/validation.py`). Use it in watchlist add, chat, and any other routes that accept tickers. Validate before any DB operations.

**LLM response parsing does not validate trade quantities:**
- Risk: The LLM can generate any float value for quantity. Values like `999999.99` or `0.00001` are accepted without validation. A float parsing error in the LLM response structure could produce NaN or infinity.
- Files: `backend/app/routes/chat.py` (line 122)
- Current mitigation: The `float()` cast at line 122 is wrapped in try/except, so parsing errors are caught. The trade execution logic validates `quantity > 0` at portfolio.py line 78, rejecting zero. Insufficient cash prevents over-buying.
- Recommendations: Add explicit range checks in the chat route: `if quantity <= 0 or quantity > 1_000_000: raise ValueError("Invalid quantity")`. Document the acceptable range in the LLM system prompt.

**No authentication or authorization (by design):**
- Risk: All endpoints assume `user_id="default"`. The hardcoded user ID makes this a single-user system. If deployed with `OPENROUTER_API_KEY` but multiple users access the same instance, they see and modify each other's portfolios, trades, and chat history.
- Files: All route files (portfolio.py, watchlist.py, chat.py) define `USER_ID = "default"`
- Current mitigation: This is documented in the PLAN as intentional for MVP. The design supports future multi-user by including `user_id` in all tables.
- Recommendations: Before deploying publicly, implement authentication (API key per user, session tokens, or reverse proxy auth). Dynamically read `user_id` from the request context instead of hardcoding it. Add tests for multi-user isolation if authentication is added.

## Performance Bottlenecks

**SSE streaming sends all prices every 500ms regardless of change:**
- Problem: The SSE endpoint in `stream.py` lines 81-89 sends all tickers every 500ms, even if no prices changed. At 10 tickers with ~200 bytes per ticker, this is ~2KB every 500ms = 4MB/hour per client. With multiple concurrent clients, bandwidth is wasted.
- Files: `backend/app/market/stream.py` (lines 81-89)
- Cause: The streaming logic uses `price_cache.version` to detect any change, then sends all prices. It does not track which tickers changed.
- Improvement path: Store per-ticker version counters in the cache. On each price update, bump the ticker's counter and the global counter. In the SSE generator, only include tickers whose version has advanced since the last send. Update the frontend to merge partial updates with local state.

**Portfolio P&L snapshots recorded every 30 seconds indefinitely:**
- Problem: `main.py` lines 49 and 57-64 create a snapshot every 30 seconds without limit. Over a 24-hour day, 2,880 snapshots accumulate per user. Over a year, 1M+ snapshots bloat the database.
- Files: `backend/app/main.py` (lines 49, 57-64)
- Cause: Snapshots are useful for intraday P&L charts but unnecessary after market close. The plan (section 7) specifies end-of-day consolidation, but it is not implemented.
- Improvement path: Implement the end-of-day consolidation task. At 4:00 PM America/New_York (if applicable to simulator mode), archive intraday snapshots by computing a single end-of-day value and deleting the rest. Use APScheduler or a separate scheduled task. For simulator mode, define "market close" as a fixed time (e.g., after 10,000 steps) or make it configurable.

**Cholesky decomposition rebuilds on every watchlist add/remove:**
- Problem: `simulator.py` line 154 rebuilds the correlation matrix Cholesky decomposition (O(n²) math) every time a ticker is added or removed. Adding 10 tickers sequentially = 10 rebuilds.
- Files: `backend/app/market/simulator.py` (lines 154-172)
- Cause: Conservative design to ensure correlation matrix is always correct. For typical watchlists (10-50 tickers), this is acceptable. But at scale (100+ tickers), rebuilds become expensive.
- Improvement path: Batch add/remove operations (e.g., `add_tickers(list)`) so Cholesky rebuilds once. For single-ticker operations, the cost is negligible. Document the O(n²) cost in the docstring.

**Database queries use `SELECT *` in portfolio calculations:**
- Problem: `portfolio.py` line 34 and `chat.py` line 40 fetch all positions to calculate portfolio value. If positions table has 100+ rows, unnecessary columns are transferred.
- Files: `backend/app/routes/portfolio.py` (line 34), `backend/app/routes/chat.py` (line 40)
- Cause: Queries are simple and correctness is prioritized over optimization. The single-user design means portfolio size is small.
- Improvement path: Use explicit column lists in SELECT clauses: `SELECT ticker, quantity, avg_cost FROM positions WHERE...`. This is a best practice and makes queries self-documenting. Impact is minimal for typical portfolio sizes.

## Fragile Areas

**Trade execution transaction logic is complex and error-prone:**
- Files: `backend/app/routes/portfolio.py` (lines 92-164), `backend/app/routes/chat.py` (lines 129-194)
- Why fragile: The logic involves multiple DB operations (fetch cash, fetch position, update position or insert, update cash, insert trade). If an operation between fetch and commit fails, the state is inconsistent. If the order of operations changes, calculations may use stale values (e.g., avg_cost computed on old position data).
- Safe modification: Add comprehensive unit tests that verify: (1) cash and position are consistent before and after, (2) avg_cost is correctly calculated for multiple buys, (3) position deletion occurs at the right threshold (< 1e-9), (4) fractional shares round correctly. Use a test database snapshot before each trade test, allowing rollback. Create a `test_trade_scenarios.py` that covers edge cases: buy/sell same ticker multiple times, sell partial position, sell exact position, buy with all cash, sell for all cash.
- Test coverage: The existing tests cover basic buy/sell logic but not complex scenarios. Add tests for: (1) buying same ticker three times with different prices, (2) selling portion then buying again, (3) edge case at 1e-9 threshold, (4) concurrent trades (async test).

**LLM structured output parsing has minimal error handling:**
- Files: `backend/app/llm.py` (lines 96-110), `backend/app/routes/chat.py` (lines 111-252)
- Why fragile: The LLM response format is defined by schema but is not strictly validated. If the LLM returns malformed JSON or missing required fields, the parser at `llm.py` line 108 falls back to returning the raw content as a message. If `json.loads()` fails, the except clause returns a generic response. The chat route then tries to access `llm_resp.get("trades")` expecting a list, but it could be None or a string.
- Safe modification: Use Pydantic to validate the LLM response against a schema. Define a `ChatResponse` model with required fields `message`, optional `trades` and `watchlist_changes` lists. Parse the raw JSON into this model, raising validation errors if the structure is invalid. In the except clause, return a structured error response to the user, not a raw fallback.
- Test coverage: Add tests for: (1) LLM returns valid JSON but missing `message` field, (2) LLM returns non-JSON text, (3) `trades` list contains invalid trade objects (e.g., invalid side), (4) LLM times out or returns 500 error.

**Watchlist and chat routes are duplicated logic:**
- Files: `backend/app/routes/watchlist.py`, `backend/app/routes/chat.py` (watchlist changes section)
- Why fragile: Watchlist add/remove logic is implemented in both routes. A bug fix or feature change (e.g., validate ticker format differently) must be applied twice. If one route is updated and the other is not, behavior diverges.
- Safe modification: Extract watchlist operations into a shared service module (`backend/app/services/watchlist.py`). Define functions `add_ticker(user_id, ticker)` and `remove_ticker(user_id, ticker)` that handle all validation and DB operations. Both routes call these functions. Add unit tests for the service functions in isolation.

## Scaling Limits

**Single-user hardcoded limit:**
- Current capacity: One user per deployment (hardcoded `user_id="default"` throughout).
- Limit: Deployment can only support one user because there is no authentication and no way to distinguish users. All data is shared.
- Scaling path: Implement multi-user support by extracting `user_id` from request context (API key, session token, JWT). Update all route handlers to read `user_id` from the request. Refactor database isolation by ensuring all queries filter by the correct `user_id`. Add tests for multi-user scenarios (two users should not see each other's data).

**Database I/O on every portfolio fetch:**
- Current capacity: ~10 positions per user. Portfolio fetch queries the DB for cash and positions on every GET. At 100+ positions, query latency increases linearly.
- Limit: High-frequency polling of portfolio (e.g., frontend polls every 100ms) causes DB contention. SSE-based portfolio updates would be more efficient.
- Scaling path: Implement portfolio change notification via SSE or WebSocket. On trade execution or snapshot update, push new portfolio data to connected clients. Clients subscribe to updates instead of polling.

**In-memory price cache has no size limit:**
- Current capacity: ~10 tickers in default watchlist. Price cache stores one PriceUpdate object (~200 bytes) per ticker.
- Limit: With unlimited watchlist additions, the cache grows unbounded. 1000 tickers = ~200KB (negligible). But memory leaks are possible if tickers are added but never removed.
- Scaling path: Add a max size limit to the cache. When adding a ticker would exceed the limit, evict the least recently accessed ticker. Add a metric to monitor cache size and warn if it grows unexpectedly.

## Dependencies at Risk

**LiteLLM dependency on OpenRouter:**
- Risk: The project depends on LiteLLM to call OpenRouter's API, which itself is a proxy to Cerebras inference. Two levels of abstraction add latency and failure points. OpenRouter could rate-limit, change pricing, or deprecate the API.
- Impact: Chat feature is unavailable if OpenRouter is down. Users cannot use the AI assistant. The system degrades gracefully (returns a message that chat is unavailable), so trading and watchlist functionality continue.
- Migration plan: Evaluate direct Cerebras integration (skip OpenRouter). Alternatively, support multiple LLM providers (Anthropic, OpenAI) as fallbacks. Add retry logic with exponential backoff in `call_llm()`. Allow disabling chat feature via environment variable if LLM service is unavailable.

**Massive (Polygon.io) API dependency:**
- Risk: Real market data is optional (simulator is used if the API key is not set). But if set and the API is down, the poller logs errors and continues retrying. This could cause stale prices in the cache for hours if the outage is long.
- Impact: Prices shown in the frontend are hours old. Users may make trading decisions based on outdated data. The connection status indicator should alert users if data is stale.
- Migration plan: Add a staleness check to the cache. If no price update has been received in the last 5 minutes, mark data as stale. The portfolio endpoint and watchlist endpoint should include a `data_stale` flag. The frontend should show a warning if data is stale.

**aiosqlite dependency:**
- Risk: The project uses `aiosqlite` for async SQLite access. SQLite itself is single-writer, so concurrent writes are serialized. If load increases, SQLite contention becomes a bottleneck.
- Impact: At scale (many users, many trades), the database becomes a bottleneck. Switching to PostgreSQL requires significant refactoring.
- Migration plan: This is acceptable for MVP. Before scaling to many users, plan a migration to PostgreSQL. The `get_db()` context manager abstracts the database client, so switching drivers is relatively contained. But SQL queries may need adjustment (SQLite-specific syntax, UUID types, etc.).

## Missing Critical Features

**End-of-day snapshot consolidation not implemented:**
- Problem: The plan (section 7) specifies that at market close (4:00 PM America/New_York), intraday snapshots should be consolidated into a single end-of-day record. This is not implemented. Snapshots accumulate indefinitely, bloating the database.
- Blocks: The P&L chart will show dense intraday data (one point every 30 seconds) mixed with daily/weekly/monthly history, making long-term trends hard to see.
- Recommended approach: Implement a scheduled task (using APScheduler) that runs daily at 4:00 PM. It queries snapshots for the day, computes end-of-day value (the last snapshot), deletes all intraday snapshots, and inserts the consolidated record. For simulator mode, make market close configurable (e.g., after 10,000 price updates or at a fixed time).

**No health check for data staleness:**
- Problem: The `/api/health` endpoint returns `{"status": "ok"}` but does not check if price data is being updated. If the market data source crashes, the health check still returns ok.
- Blocks: Deployment monitoring cannot detect that prices are stale. Users see outdated data without warning.
- Recommended approach: Extend `/api/health` to include a `data_staleness_seconds` field. Query the price cache for the most recent update timestamp. If the time elapsed exceeds a threshold (e.g., 5 minutes), include a warning in the response or return status "degraded".

## Test Coverage Gaps

**Chat route auto-execution has minimal error path tests:**
- What's not tested: What happens if the LLM requests a trade that fails validation? Does the error get reported back to the user correctly? Can the LLM request conflicting actions (e.g., add and remove the same ticker)?
- Files: `backend/app/routes/chat.py`, `backend/tests/test_api.py`
- Risk: Edge cases in trade auto-execution could lead to silent failures (error not reported to user) or partial execution (one trade fails, another succeeds, and the response is incomplete).
- Priority: Medium. This is an important feature (LLM trading) but the existing tests cover the happy path. Add tests for: (1) trade fails with insufficient cash, error is included in response, (2) watchlist add fails (ticker invalid), error is included in response, (3) multiple trades requested, one succeeds and one fails, response shows both results.

**Watchlist CRUD endpoints have no integration tests:**
- What's not tested: The `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/{ticker}` endpoints are implemented but not tested. The E2E tests in `test/` cover watchlist operations, but there are no unit tests in the backend.
- Files: `backend/app/routes/watchlist.py`, `backend/tests/`
- Risk: Bugs in watchlist logic (duplicate detection, price cache inclusion, market source synchronization) would be caught only by E2E tests, which are slower to run and debug.
- Priority: High. Watchlist is a core feature. Add tests in `backend/tests/test_api.py` or a new `backend/tests/test_watchlist.py` for: (1) add ticker, (2) add duplicate ticker (expect 409), (3) remove ticker, (4) remove non-existent ticker (expect 404), (5) get watchlist includes current prices from cache.

**Simulator resilience tests are missing:**
- What's not tested: What happens if Cholesky decomposition fails (singular correlation matrix)? What if a ticker's price goes to zero or negative? What if step() is called with an empty ticker list repeatedly?
- Files: `backend/app/market/simulator.py`, `backend/tests/market/test_simulator.py`
- Risk: The simulator could crash in unexpected ways, halting price updates for all tickers. The market data source stop-then-restart flow is not tested.
- Priority: Medium. The simulator is the default market data source and should be robust. Add tests for: (1) exception during step() is caught and logged, (2) add/remove ticker rapid-fire (100 operations) does not corrupt state, (3) correlation matrix remains valid after many updates.

---

*Concerns audit: 2026-04-20*
