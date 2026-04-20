# Technology Stack

**Analysis Date:** 2026-04-20

## Languages

**Primary:**
- Python 3.12+ - Backend API server, market data processing, portfolio logic
- TypeScript - Frontend (Next.js), E2E tests

**Secondary:**
- SQL - SQLite schema and queries

## Runtime

**Environment:**
- Python 3.12+ (requires-python >= 3.12 in `backend/pyproject.toml`)
- Node.js 20+ (inferred from frontend build tooling)

**Package Manager:**
- `uv` (Python package manager) - `backend/pyproject.toml` with lockfile `backend/uv.lock`
- npm (Node.js package manager) - `frontend/package.json` and `test/package.json`
- Lockfiles: `backend/uv.lock` (present), npm lockfiles implied but not committed

## Frameworks

**Core:**
- FastAPI 0.115.0+ - REST API server, SSE streaming, static file serving (`backend/pyproject.toml`)
- uvicorn[standard] 0.32.0+ - ASGI server for FastAPI (`backend/pyproject.toml`)
- Next.js - Frontend framework (static export mode, served by FastAPI)

**Testing:**
- pytest 8.3.0+ - Backend unit/integration tests (`backend/pyproject.toml`)
- pytest-asyncio 0.24.0+ - Async test support for FastAPI (`backend/pyproject.toml`)
- pytest-cov 5.0.0+ - Code coverage (`backend/pyproject.toml`)
- Playwright 1.48.0 - E2E browser tests (`test/package.json`)

**Build/Dev:**
- Hatchling - Python build backend (`backend/pyproject.toml`)
- ruff 0.7.0+ - Python linter and code formatter (`backend/pyproject.toml`)

## Key Dependencies

**Critical:**
- FastAPI 0.115.0+ - REST framework for all API routes and SSE streaming
- uvicorn[standard] 0.32.0+ - Application server
- aiosqlite 0.20.0+ - Async SQLite3 client, enables lazy database initialization (`backend/pyproject.toml`)
- numpy 2.0.0+ - Numerical computations for GBM simulator (`backend/pyproject.toml`)
- pydantic 2.0.0+ - Data validation, request/response models

**Infrastructure:**
- massive 1.0.0+ - Polygon.io REST API client for real market data (optional, fallback to simulator) (`backend/pyproject.toml`)
- litellm 1.50.0+ - LLM client abstraction, used for OpenRouter → Cerebras inference (`backend/pyproject.toml`)
- rich 13.0.0+ - Terminal styling for logging and CLI output (`backend/pyproject.toml`)
- python-dotenv 1.0.0+ - Environment variable loading from `.env` (`backend/pyproject.toml`)

## Configuration

**Environment:**
- `.env` file (gitignored, contains secrets) - Mounted into Docker container or read locally
- Environment variables are loaded via `python-dotenv` in `backend/app/main.py` from project root (one level above `backend/`)
- Key configs:
  - `OPENROUTER_API_KEY` - Required for LLM chat functionality
  - `MASSIVE_API_KEY` - Optional; if absent, simulator is used (recommended)
  - `LLM_MOCK` - Set to `true` for deterministic mock LLM responses in testing
  - `DB_PATH` - Optional; custom SQLite database file location (default: `db/finally.db`)

**Build:**
- `backend/pyproject.toml` - Python project configuration, dependencies, test/lint settings
  - Ruff config: line-length=100, target-version=py312, selects linting rules E/F/I/N/W
  - Pytest config: testpaths=tests, asyncio_mode=auto, asyncio_default_fixture_loop_scope=function
  - Coverage config: source=app, omit=tests/*
- `test/package.json` - E2E test dependencies (Playwright)
- Multi-stage Docker build (implied from `test/docker-compose.test.yml`):
  - Stage 1: Node.js to build Next.js static export
  - Stage 2: Python to run FastAPI, copy static files from Stage 1

## Platform Requirements

**Development:**
- Python 3.12+
- uv (Python package manager)
- Node.js 20+
- npm (or yarn/pnpm)
- Docker (for containerized build/test)
- SQLite3 (bundled with Python)

**Production:**
- Docker container serving on port 8000
- Named Docker volume for SQLite persistence (`finally-data` or similar)
- Mounted `.env` file with `OPENROUTER_API_KEY` and optional `MASSIVE_API_KEY`
- Internet connectivity for OpenRouter API calls and optional Massive API

---

*Stack analysis: 2026-04-20*
