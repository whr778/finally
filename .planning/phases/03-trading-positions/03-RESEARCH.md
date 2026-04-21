# Phase 3: Trading & Positions - Research

**Researched:** 2026-04-21
**Domain:** Frontend trade execution UI + positions table, wiring to existing backend API
**Confidence:** HIGH

## Summary

Phase 3 is a frontend-only phase. The backend trade API (`POST /api/portfolio/trade`) and portfolio API (`GET /api/portfolio`) are already fully implemented and tested with 11 integration tests covering buy, sell, fractional shares, insufficient cash/shares, and avg cost calculation. The frontend trade bar component exists as a disabled skeleton from Phase 1. The portfolio Zustand store already has `fetchPortfolio()` wired on a 5-second interval.

The work is: (1) activate the trade bar (remove readOnly/disabled, add local state and submit handler), (2) add inline success/error feedback with auto-dismiss, (3) create a new PositionsTable component that reads from the existing portfolio store, and (4) replace the Positions PlaceholderPanel in AppShell. All data-testid attributes are defined in the E2E test contracts.

**Primary recommendation:** This is a straightforward frontend feature phase. No new libraries needed. Wire the existing trade bar to `POST /api/portfolio/trade`, call `fetchPortfolio()` on success, and create a simple table component reading from `usePortfolioStore`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inline status bar below the trade bar. Green text for success showing "BUY 2 AAPL @ $191.50" format, red text for errors. Auto-dismisses after ~3 seconds via CSS transition or setTimeout.
- **D-02:** Uses `data-testid="trade-success"` and `data-testid="trade-error"` elements per E2E test contracts. Success text must contain the ticker symbol and side (BUY/SELL).
- **D-03:** Full 6-column table: Ticker, Qty, Avg Cost, Current Price, Unrealized P&L, % Change. All values in monospace font. P&L and % colored green (positive) or red (negative).
- **D-04:** Table replaces the "Positions" PlaceholderPanel in AppShell. Same panel glow styling as other panels. Each row has `data-testid="position-row-{TICKER}"` per E2E contract.
- **D-05:** After successful trade: keep ticker field value, clear quantity field, show success inline below. After failed trade: keep both fields, show error inline.
- **D-06:** Ticker input becomes editable (not readOnly). E2E tests use `.fill()` to type directly into it. Watchlist click still populates it, but user can also type manually.
- **D-07:** Quantity input and buy/sell buttons become enabled (remove `disabled` attribute). Quantity input accepts decimal values for fractional shares.
- **D-08:** Immediately call `fetchPortfolio()` after the trade API responds successfully. Cash balance, positions, and header values update instantly. The existing 5-second setInterval poll continues as a safety net.

