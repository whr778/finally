# FinAlly — AI Trading Workstation

A visually stunning AI-powered trading workstation that streams live market data, simulates portfolio trading, and integrates an LLM chat assistant that can analyze positions and execute trades via natural language.

Built entirely by coding agents as a capstone project for an agentic AI coding course.

## Features

- **Live price streaming** via SSE with green/red flash animations
- **Simulated portfolio** — $10k virtual cash, market orders, instant fills
- **Portfolio visualizations** — heatmap (treemap), P&L chart, positions table
- **AI chat assistant** — analyzes holdings, suggests and auto-executes trades
- **Watchlist management** — track tickers manually or via AI
- **Dark terminal aesthetic** — Bloomberg-inspired, data-dense layout

## Architecture

Single Docker container serving everything on port 8000:

- **Frontend**: Next.js (static export) with TypeScript and Tailwind CSS
- **Backend**: FastAPI (Python/uv) with SSE streaming
- **Database**: SQLite with lazy initialization
- **AI**: LiteLLM → OpenRouter (Cerebras inference) with structured outputs
- **Market data**: Built-in GBM simulator (default) or Massive API (optional)

## Quick Start

### Docker (recommended)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — add your OPENROUTER_API_KEY

# 2. Start
./scripts/start_mac.sh --build      # macOS / Linux
# or, on Windows PowerShell:
# .\scripts\start_windows.ps1 -Build

# 3. Open http://localhost:8000
```

To stop: `./scripts/stop_mac.sh` (or `.\scripts\stop_windows.ps1`).
The named volume `finally-data` is preserved so the SQLite database survives restarts.

> The Docker image bundles the Next.js static export and the FastAPI backend.
> End-to-end serving (FastAPI → static frontend) is finalized in the integration
> task; until then the image builds and runs but the frontend may not yet be
> wired through every route in production mode.

### Local development

Run the backend and frontend in separate terminals.

**Terminal 1 — Backend:**
```bash
cp .env.example .env         # Add OPENROUTER_API_KEY
cd backend
uv sync --extra dev          # Install dependencies
uv run uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev                  # Dev server on http://localhost:3000
```

Open **http://localhost:3000**. The frontend dev server automatically proxies all `/api/*` requests to the backend on port 8000 — no extra configuration needed.

> To use a different backend port, set `NEXT_PUBLIC_API_URL=http://localhost:<port>` before running `npm run dev`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI chat |
| `MASSIVE_API_KEY` | No | Massive (Polygon.io) key for real market data; omit to use simulator |
| `LLM_MOCK` | No | Set `true` for deterministic mock LLM responses (testing) |
| `DB_PATH` | No | Custom path for the SQLite database file |

## Testing

### Frontend unit tests

```bash
cd frontend
npm install
node_modules/.bin/jest --coverage    # 135 tests, 84%+ coverage
```

### Backend integration tests

```bash
cd backend
.venv/bin/pytest tests/ -v           # 90 tests
```

### E2E system tests (Playwright)

Requires the app running at `http://localhost:8000`:

```bash
cd test
npm install
BASE_URL=http://localhost:8000 npx playwright test
```

Or run the full system in Docker:

```bash
docker compose -f test/docker-compose.test.yml up --abort-on-container-exit
```

## Project Structure

```
finally/
├── frontend/    # Next.js static export
├── backend/     # FastAPI uv project
├── planning/    # Project documentation and agent contracts
├── test/        # Playwright E2E tests
├── db/          # SQLite volume mount (runtime)
└── scripts/     # Start/stop helpers
```

## License

See [LICENSE](LICENSE).
