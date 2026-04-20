---
phase: 1
slug: foundation-data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E), Jest/Vitest (unit - TBD by planner) |
| **Config file** | `test/playwright.config.ts` (E2E), `frontend/jest.config.ts` or `frontend/vitest.config.ts` (unit - created in Phase 1) |
| **Quick run command** | `cd frontend && npm test` |
| **Full suite command** | `cd test && npx playwright test` |
| **Estimated runtime** | ~15 seconds (unit), ~60 seconds (E2E with Docker) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test`
- **After every plan wave:** Run `cd test && npx playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RTD-01 | — | N/A | E2E | `npx playwright test startup` | ✅ | ⬜ pending |
| TBD | TBD | TBD | RTD-03 | — | N/A | E2E | `npx playwright test sse-resilience` | ✅ | ⬜ pending |
| TBD | TBD | TBD | UI-01 | — | N/A | visual | manual dark theme check | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-02 | — | N/A | visual | manual color scheme check | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | UI-03 | — | N/A | visual | manual layout density check | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/package.json` — Next.js 15.5.x project with test runner configured
- [ ] Frontend test infrastructure — unit test framework installed and runnable

*Existing E2E infrastructure (test/specs/) covers RTD-01 and RTD-03.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark theme renders correctly | UI-01 | Visual appearance, color perception | Open app, verify #0d1117 background, #161b22 panels, blue glow borders |
| Color scheme applied | UI-02 | Visual color matching | Verify accent yellow #ecad0a, blue #209dd7, purple #753991 in correct positions |
| Data-dense layout | UI-03 | Layout density is subjective | Verify Bloomberg/terminal-inspired feel, panels fill viewport |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
