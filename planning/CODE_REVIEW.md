# Code Review — Changes Since Last Commit

Reviewed: backend app (database, models, main, routes), frontend (all components, hooks, types, lib), and test infrastructure.

---

## HIGH

### 1. Watchlist and Chat API routes are missing entirely

The plan defines `GET/POST/DELETE /api/watchlist` and `POST /api/chat`, but neither route file exists in `backend/app/routes/`. The frontend already calls these endpoints (see `api.ts` lines 41-68, `page.tsx` lines 31, 43). At runtime, every watchlist operation and all AI chat calls will return 404.

Affected files:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/routes/` — no `watchlist.py` or `chat.py`
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/main.py` — only `health_router` and `portfolio_router` are registered

---

### 2. Test database isolation is broken — tests share state across functions

`conftest.py` declares `db_path` as `scope="session"` (one shared path for the entire test run) but `seeded_db` is function-scoped and deletes and re-initialises the file before each test. Because the `client` fixture depends on `seeded_db`, and the app module is imported once per process, `init_db` runs each time but against the same file path. Tests that run after a trade test will observe a modified cash balance — `test_initial_cash_balance_is_10000` will fail if execution order places it after `test_buy_reduces_cash_and_creates_position`.

The fix: make `db_path` function-scoped so each test gets a unique temp file, or use `tmp_path` (function-scoped by default) instead of `tmp_path_factory`.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/tests/conftest.py`

---

### 3. Trade execution: `_insert_snapshot` runs outside the transaction and errors silently

In `portfolio.py`, `_insert_snapshot(price_cache)` is called on line 166 after the `async with get_db()` block (and its `commit`) exits. If `_insert_snapshot` raises for any reason (e.g., DB locked), the exception propagates and the trade endpoint returns a 500 error to the client — even though the trade itself committed successfully. The user's cash and position are correct in the DB but the API response indicates failure, which will confuse the frontend. The snapshot write should be wrapped in a try/except so a snapshot failure does not surface as a trade failure.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/routes/portfolio.py` (line 166)

---

## MEDIUM

### 4. `users_profile` schema has redundant `id` and `user_id` columns; queries are inconsistent

The schema defines `id TEXT PRIMARY KEY` and `user_id TEXT DEFAULT 'default'`. The seed inserts `id="default"`. All queries in `portfolio.py` filter by `WHERE id = ?`. Every other table filters by `WHERE user_id = ?`. The plan specifies only a `user_id` column as the primary key for this table. This inconsistency will require careful attention when writing the watchlist and chat routes, which are likely to filter by `user_id`.

Affected files:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/database.py` (lines 14-18)
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/routes/portfolio.py` (lines 25-27, 95-97)

---

### 5. `TradeBar` ticker field does not sync to `selectedTicker` when qty is non-empty

In `TradeBar.tsx` line 21:

```tsx
if (selectedTicker && selectedTicker !== ticker && qty === "") {
  setTicker(selectedTicker);
}
```

The sync is suppressed whenever `qty` has any value. If the user types a quantity, then clicks a different ticker in the watchlist, the ticker field silently stays on the old symbol. The user can then submit a trade against the wrong ticker. The guard should update the ticker regardless of qty, or at minimum notify the user.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/components/TradeBar.tsx` (line 21)

---

### 6. `useWatchlist.removeTicker` silently swallows errors and does not refresh from server

`removeTicker` in `useWatchlist.ts` calls `removeFromWatchlist` (DELETE API) then filters local state optimistically. Errors from the API call are not caught — the `Watchlist` component calls `onRemove(entry.ticker)` without `await` or `.catch`, so a network failure will go unhandled and the local list will be out of sync with the server. The component should surface remove errors the same way it surfaces add errors.

Affected files:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/hooks/useWatchlist.ts` (lines 50-55)
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/components/Watchlist.tsx` (line 145)

---

### 7. `usePrices` flash timeout accumulates — rapid updates clear flashes from subsequent events

In `usePrices.ts` lines 59-63, each `handleMessage` call schedules `setTimeout(() => setFlashed(new Set()), 700)` without cancelling the previous one. At the 500ms SSE cadence, multiple timeouts queue up. Each fires and clears the `flashed` set, which may prematurely clear flash state triggered by a more recent price update. The previous timeout ID should be stored in a ref and cleared before scheduling a new one.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/hooks/usePrices.ts` (lines 59-63)

---

## LOW

### 8. `next.config.ts` rewrites function is incompatible with `output: 'export'` at build time

Next.js static export does not support `rewrites()`. The dev-mode guard (`if (process.env.NODE_ENV !== "development") return []`) prevents a build error in CI, but the function is still defined and evaluated. If Next.js tightens this check in a future version, the production build will fail. Moving the proxy concern entirely into a conditional that short-circuits before the `rewrites` key is defined would be cleaner.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/next.config.ts`

---

### 9. No periodic portfolio snapshot background task

The plan (section 7) specifies snapshots every 30 seconds via a background task. Currently snapshots are only recorded on trade execution. The P&L chart will appear flat between trades. The background task should be started in `lifespan` alongside the market data source.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/app/main.py`

---

### 10. `Watchlist` input allows 10 characters; plan caps tickers at 5

`maxLength={10}` on line 184 of `Watchlist.tsx`. The plan specifies 1-5 character symbols for simulator mode. The input should enforce `maxLength={5}`.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/components/Watchlist.tsx` (line 184)

---

### 11. `msgIdCounter` is module-level mutable state

`let msgIdCounter = 0` in `useChat.ts` line 8 is shared across all hook instances and test runs. IDs will not reset between test cases unless the module is re-imported. This is harmless in production but can produce confusing key sequences in tests.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/hooks/useChat.ts` (line 8)

---

### 12. `ChatPanel` injects a `<style>` block inside the render tree

The `@keyframes pulse` style block inside `ChatPanel.tsx` lines 193-198 is rendered inline inside the component output. It is injected into the DOM on every render while `sending` is true. This should be moved to `globals.css`.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/frontend/src/components/ChatPanel.tsx` (lines 193-198)

---

### 13. `pydantic` is not an explicit dependency in `pyproject.toml`

`fastapi` brings in Pydantic v2 as a transitive dependency. The project uses Pydantic v2 syntax throughout (`float | None` unions, `BaseModel`). Listing `pydantic>=2.0` explicitly would make the constraint visible and prevent a silent downgrade if FastAPI ever relaxes its lower bound.

Affected file:
- `/Users/williamroe/development/projects/agenic_coder/finally/backend/pyproject.toml`
