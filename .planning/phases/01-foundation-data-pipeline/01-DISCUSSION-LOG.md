# Phase 1: Foundation & Data Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-foundation-data-pipeline
**Areas discussed:** Layout skeleton, Dark theme style, Connection indicator

---

## Layout skeleton

| Option | Description | Selected |
|--------|-------------|----------|
| Full grid with placeholders | Render complete layout grid with all panel areas as empty bordered panels | ✓ |
| Header + connection only | Minimal: just header bar with connection status on dark page | |
| You decide | Claude picks based on project structure and E2E test requirements | |

**User's choice:** Full grid with placeholders
**Notes:** None

### Follow-up: Chat panel

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed sidebar | Always-visible right column (~300-350px), empty placeholder now | |
| Collapsed with toggle | Hidden by default with toggle button, more screen space | ✓ |
| You decide | Claude picks based on E2E test requirements | |

**User's choice:** Collapsed with toggle
**Notes:** None

---

## Dark theme style

| Option | Description | Selected |
|--------|-------------|----------|
| Flat panels with subtle borders | Clean flat dark panels, no gradients, Bloomberg-like | |
| Panels with soft glow edges | Dark panels with subtle box-shadow glow on borders, sci-fi feel | ✓ |
| Deep purple tint | #1a1a2e background, warmer distinctive look | |

**User's choice:** Panels with soft glow edges
**Notes:** Background #0d1117, panel bg #161b22, borders with subtle glow effect box-shadow: 0 0 1px rgba(32,157,215,0.3)

### Follow-up: Typography

| Option | Description | Selected |
|--------|-------------|----------|
| Monospace for data, sans-serif for labels | Prices/tickers in monospace, labels/headers in sans-serif | ✓ |
| All monospace | Full monospace everywhere for maximum terminal feel | |
| You decide | Claude picks based on readability balance | |

**User's choice:** Monospace for data, sans-serif for labels
**Notes:** None

---

## Connection indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Small dot + text label | Compact colored circle with LIVE/CONNECTING/OFFLINE text, right-aligned | ✓ |
| Animated pulse dot | Same but with CSS pulse animation when connected | |
| You decide | Claude picks matching terminal aesthetic | |

**User's choice:** Small dot + text label
**Notes:** Green/LIVE, yellow/CONNECTING, red/OFFLINE. Must use data-testid="connection-dot" with "LIVE" text.

---

## Claude's Discretion

- Zustand store architecture (store count, slice boundaries, selector patterns)
- Frontend directory structure
- SSE connection management approach
- Panel proportions and grid sizing
- Loading skeleton design for placeholder panels

## Deferred Ideas

None — discussion stayed within phase scope