### Claude's Discretion
- Positions table empty state (before any trades)
- Exact validation error messages (empty ticker, zero/negative qty, insufficient cash/shares)
- Whether to add a trade execution loading state on the buy/sell buttons
- Positions table sort order (by ticker alphabetical, by P&L, or by insertion order)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRADE-01 | User can enter a ticker and quantity in the trade bar | Activate existing trade-bar.tsx: remove readOnly from ticker, remove disabled from qty. Use local React state for controlled inputs. |
| TRADE-02 | User can execute a buy order (market order, instant fill) | Wire btn-buy click to `POST /api/portfolio/trade` with `{ticker, quantity, side: "buy"}`. Backend already handles execution. |
| TRADE-03 | User can execute a sell order (market order, instant fill) | Wire btn-sell click to `POST /api/portfolio/trade` with `{ticker, quantity, side: "sell"}`. Backend already handles execution. |
| TRADE-04 | User sees cash balance update immediately after trade execution | Call `usePortfolioStore.fetchPortfolio()` immediately after trade API success. Header already reads from this store. |
| TRADE-05 | User can trade fractional shares (quantity > 0.00) | Qty input uses `type="number" step="any"`. Backend already accepts float quantity. |
| PORT-01 | User sees positions table with ticker, quantity, avg cost, current price, unrealized P&L, % change | New PositionsTable component reading `positions` from `usePortfolioStore`. 6-column table per D-03. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Be simple, work incrementally, small steps
- Do not overengineer or program defensively
- Use latest library APIs
- Favor short modules, short methods, name things clearly
- No emojis in code or print statements
- `uv` for Python package management (not needed this phase -- backend already complete)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trade form input/validation | Browser/Client | -- | Local form state, client-side validation before API call |
| Trade execution | API/Backend | -- | Already implemented. POST /api/portfolio/trade handles all business logic |
| Trade feedback display | Browser/Client | -- | Inline success/error from API response, auto-dismiss timer |
| Positions data fetching | Browser/Client | API/Backend | Client polls via fetchPortfolio(); backend computes P&L from DB + price cache |
| Positions table rendering | Browser/Client | -- | Pure display component reading from Zustand store |
| Post-trade state refresh | Browser/Client | -- | Immediate fetchPortfolio() call after trade success |

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Already installed [VERIFIED: npm list] |
| Next.js | 15.5.15 | Framework (static export) | Already installed [VERIFIED: npm list] |
| Zustand | 5.0.12 | State management | Already installed, stores already created [VERIFIED: npm list] |
| Tailwind CSS | 4.2.x | Styling | Already installed with custom dark theme [VERIFIED: package.json] |

### Supporting (No New Libraries Needed)

No additional frontend or backend libraries are needed for Phase 3. All functionality is achievable with:
- Native `fetch()` for API calls
- React `useState` for local form state
- `setTimeout` for auto-dismiss feedback
- Zustand store (already exists) for portfolio state
- Tailwind CSS utility classes for styling

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw fetch for trade | React Query/SWR | Overkill for a single POST call. The existing pattern uses raw fetch in stores. |
| useState for form | react-hook-form | Overkill for 2 inputs. Keep it simple per CLAUDE.md. |
| Inline feedback | toast library | User explicitly chose inline status bar (D-01). No toast library. |

## Architecture Patterns

### System Architecture Diagram

```
User Input (trade bar)
        |
        v
  [Local Validation]  -- empty ticker? zero qty? --> [Show trade-error inline]
        |
        | (valid)
        v
  POST /api/portfolio/trade
  { ticker, quantity, side }
        |
        +--- 200 OK --> [Show trade-success inline]
        |                 [Clear qty field]
        |                 [fetchPortfolio() immediately]
        |                       |
        |                       v
        |               [Zustand portfolio store updates]
        |                       |
        |                       v
        |               [Header cash/total re-renders]
        |               [PositionsTable re-renders]
        |
        +--- 400/404 --> [Show trade-error with detail text]
                          [Keep all fields]
```

### Recommended File Changes

```
frontend/src/
├── components/
│   ├── trade-bar.tsx          # MODIFY: activate inputs, add trade execution, add feedback
│   ├── positions-table.tsx    # NEW: 6-column positions table
│   └── app-shell.tsx          # MODIFY: replace PlaceholderPanel with PositionsTable
├── stores/
│   └── portfolio-store.ts     # NO CHANGES: already has positions, cashBalance, fetchPortfolio
└── types/
    └── market.ts              # NO CHANGES: PositionData type already has all 6 fields
```

### Pattern 1: Trade Execution from Component

**What:** TradeBar handles trade execution directly via fetch, not through the Zustand store. This is consistent with the simplicity principle -- the trade is a one-shot action, not shared state.

**When to use:** One-off API mutations that trigger a store refresh after completion.

**Example:**
```typescript
// Source: Existing watchlist-store.ts pattern + Zustand docs
const executeTrade = async (ticker: string, quantity: number, side: 'buy' | 'sell') => {
  const res = await fetch('/api/portfolio/trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker: ticker.toUpperCase(), quantity, side }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Trade failed')
  }
  return res.json()  // TradeOut: { ticker, side, quantity, price, executed_at }
}
```

