# Phase 2: Watchlist & Header - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 02-watchlist-header
**Areas discussed:** Price flash animations, Sparkline style, Watchlist add/remove UX, Watchlist row density

---

## Price flash animations

| Option | Description | Selected |
|--------|-------------|----------|
| Background flash | Brief green/red background highlight fading over ~500ms | ✓ |
| Text color flash | Price text briefly turns green/red then fades back | |
| You decide | Claude picks | |

**User's choice:** Background flash
**Notes:** Bloomberg terminal style — entire price area briefly glows

---

## Sparkline style

| Option | Description | Selected |
|--------|-------------|----------|
| Simple line, no fill | Thin SVG polyline in blue, no area fill | |
| Line with gradient fill | Polyline with subtle gradient fill below | ✓ |
| You decide | Claude picks | |

**User's choice:** Line with gradient fill
**Notes:** Blue primary (#209dd7) line with gradient fill fading to transparent

---

## Watchlist add/remove UX

### Add ticker

| Option | Description | Selected |
|--------|-------------|----------|
| Inline input at top | Text input + button at top of watchlist, always visible | ✓ |
| Inline input at bottom | Same but at bottom of watchlist | |
| You decide | Claude picks | |

**User's choice:** Inline input at top
**Notes:** Enter or click + to submit

### Remove ticker

| Option | Description | Selected |
|--------|-------------|----------|
| X button on hover | Small X appears on right of row on hover, instant remove | ✓ |
| X button always visible | X shown on every row always | |
| You decide | Claude picks | |

**User's choice:** X button on hover
**Notes:** No confirmation dialog

---

## Watchlist row density

| Option | Description | Selected |
|--------|-------------|----------|
| Compact: ticker + price + change% + sparkline | Single-line rows, dense and scannable | ✓ |
| Two-line: add volume or day range | Additional data on second line | |
| You decide | Claude picks based on API data | |

**User's choice:** Compact single-line rows
**Notes:** Ticker, price, change % (colored), sparkline

---

## Claude's Discretion

- Sparkline data point accumulation strategy
- Exact flash animation CSS
- Watchlist empty state
- Error handling for API calls
- Watchlist row click behavior (Phase 4 wiring)

## Deferred Ideas

None — discussion stayed within phase scope
