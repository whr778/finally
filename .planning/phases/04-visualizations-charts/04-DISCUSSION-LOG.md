# Phase 4: Visualizations & Charts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 04-visualizations-charts
**Areas discussed:** Heatmap treemap design, P&L chart design, Main ticker chart, Cross-panel interaction

---

## Heatmap Treemap Design

### Tile coloring

| Option | Description | Selected |
|--------|-------------|----------|
| Green/red P&L gradient | Continuous scale: deep green for gains, deep red for losses, neutral gray near zero. Classic Bloomberg style. | Y |
| Accent color intensity | Use project accent colors with intensity mapped to P&L magnitude. More unique but less intuitive. | |
| You decide | Claude picks best approach. | |

**User's choice:** Green/red P&L gradient
**Notes:** None

### Tile content

| Option | Description | Selected |
|--------|-------------|----------|
| Ticker + P&L % | Ticker symbol prominently, P&L percentage below. Minimal, scannable. | Y |
| Ticker + P&L % + value | Ticker, P&L percentage, and dollar amount. More info but tiles may feel crowded. | |
| You decide | Claude picks based on available tile space. | |

**User's choice:** Ticker + P&L %
**Notes:** None

### Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Muted message in panel | 'No positions -- buy shares to see your portfolio map' in muted text. | Y |
| Single placeholder tile | A single gray tile labeled '$10,000 Cash'. | |
| You decide | Claude picks the empty state approach. | |

**User's choice:** Muted message in panel
**Notes:** None

---

## P&L Chart Design

### Line style

| Option | Description | Selected |
|--------|-------------|----------|
| Area chart with gradient fill | Line chart with semi-transparent gradient fill below (blue #209dd7 to transparent). Matches sparkline style. | Y |
| Simple line chart | Clean line only, no fill. Minimalist. | |
| You decide | Claude picks based on terminal aesthetic. | |

**User's choice:** Area chart with gradient fill
**Notes:** None

### P&L coloring

| Option | Description | Selected |
|--------|-------------|----------|
| Single color (blue primary) | Consistent blue #209dd7 regardless of gain/loss. Clean, less visual noise. | Y |
| Green above start, red below | Line changes color at $10,000 starting value. More informative but adds complexity. | |
| You decide | Claude picks the coloring approach. | |

**User's choice:** Single color (blue primary)
**Notes:** None

### Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Muted message | 'Portfolio value chart will appear as data accumulates' in muted text. | Y |
| Flat line at $10k | Show a single point at $10,000 starting value. | |
| You decide | Claude picks the empty state. | |

**User's choice:** Muted message
**Notes:** None

---

## Main Ticker Chart

### Chart type

| Option | Description | Selected |
|--------|-------------|----------|
| Area chart | Area chart with line + gradient fill. Matches P&L chart and sparkline style. No OHLC data needed. | Y |
| Line chart | Simple line chart, no fill. Clean and minimal. | |
| You decide | Claude picks best chart type for available data. | |

**User's choice:** Area chart
**Notes:** None

### Data source

| Option | Description | Selected |
|--------|-------------|----------|
| SSE price history since page load | Accumulate price ticks from SSE in price store. Chart fills progressively. Uses existing pipeline. | Y |
| Backend history + live SSE | Fetch historical prices from new endpoint, then append live SSE. Requires new API. | |
| You decide | Claude picks based on existing backend support. | |

**User's choice:** SSE price history since page load
**Notes:** None

### No selection state

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt to select | 'Click a ticker to view its chart' in muted text. Current behavior refined visually. | Y |
| Auto-select first ticker | Automatically select first watchlist ticker on page load. | |
| You decide | Claude picks the no-selection state. | |

**User's choice:** Prompt to select
**Notes:** None

---

## Cross-Panel Interaction

### Treemap tile click

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, select ticker | Clicking treemap tile sets selectedTicker -- updates chart + trade bar. Consistent with watchlist. | Y |
| No interaction | Treemap is display-only. Users select via watchlist only. | |
| You decide | Claude picks what feels natural. | |

**User's choice:** Yes, select ticker
**Notes:** None

### P&L chart refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Poll on interval | Fetch /api/portfolio/history every 30-60 seconds. Matches backend snapshot interval. | Y |
| Refresh on trade only | Only re-fetch after trade executes. Static between trades. | |
| You decide | Claude picks the refresh strategy. | |

**User's choice:** Poll on interval
**Notes:** None

---

## Claude's Discretion

- Recharts Treemap customContent prop implementation
- Lightweight Charts configuration details
- Exact green/red color values for treemap gradient
- P&L chart time axis formatting
- Chart resize behavior
- Treemap tile minimum size threshold

## Deferred Ideas

None -- discussion stayed within phase scope