[VERIFIED: Backend portfolio.py returns TradeOut model with these exact fields]

### Pattern 2: Ticker Input Sync with selectedTicker Prop

**What:** The trade bar receives `selectedTicker` from AppShell (set by watchlist click). The ticker input uses local state that syncs from this prop via useEffect, but also allows manual typing.

**Example:**
```typescript
// Source: React 19 pattern for prop-synced controlled input
const [ticker, setTicker] = useState(selectedTicker || '')

useEffect(() => {
  if (selectedTicker) setTicker(selectedTicker)
}, [selectedTicker])
```

[VERIFIED: app-shell.tsx passes selectedTicker prop to TradeBar]

### Pattern 3: Auto-Dismiss Feedback

**What:** Success/error messages display for ~3 seconds then clear. Use setTimeout with cleanup.

**Example:**
```typescript
// Source: Standard React pattern
const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

// After setting feedback:
const timer = setTimeout(() => setFeedback(null), 3000)
// Cleanup on unmount or new feedback
```

[ASSUMED: Standard React setTimeout pattern, well-known]

### Anti-Patterns to Avoid

- **Putting trade execution in the store:** The trade is a fire-and-forget mutation. It does not produce shared state itself -- it triggers a fetchPortfolio() which updates the store. Keep the fetch in the component.
- **Using useEffect for trade submission:** Trade execution should happen on button click, not in an effect. Effects are for synchronization, not user-initiated actions.
- **Forgetting to call fetchPortfolio after trade:** This is D-08. The header and positions table will not update until the next 5s poll cycle unless you call it immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting (currency) | Custom `toFixed` + string concat | `Intl.NumberFormat` | Already used in header.tsx for formatCurrency. Handles locale, decimals, signs. |
| Percent formatting | Custom string formatting | `Intl.NumberFormat` with `{ style: 'percent' }` or manual `toFixed(2) + '%'` | Consistent formatting across the app. |
| API error extraction | Manual response parsing | `res.json().detail` pattern | Backend consistently returns `{ detail: "message" }` for all 400/404 errors (FastAPI default). |

## Common Pitfalls

### Pitfall 1: readOnly vs disabled Input Behavior
**What goes wrong:** E2E tests use `.fill()` which works on editable inputs but fails on `readOnly` or `disabled` inputs in Playwright.
**Why it happens:** Phase 1 set the ticker to `readOnly` and qty to `disabled`. Phase 3 must remove both.
**How to avoid:** Remove `readOnly` from ticker input. Remove `disabled` from qty input and buttons. Add `step="any"` to qty for fractional shares.
**Warning signs:** E2E `trading.spec.ts` fails with "element is not editable" error.

[VERIFIED: trading.spec.ts uses `.fill()` on trade-ticker and trade-qty inputs]

### Pitfall 2: Trade Success Message Format
**What goes wrong:** E2E test checks that `trade-success` contains both the ticker AND "BUY" or "SELL".
**Why it happens:** Test line 41-42: `await expect(success).toContainText("AAPL")` and `await expect(success).toContainText("BUY")`.
**How to avoid:** Format as `{SIDE.toUpperCase()} {quantity} {TICKER} @ $${price.toFixed(2)}`. Use the TradeOut response fields directly.
**Warning signs:** Test fails with "expected 'trade success' to contain 'BUY'" -- means the format is wrong.

[VERIFIED: trading.spec.ts lines 40-42]

### Pitfall 3: Missing fetchPortfolio After Trade
**What goes wrong:** Cash balance and positions don't update until the next 5s poll.
**Why it happens:** Developer forgets D-08 -- immediate fetchPortfolio() call after trade success.
**How to avoid:** In the trade success handler, call `usePortfolioStore.getState().fetchPortfolio()` or use the hook.
**Warning signs:** `trading.spec.ts` "buying shares reduces cash balance" test has only 1 second wait before checking cash.

