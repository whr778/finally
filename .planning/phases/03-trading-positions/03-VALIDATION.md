---
phase: 03
slug: trading-positions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E), TypeScript tsc (type check) |
| **Config file** | `test/playwright.config.ts` |
| **Quick run command** | `cd frontend && npx --package typescript tsc --noEmit --strict` |
| **Full suite command** | `cd test && npx playwright test specs/trading.spec.ts` |
| **Estimated runtime** | ~15 seconds (type check), ~30 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx --package typescript tsc --noEmit --strict`
- **After every plan wave:** Run `cd test && npx playwright test specs/trading.spec.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | TRADE-01 | — | N/A | type-check | `tsc --noEmit --strict` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | TRADE-02, TRADE-03 | — | N/A | type-check + E2E | `tsc && playwright test trading` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 2 | PORT-01 | — | N/A | type-check | `tsc --noEmit --strict` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 2 | TRADE-04, TRADE-05 | — | N/A | type-check + E2E | `tsc && playwright test trading` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Playwright and TypeScript are already installed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Price flash on trade bar ticker | TRADE-01 | Visual CSS animation timing | Click watchlist ticker, verify trade bar populates |
| Inline success message auto-dismiss | TRADE-04 | CSS animation timing (3s fade) | Execute buy, verify green message appears and fades |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
