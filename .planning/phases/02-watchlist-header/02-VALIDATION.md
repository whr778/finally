---
phase: 02
slug: watchlist-header
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-21
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright E2E (existing test specs cover all phase requirements) |
| **Config file** | `test/playwright.config.ts` |
| **Quick run command** | `cd test && npx playwright test specs/watchlist.spec.ts` |
| **Full suite command** | `cd test && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd test && npx playwright test specs/watchlist.spec.ts`
- **After every plan wave:** Run `cd test && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-02-01 | 02 | 2 | RTD-02 | — | N/A | E2E | `npx playwright test specs/watchlist.spec.ts -g "prices flash green"` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | RTD-04 | — | N/A | E2E | `npx playwright test specs/sse-resilience.spec.ts -g "sparkline appears"` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | WATCH-01 | — | N/A | E2E | `npx playwright test specs/startup.spec.ts -g "default watchlist"` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | WATCH-02 | — | N/A | E2E | `npx playwright test specs/watchlist.spec.ts -g "can add"` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | WATCH-03 | — | N/A | E2E | `npx playwright test specs/watchlist.spec.ts -g "can remove"` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | WATCH-04 | — | N/A | E2E | `npx playwright test specs/watchlist.spec.ts -g "clicking a ticker row"` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 2 | PORT-02 | — | N/A | E2E | `npx playwright test specs/startup.spec.ts -g "portfolio value"` | ✅ | ⬜ pending |
| 02-02-02 | 02 | 2 | PORT-03 | — | N/A | E2E | `npx playwright test specs/startup.spec.ts -g "cash balance"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Playwright E2E test specs already exist for all 8 requirements (see Per-Task Verification Map above).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price flash green/red animation | WATCH-02 | CSS animation timing | Load app, observe price change flashes |
| Sparkline progressive fill | WATCH-03 | Visual SVG rendering | Load app, watch sparklines accumulate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