[VERIFIED: trading.spec.ts line 29 waits 1000ms then checks cash changed]

### Pitfall 4: Position Row data-testid Must Use Ticker
**What goes wrong:** E2E test looks for `position-row-GOOGL` but the component uses a different format.
**Why it happens:** The data-testid must be exactly `position-row-{TICKER}` where TICKER is uppercase.
**How to avoid:** Use `data-testid={`position-row-${position.ticker}`}` on each row.
**Warning signs:** Test `"buy creates a position in the positions table"` fails.

[VERIFIED: trading.spec.ts line 53 checks `position-row-GOOGL`]

### Pitfall 5: Stale Ticker After Watchlist Click
**What goes wrong:** User clicks watchlist ticker, types a different ticker, then clicks watchlist again and the input doesn't update.
**Why it happens:** If useEffect dependency on selectedTicker fires with the same value, React skips the effect.
**How to avoid:** Use a simple useEffect that sets local state whenever selectedTicker changes. If the user types manually, that's fine -- the next watchlist click overrides.
**Warning signs:** Clicking the same watchlist ticker twice doesn't re-populate the input.

[ASSUMED: Standard React controlled input pattern]

### Pitfall 6: Number Input Returns String
**What goes wrong:** `parseFloat(qty)` is needed because `input[type=number]` value is always a string in React.
**Why it happens:** HTML input values are strings. Sending `"2.5"` as quantity instead of `2.5` to the backend.
**How to avoid:** Use `parseFloat(quantity)` before sending to API. Check `isNaN()` for validation.
**Warning signs:** Backend may accept it (Pydantic coerces), but local validation should catch empty/invalid values.

[VERIFIED: Backend TradeRequest.quantity is `float` type, Pydantic will coerce strings]

## Code Examples

### Trade Bar Component Structure

```typescript
// Source: Existing trade-bar.tsx + CONTEXT.md D-01 through D-08
'use client'

import { useState, useEffect } from 'react'
import { usePortfolioStore } from '@/stores/portfolio-store'

interface TradeBarProps {
  selectedTicker: string | null
}

export default function TradeBar({ selectedTicker }: TradeBarProps) {
  const [ticker, setTicker] = useState('')
  const [qty, setQty] = useState('')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio)

  useEffect(() => {
    if (selectedTicker) setTicker(selectedTicker)
  }, [selectedTicker])

  const handleTrade = async (side: 'buy' | 'sell') => {
    // Local validation
    if (!ticker.trim()) {
      setFeedback({ type: 'error', message: 'Enter a ticker symbol' })
      return
    }
    const quantity = parseFloat(qty)
    if (!qty || isNaN(quantity) || quantity <= 0) {
      setFeedback({ type: 'error', message: 'Enter a quantity' })
      return
    }

    try {
      const res = await fetch('/api/portfolio/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), quantity, side }),
      })
      if (!res.ok) {
        const err = await res.json()
        setFeedback({ type: 'error', message: err.detail || 'Trade failed' })
        return
      }
      const trade = await res.json()
      setFeedback({
        type: 'success',
        message: `${trade.side.toUpperCase()} ${trade.quantity} ${trade.ticker} @ $${trade.price.toFixed(2)}`,
      })
      setQty('')  // D-05: clear qty on success
      fetchPortfolio()  // D-08: immediate refresh
    } catch {
      setFeedback({ type: 'error', message: 'Trade failed. Try again.' })
    }
  }

  // Auto-dismiss feedback after 3s
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(timer)
  }, [feedback])

  return (
    <div data-testid="trade-bar" className="...">
      <div className="flex items-center gap-3">
        {/* inputs and buttons */}
      </div>
      {feedback?.type === 'success' && (
        <span data-testid="trade-success" className="text-success font-mono text-xs">
          {feedback.message}
        </span>
      )}
      {feedback?.type === 'error' && (
        <span data-testid="trade-error" className="text-danger font-mono text-xs">
          {feedback.message}
        </span>
      )}
    </div>
  )
}
```

