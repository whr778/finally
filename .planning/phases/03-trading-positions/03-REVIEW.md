---
phase: 03-trading-positions
reviewed: 2026-04-21T12:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - frontend/src/components/trade-bar.tsx
  - frontend/src/components/positions-table.tsx
  - frontend/src/components/app-shell.tsx
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-21T12:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the three new frontend components for the trading and positions functionality: trade bar, positions table, and the updated app shell. The components are clean, well-structured, and follow project conventions. The trade bar has solid input validation and error handling. The positions table correctly handles nullable fields from the API.

Two warnings were found, both related to missing error handling in async operations that could cause silent failures or repeated unhandled promise rejections during normal operation (e.g., when the backend is temporarily unreachable).

## Warnings

### WR-01: Portfolio store fetchPortfolio lacks error handling

**File:** `frontend/src/stores/portfolio-store.ts:17-25`
**Issue:** The `fetchPortfolio` action has no try/catch and does not check `res.ok` before calling `res.json()`. In `app-shell.tsx:18-20`, this function is called on a 5-second interval. If the backend is temporarily unreachable or returns an error status, this will produce an unhandled promise rejection every 5 seconds. While the interval itself will keep running (setInterval does not stop on rejected promises), the browser console will fill with errors and the UI will show stale or zero data with no user feedback.
**Fix:**
```typescript
fetchPortfolio: async () => {
  try {
    const res = await fetch("/api/portfolio");
    if (!res.ok) return;
    const data: PortfolioData = await res.json();
    set({
      cashBalance: data.cash_balance,
      totalValue: data.total_value,
      positions: data.positions,
    });
  } catch {
    // Network error — retain current state, will retry on next interval
  }
},
```

### WR-02: Trade bar error response parsing may throw on non-JSON error bodies

**File:** `frontend/src/components/trade-bar.tsx:43-44`
**Issue:** When `res.ok` is false, the code calls `await res.json()` to extract `err.detail`. If the backend returns a non-JSON error response (e.g., a plain text 500 or a gateway timeout from a reverse proxy), `res.json()` will throw a SyntaxError. This is caught by the outer catch block on line 54, but the user would see the generic "Trade failed. Try again." instead of the actual error message from the backend. This is a minor degradation but worth noting since it could mask useful error information.
**Fix:**
```typescript
if (!res.ok) {
  let message = 'Trade failed'
  try {
    const err = await res.json()
    message = err.detail || message
  } catch {
    // Non-JSON error response
  }
  setFeedback({ type: 'error', message })
  return
}
```

---

_Reviewed: 2026-04-21T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