[VERIFIED: data-testid values match trading.spec.ts expectations]

### Positions Table Component Structure

```typescript
// Source: CONTEXT.md D-03/D-04, UI-SPEC positions table section
'use client'

import { usePortfolioStore } from '@/stores/portfolio-store'

export default function PositionsTable() {
  const positions = usePortfolioStore((s) => s.positions)

  const sorted = [...positions].sort((a, b) => a.ticker.localeCompare(b.ticker))

  if (sorted.length === 0) {
    return (
      <div className="... panel-glow">
        <h2>Positions</h2>
        <p className="text-xs text-text-muted">
          No positions yet. Execute a trade to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="... panel-glow">
      <h2>Positions</h2>
      <table>
        <thead>{/* Ticker, Qty, Avg Cost, Price, P&L, % */}</thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.ticker} data-testid={`position-row-${p.ticker}`}>
              {/* 6 columns with formatting */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

[VERIFIED: PositionData type in market.ts has all 6 required fields]

### P&L Color Logic

```typescript
// Source: UI-SPEC Color section
const pnlColor = (value: number | null) => {
  if (value === null || value === 0) return 'text-text-primary'
  return value > 0 ? 'text-success' : 'text-danger'
}
```

[VERIFIED: Tailwind theme tokens include --color-success (#3fb950) and --color-danger (#f85149) in globals.css]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 `create()(fn)` | Zustand v5 `create<T>()(fn)` | 2024 | Same API, TypeScript generics slightly different. Project already uses v5 pattern. |
| React 18 `useState` | React 19 `useState` | 2025 | No change in API for this use case. |
| Tailwind v3 config.js | Tailwind v4 CSS-first `@theme` | 2025 | Project already uses v4 with CSS custom properties in globals.css. |

[VERIFIED: Installed versions -- zustand@5.0.12, react@19.1.0, tailwindcss@4.2.x]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | setTimeout auto-dismiss pattern works reliably for 3s feedback | Common Pitfalls / Code Examples | Low -- standard well-known pattern. Worst case: feedback doesn't auto-dismiss, which is cosmetic. |
| A2 | Stale ticker useEffect edge case (clicking same ticker twice) | Pitfall 5 | Low -- edge case, may not occur in practice since watchlist click sets selectedTicker state. |

## Open Questions

1. **Heatmap tile E2E test (`tile-AAPL`)**
   - What we know: `trading.spec.ts` line 94 checks for `tile-AAPL` after buying shares. This is a Phase 4 element.
   - What's unclear: Whether this test will be run in Phase 3 CI.
   - Recommendation: Phase 3 should NOT implement the heatmap. This specific test (`"portfolio heatmap appears after buying"`) will fail until Phase 4. The UI-SPEC already notes this.

2. **Number input spinner styling**
   - What we know: UI-SPEC mentions hiding spinners with CSS.
   - What's unclear: The exact Tailwind class to hide number input spinners.
   - Recommendation: Use `[appearance:textfield]` class on the input and `[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` to hide Chrome spinners. This is a Tailwind v4 utility pattern. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | pytest 8.3+ with pytest-asyncio, httpx ASGI transport |
| Framework (frontend) | No unit test framework configured (no vitest/jest) |
| Framework (E2E) | Playwright (test/specs/) |
| Config file (backend) | backend/pyproject.toml [tool.pytest.ini_options] |
| Config file (E2E) | test/playwright.config.ts |
| Quick run command (backend) | `cd backend && uv run --extra dev pytest tests/test_api.py -x -v` |
| Full suite command (E2E) | `cd test && npx playwright test` |

[VERIFIED: backend/tests/conftest.py, test/playwright.config.ts]

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRADE-01 | Trade bar accepts ticker and quantity input | E2E | `cd test && npx playwright test specs/trading.spec.ts` | Yes |
| TRADE-02 | Buy order executes | E2E + Backend unit | E2E: `trading.spec.ts`; Backend: `test_api.py::TestTrade::test_buy_reduces_cash_and_creates_position` | Yes |
| TRADE-03 | Sell order executes | E2E + Backend unit | E2E: `trading.spec.ts`; Backend: `test_api.py::TestTrade::test_sell_increases_cash_and_removes_position` | Yes |
| TRADE-04 | Cash balance updates immediately | E2E | `trading.spec.ts` "buying shares reduces cash balance" | Yes |
| TRADE-05 | Fractional shares work | Backend unit | `test_api.py::TestTrade::test_fractional_share_buy` | Yes |
| PORT-01 | Positions table with 6 columns | E2E | `trading.spec.ts` "buy creates a position in the positions table" | Yes |

### Sampling Rate

- **Per task commit:** `cd backend && uv run --extra dev pytest tests/test_api.py -x -v` (backend sanity)
- **Per wave merge:** `cd test && npx playwright test specs/trading.spec.ts` (E2E, requires running app)
- **Phase gate:** Full E2E suite green before verify (except `tile-AAPL` test which is Phase 4)

### Wave 0 Gaps

None -- existing backend test infrastructure covers trade logic. E2E tests already exist in `test/specs/trading.spec.ts`. No frontend unit test framework is configured, and no frontend unit tests are required for this phase (the E2E tests cover all critical paths).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-user app, no auth |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | Single-user, hardcoded "default" user_id |
| V5 Input Validation | Yes | Backend validates: quantity > 0, side in ("buy","sell"), ticker must have cached price. Frontend validates: non-empty ticker, positive quantity. |
| V6 Cryptography | No | No sensitive data |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Negative quantity injection | Tampering | Backend validates `quantity > 0` (line 78-79 of portfolio.py) [VERIFIED] |
| Invalid ticker | Tampering | Backend checks price cache, returns 404 if no price [VERIFIED] |
| Insufficient cash/shares | Tampering | Backend checks balances before executing [VERIFIED] |

All threat patterns are already mitigated in the existing backend code. Frontend validation is convenience only -- the backend is the authority.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | Yes | v25.9.0 | -- |
| Docker | E2E testing (full stack) | Yes | 29.4.0 | -- |
| uv | Backend (already done) | Yes | 0.11.7 | -- |

No missing dependencies.

## Sources

### Primary (HIGH confidence)
- `backend/app/routes/portfolio.py` -- Full trade execution logic, verified all endpoints
- `backend/app/models.py` -- Pydantic models (TradeRequest, TradeOut, PortfolioOut, PositionOut)
- `backend/tests/test_api.py` -- 11 trade-related tests, all edge cases covered
- `backend/tests/conftest.py` -- Test fixture pattern (seeded DB, mock price cache)
- `frontend/src/components/trade-bar.tsx` -- Current skeleton state
- `frontend/src/stores/portfolio-store.ts` -- Existing fetchPortfolio, positions array
- `frontend/src/types/market.ts` -- PositionData type definition
- `frontend/src/components/app-shell.tsx` -- PlaceholderPanel to replace
- `frontend/src/app/globals.css` -- Tailwind theme tokens (success, danger colors)
- `test/specs/trading.spec.ts` -- E2E test contracts (all data-testid values)
- Context7: /pmndrs/zustand -- Zustand v5 async action patterns

### Secondary (MEDIUM confidence)
- `.planning/phases/03-trading-positions/03-UI-SPEC.md` -- UI design contract
- `.planning/phases/03-trading-positions/03-CONTEXT.md` -- User decisions D-01 through D-08

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed, versions verified via npm list
- Architecture: HIGH -- Backend fully implemented and tested, frontend patterns established in Phase 2
- Pitfalls: HIGH -- All data-testid contracts verified against E2E tests, backend error responses verified in code

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable -- no dependency changes needed)
