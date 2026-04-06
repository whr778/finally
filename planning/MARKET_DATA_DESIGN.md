# Market Data Backend — Implementation Design

This document is the authoritative design reference for the market data subsystem in `backend/app/market/`. It covers the unified interface, GBM simulator, Massive API client, price cache, SSE streaming, and FastAPI integration. The subsystem is **complete and tested** — this document reflects the actual implementation.

---

## Architecture

```
create_market_data_source(cache)     ← factory (reads MASSIVE_API_KEY env var)
          │
          ▼
MarketDataSource (ABC)
├── SimulatorDataSource    ← GBM simulator, default, no API key needed
└── MassiveDataSource      ← Polygon.io REST poller, used when MASSIVE_API_KEY is set
          │
          ▼
     PriceCache (thread-safe, in-memory)
          │
          ├──▶ GET /api/stream/prices  (SSE)
          ├──▶ GET /api/portfolio       (valuation)
          └──▶ POST /api/portfolio/trade (execution price)
```

**Key principle:** data sources never return prices directly. They push `PriceUpdate` objects into `PriceCache` on their own schedule. All downstream code reads from the cache — it is source-agnostic.

---

## File Structure

```
backend/app/market/
    __init__.py          # Public exports
    models.py            # PriceUpdate dataclass
    interface.py         # MarketDataSource ABC
    cache.py             # PriceCache (thread-safe, version counter)
    seed_prices.py       # Seed prices + per-ticker GBM params + correlation constants
    simulator.py         # GBMSimulator + SimulatorDataSource
    massive_client.py    # MassiveDataSource (REST poller)
    factory.py           # create_market_data_source()
    stream.py            # SSE endpoint (create_stream_router)
```

Public API via `__init__.py`:

```python
from app.market import (
    PriceUpdate,
    PriceCache,
    MarketDataSource,
    create_market_data_source,
    create_stream_router,
)
```

---

## Core Data Model

`PriceUpdate` is the only data structure that crosses the market data boundary. Everything downstream works with these objects.

```python
# backend/app/market/models.py

from dataclasses import dataclass, field
import time

@dataclass(frozen=True, slots=True)
class PriceUpdate:
    """Immutable snapshot of a single ticker's price at a point in time."""

    ticker: str
    price: float           # Rounded to 2 decimal places by the cache
    previous_price: float  # Price from the prior update (same on first update)
    timestamp: float = field(default_factory=time.time)  # Unix seconds

    @property
    def change(self) -> float:
        """Absolute price change from previous update."""
        return round(self.price - self.previous_price, 4)

    @property
    def change_percent(self) -> float:
        """Percentage change from previous update."""
        if self.previous_price == 0:
            return 0.0
        return round((self.price - self.previous_price) / self.previous_price * 100, 4)

    @property
    def direction(self) -> str:
        """'up', 'down', or 'flat'."""
        if self.price > self.previous_price:
            return "up"
        elif self.price < self.previous_price:
            return "down"
        return "flat"

    def to_dict(self) -> dict:
        """Serialize for JSON / SSE transmission."""
        return {
            "ticker": self.ticker,
            "price": self.price,
            "previous_price": self.previous_price,
            "timestamp": self.timestamp,
            "change": self.change,
            "change_percent": self.change_percent,
            "direction": self.direction,
        }
```

---

## Price Cache

Thread-safe in-memory store. Uses `threading.Lock` (not `asyncio.Lock`) because the cache is written from both the event-loop thread (simulator) and `asyncio.to_thread` workers (Massive client).

The `version` counter is bumped on every write. The SSE generator uses it to detect when new data has arrived, avoiding redundant pushes.

```python
# backend/app/market/cache.py

from threading import Lock
import time
from .models import PriceUpdate


class PriceCache:
    """Thread-safe in-memory cache of the latest price for each ticker."""

    def __init__(self) -> None:
        self._prices: dict[str, PriceUpdate] = {}
        self._lock = Lock()
        self._version: int = 0

    def update(self, ticker: str, price: float, timestamp: float | None = None) -> PriceUpdate:
        """Record a new price. Returns the created PriceUpdate.

        First update for a ticker sets previous_price = price (direction='flat').
        """
        with self._lock:
            ts = timestamp or time.time()
            prev = self._prices.get(ticker)
            previous_price = prev.price if prev else price

            update = PriceUpdate(
                ticker=ticker,
                price=round(price, 2),
                previous_price=round(previous_price, 2),
                timestamp=ts,
            )
            self._prices[ticker] = update
            self._version += 1
            return update

    def get(self, ticker: str) -> PriceUpdate | None:
        with self._lock:
            return self._prices.get(ticker)

    def get_price(self, ticker: str) -> float | None:
        update = self.get(ticker)
        return update.price if update else None

    def get_all(self) -> dict[str, PriceUpdate]:
        """Snapshot of all current prices (shallow copy)."""
        with self._lock:
            return dict(self._prices)

    def remove(self, ticker: str) -> None:
        with self._lock:
            self._prices.pop(ticker, None)

    @property
    def version(self) -> int:
        """Monotonic counter. Incremented on every update."""
        with self._lock:
            return self._version
```

---

## Abstract Interface

Both implementations satisfy this contract. Downstream code depends only on `MarketDataSource`.

```python
# backend/app/market/interface.py

from abc import ABC, abstractmethod


class MarketDataSource(ABC):
    """Contract for market data providers.

    Implementations push price updates into a PriceCache on their own schedule.
    Downstream code reads from the cache — it never calls the data source for prices.

    Lifecycle:
        source = create_market_data_source(cache)
        await source.start(["AAPL", "GOOGL", ...])
        await source.add_ticker("TSLA")      # dynamic add
        await source.remove_ticker("GOOGL")  # dynamic remove
        await source.stop()                  # on shutdown
    """

    @abstractmethod
    async def start(self, tickers: list[str]) -> None:
        """Begin producing price updates. Starts a background task. Call once."""

    @abstractmethod
    async def stop(self) -> None:
        """Stop the background task. Safe to call multiple times."""

    @abstractmethod
    async def add_ticker(self, ticker: str) -> None:
        """Add a ticker to the active set. No-op if already present."""

    @abstractmethod
    async def remove_ticker(self, ticker: str) -> None:
        """Remove a ticker. Also removes it from the PriceCache."""

    @abstractmethod
    def get_tickers(self) -> list[str]:
        """Return the current list of actively tracked tickers."""
```

---

## Simulator

### Seed Data

```python
# backend/app/market/seed_prices.py

SEED_PRICES: dict[str, float] = {
    "AAPL": 190.00, "GOOGL": 175.00, "MSFT": 420.00,
    "AMZN": 185.00, "TSLA": 250.00,  "NVDA": 800.00,
    "META": 500.00, "JPM":  195.00,  "V":    280.00,
    "NFLX": 600.00,
}

# Per-ticker GBM parameters: sigma = annualized volatility, mu = annualized drift
TICKER_PARAMS: dict[str, dict[str, float]] = {
    "AAPL":  {"sigma": 0.22, "mu": 0.05},
    "GOOGL": {"sigma": 0.25, "mu": 0.05},
    "MSFT":  {"sigma": 0.20, "mu": 0.05},
    "AMZN":  {"sigma": 0.28, "mu": 0.05},
    "TSLA":  {"sigma": 0.50, "mu": 0.03},  # High vol, low drift
    "NVDA":  {"sigma": 0.40, "mu": 0.08},  # High vol, strong drift
    "META":  {"sigma": 0.30, "mu": 0.05},
    "JPM":   {"sigma": 0.18, "mu": 0.04},  # Low vol (bank)
    "V":     {"sigma": 0.17, "mu": 0.04},  # Low vol (payments)
    "NFLX":  {"sigma": 0.35, "mu": 0.05},
}

# Tickers not in the list start here
DEFAULT_PARAMS: dict[str, float] = {"sigma": 0.25, "mu": 0.05}

CORRELATION_GROUPS: dict[str, set[str]] = {
    "tech":    {"AAPL", "GOOGL", "MSFT", "AMZN", "META", "NVDA", "NFLX"},
    "finance": {"JPM", "V"},
}
# TSLA is excluded from "tech" — handled separately in _pairwise_correlation

INTRA_TECH_CORR    = 0.6  # Tech stocks move together
INTRA_FINANCE_CORR = 0.5  # Finance stocks move together
CROSS_GROUP_CORR   = 0.3  # Between sectors / unknown tickers
TSLA_CORR          = 0.3  # TSLA does its own thing
```

### GBM Math

At each time step:

```
S(t+dt) = S(t) * exp((mu - sigma²/2) * dt + sigma * sqrt(dt) * Z)
```

For 500ms ticks: `dt = 0.5 / (252 * 6.5 * 3600) ≈ 8.48e-8`

This tiny `dt` produces sub-cent moves per tick. Prices accumulate naturally over time and can never go negative (GBM is multiplicative via `exp`).

Correlated moves use Cholesky decomposition: given correlation matrix `C` and `L = cholesky(C)`, then `Z_correlated = L @ Z_independent` for independent standard normals `Z_independent`.

### GBMSimulator Class

```python
# backend/app/market/simulator.py (GBMSimulator)

import math, random, numpy as np
from .seed_prices import (
    SEED_PRICES, TICKER_PARAMS, DEFAULT_PARAMS,
    CORRELATION_GROUPS, INTRA_TECH_CORR, INTRA_FINANCE_CORR,
    CROSS_GROUP_CORR, TSLA_CORR,
)


class GBMSimulator:
    """Geometric Brownian Motion simulator for correlated stock prices."""

    TRADING_SECONDS_PER_YEAR = 252 * 6.5 * 3600   # 5,896,800
    DEFAULT_DT = 0.5 / TRADING_SECONDS_PER_YEAR   # ~8.48e-8

    def __init__(self, tickers: list[str], dt=DEFAULT_DT, event_probability=0.001):
        self._dt = dt
        self._event_prob = event_probability
        self._tickers: list[str] = []
        self._prices: dict[str, float] = {}
        self._params: dict[str, dict[str, float]] = {}
        self._cholesky: np.ndarray | None = None

        for ticker in tickers:
            self._add_ticker_internal(ticker)
        self._rebuild_cholesky()

    def step(self) -> dict[str, float]:
        """Advance all tickers by one time step. Returns {ticker: new_price}."""
        n = len(self._tickers)
        if n == 0:
            return {}

        z = np.random.standard_normal(n)
        if self._cholesky is not None:
            z = self._cholesky @ z

        result: dict[str, float] = {}
        for i, ticker in enumerate(self._tickers):
            mu = self._params[ticker]["mu"]
            sigma = self._params[ticker]["sigma"]

            drift = (mu - 0.5 * sigma**2) * self._dt
            diffusion = sigma * math.sqrt(self._dt) * z[i]
            self._prices[ticker] *= math.exp(drift + diffusion)

            # Random shock: ~0.1% chance per tick — 2-5% move for visual drama
            # With 10 tickers at 2 ticks/sec, expect an event roughly every 50s
            if random.random() < self._event_prob:
                shock = random.uniform(0.02, 0.05) * random.choice([-1, 1])
                self._prices[ticker] *= (1 + shock)

            result[ticker] = round(self._prices[ticker], 2)

        return result

    def add_ticker(self, ticker: str) -> None:
        """Add a ticker. Rebuilds the correlation matrix."""
        if ticker in self._prices:
            return
        self._add_ticker_internal(ticker)
        self._rebuild_cholesky()

    def remove_ticker(self, ticker: str) -> None:
        """Remove a ticker. Rebuilds the correlation matrix."""
        if ticker not in self._prices:
            return
        self._tickers.remove(ticker)
        del self._prices[ticker]
        del self._params[ticker]
        self._rebuild_cholesky()

    def get_price(self, ticker: str) -> float | None:
        return self._prices.get(ticker)

    def get_tickers(self) -> list[str]:
        return list(self._tickers)

    def _add_ticker_internal(self, ticker: str) -> None:
        """Add ticker without rebuilding Cholesky (for batch initialization)."""
        self._tickers.append(ticker)
        self._prices[ticker] = SEED_PRICES.get(ticker, random.uniform(50.0, 300.0))
        self._params[ticker] = TICKER_PARAMS.get(ticker, dict(DEFAULT_PARAMS))

    def _rebuild_cholesky(self) -> None:
        """Rebuild Cholesky decomposition. O(n²), called on add/remove."""
        n = len(self._tickers)
        if n <= 1:
            self._cholesky = None
            return

        corr = np.eye(n)
        for i in range(n):
            for j in range(i + 1, n):
                rho = self._pairwise_correlation(self._tickers[i], self._tickers[j])
                corr[i, j] = corr[j, i] = rho

        self._cholesky = np.linalg.cholesky(corr)

    @staticmethod
    def _pairwise_correlation(t1: str, t2: str) -> float:
        tech    = CORRELATION_GROUPS["tech"]
        finance = CORRELATION_GROUPS["finance"]
        if t1 == "TSLA" or t2 == "TSLA":
            return TSLA_CORR
        if t1 in tech and t2 in tech:
            return INTRA_TECH_CORR
        if t1 in finance and t2 in finance:
            return INTRA_FINANCE_CORR
        return CROSS_GROUP_CORR
```

### SimulatorDataSource

Wraps `GBMSimulator` in an async background loop:

```python
# backend/app/market/simulator.py (SimulatorDataSource)

import asyncio, logging
from .cache import PriceCache
from .interface import MarketDataSource

logger = logging.getLogger(__name__)


class SimulatorDataSource(MarketDataSource):
    """MarketDataSource backed by the GBM simulator. Default when no API key."""

    def __init__(self, price_cache: PriceCache, update_interval=0.5, event_probability=0.001):
        self._cache = price_cache
        self._interval = update_interval
        self._event_prob = event_probability
        self._sim: GBMSimulator | None = None
        self._task: asyncio.Task | None = None

    async def start(self, tickers: list[str]) -> None:
        self._sim = GBMSimulator(tickers=tickers, event_probability=self._event_prob)
        # Seed cache immediately so SSE clients have data before the first step()
        for ticker in tickers:
            price = self._sim.get_price(ticker)
            if price is not None:
                self._cache.update(ticker=ticker, price=price)
        self._task = asyncio.create_task(self._run_loop(), name="simulator-loop")
        logger.info("Simulator started with %d tickers", len(tickers))

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None

    async def add_ticker(self, ticker: str) -> None:
        if self._sim:
            self._sim.add_ticker(ticker)
            price = self._sim.get_price(ticker)
            if price is not None:
                self._cache.update(ticker=ticker, price=price)

    async def remove_ticker(self, ticker: str) -> None:
        if self._sim:
            self._sim.remove_ticker(ticker)
        self._cache.remove(ticker)

    def get_tickers(self) -> list[str]:
        return self._sim.get_tickers() if self._sim else []

    async def _run_loop(self) -> None:
        while True:
            try:
                if self._sim:
                    prices = self._sim.step()
                    for ticker, price in prices.items():
                        self._cache.update(ticker=ticker, price=price)
            except Exception:
                logger.exception("Simulator step failed")
            await asyncio.sleep(self._interval)
```

**Ticker validation in simulator mode:** any uppercase alphabetic symbol 1-5 chars is accepted. `add_ticker` bootstraps a new ticker with a random seed price between $50-$300 and default GBM params (`sigma=0.25`, `mu=0.05`).

---

## Massive API Client

Polls `GET /v2/snapshot/locale/us/markets/stocks/tickers` for all watched tickers in a single API call every `poll_interval` seconds.

The synchronous `massive` client runs in `asyncio.to_thread()` to avoid blocking the event loop.

```python
# backend/app/market/massive_client.py

import asyncio, logging
from massive import RESTClient
from massive.rest.models import SnapshotMarketType
from .cache import PriceCache
from .interface import MarketDataSource

logger = logging.getLogger(__name__)


class MassiveDataSource(MarketDataSource):
    """MarketDataSource backed by the Massive (Polygon.io) REST API.

    Rate limits:
        Free tier:  5 req/min  → poll every 15s (default)
        Paid tiers: unlimited  → poll every 2-5s
    """

    def __init__(self, api_key: str, price_cache: PriceCache, poll_interval=15.0):
        self._api_key = api_key
        self._cache = price_cache
        self._interval = poll_interval
        self._tickers: list[str] = []
        self._task: asyncio.Task | None = None
        self._client: RESTClient | None = None

    async def start(self, tickers: list[str]) -> None:
        self._client = RESTClient(api_key=self._api_key)
        self._tickers = list(tickers)
        await self._poll_once()  # Immediate first poll — cache has data before first SSE push
        self._task = asyncio.create_task(self._poll_loop(), name="massive-poller")
        logger.info("Massive poller started: %d tickers, %.1fs interval", len(tickers), self._interval)

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        self._client = None

    async def add_ticker(self, ticker: str) -> None:
        ticker = ticker.upper().strip()
        if ticker not in self._tickers:
            self._tickers.append(ticker)
            # Price appears on the next poll cycle (up to poll_interval seconds)

    async def remove_ticker(self, ticker: str) -> None:
        ticker = ticker.upper().strip()
        self._tickers = [t for t in self._tickers if t != ticker]
        self._cache.remove(ticker)

    def get_tickers(self) -> list[str]:
        return list(self._tickers)

    async def _poll_loop(self) -> None:
        """Poll on interval. First poll already happened in start()."""
        while True:
            await asyncio.sleep(self._interval)
            await self._poll_once()

    async def _poll_once(self) -> None:
        """One poll cycle: fetch snapshots, update cache."""
        if not self._tickers or not self._client:
            return
        try:
            snapshots = await asyncio.to_thread(self._fetch_snapshots)
            for snap in snapshots:
                try:
                    self._cache.update(
                        ticker=snap.ticker,
                        price=snap.last_trade.price,
                        timestamp=snap.last_trade.timestamp / 1000.0,  # ms → seconds
                    )
                except (AttributeError, TypeError) as e:
                    logger.warning("Skipping snapshot for %s: %s", getattr(snap, "ticker", "?"), e)
        except Exception as e:
            logger.error("Massive poll failed: %s", e)
            # Don't re-raise — loop retries on next interval

    def _fetch_snapshots(self) -> list:
        """Synchronous API call. Must run in a thread."""
        return self._client.get_snapshot_all(
            market_type=SnapshotMarketType.STOCKS,
            tickers=self._tickers,
        )
```

### Massive API field mapping

| Python attribute | Meaning |
|---|---|
| `snap.ticker` | Ticker symbol |
| `snap.last_trade.price` | Current price (last trade) |
| `snap.last_trade.timestamp` | Unix **milliseconds** — divide by 1000 for seconds |
| `snap.day.open/high/low/close` | Today's OHLC |
| `snap.day.change_percent` | Change from previous close |
| `snap.last_quote.bid_price` / `.ask_price` | NBBO bid/ask |

**Ticker validation in Massive mode:** attempt `get_snapshot_all` with the new ticker. If no data is returned, the ticker is rejected as unknown. This confirms it is a real tradeable symbol.

### Massive error handling

| Status | Meaning | Behavior |
|---|---|---|
| 401 | Invalid API key | Logged as error; poll loop continues |
| 429 | Rate limit exceeded | Logged as error; retry on next interval |
| 5xx | Server error | Client retries 3 times automatically |
| Network timeout | Connectivity issue | Logged as error; retry on next interval |

The loop never re-raises exceptions — last known prices remain in cache; clients see stale data rather than a crash.

---

## Factory

```python
# backend/app/market/factory.py

import os, logging
from .cache import PriceCache
from .interface import MarketDataSource
from .massive_client import MassiveDataSource
from .simulator import SimulatorDataSource

logger = logging.getLogger(__name__)


def create_market_data_source(price_cache: PriceCache) -> MarketDataSource:
    """Select data source based on environment.

    MASSIVE_API_KEY set and non-empty → MassiveDataSource (real data)
    Otherwise → SimulatorDataSource (GBM simulation, default)

    Returns an unstarted source. Caller must await source.start(tickers).
    """
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()
    if api_key:
        logger.info("Market data source: Massive API (real data)")
        return MassiveDataSource(api_key=api_key, price_cache=price_cache)
    else:
        logger.info("Market data source: GBM Simulator")
        return SimulatorDataSource(price_cache=price_cache)
```

---

## SSE Streaming

`GET /api/stream/prices` — long-lived Server-Sent Events stream. The client uses the native `EventSource` API; reconnection is handled automatically.

### Event format

```
retry: 1000

data: {"AAPL": {"ticker": "AAPL", "price": 190.50, "previous_price": 190.45, "change": 0.05, "change_percent": 0.0263, "direction": "up", "timestamp": 1712160000.0}, "GOOGL": {...}, ...}

data: {...}

: heartbeat

data: {...}
```

- All tracked tickers are sent together in a single `data` event as a JSON object keyed by ticker.
- Heartbeat comment (`: heartbeat`) sent every 15 seconds to keep the connection alive through proxies.
- `retry: 1000` tells the browser to reconnect after 1 second if the connection drops.

### Implementation

```python
# backend/app/market/stream.py

import asyncio, json, logging
from collections.abc import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from .cache import PriceCache

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 15  # seconds


def create_stream_router(price_cache: PriceCache) -> APIRouter:
    """Factory: returns a FastAPI router with GET /prices mounted."""

    router = APIRouter(prefix="/api/stream", tags=["streaming"])

    @router.get("/prices")
    async def stream_prices(request: Request) -> StreamingResponse:
        return StreamingResponse(
            _generate_events(price_cache, request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering if proxied
            },
        )

    return router


async def _generate_events(
    price_cache: PriceCache,
    request: Request,
    interval: float = 0.5,
) -> AsyncGenerator[str, None]:
    """Yield SSE-formatted events while the client is connected."""
    yield "retry: 1000\n\n"

    last_version = -1
    last_send_time = asyncio.get_running_loop().time()
    client_ip = request.client.host if request.client else "unknown"
    logger.info("SSE client connected: %s", client_ip)

    try:
        while True:
            if await request.is_disconnected():
                logger.info("SSE client disconnected: %s", client_ip)
                break

            now = asyncio.get_running_loop().time()
            current_version = price_cache.version

            if current_version != last_version:
                last_version = current_version
                prices = price_cache.get_all()
                if prices:
                    data = {t: u.to_dict() for t, u in prices.items()}
                    yield f"data: {json.dumps(data)}\n\n"
                    last_send_time = now

            elif now - last_send_time >= HEARTBEAT_INTERVAL:
                yield ": heartbeat\n\n"
                last_send_time = now

            await asyncio.sleep(interval)
    except asyncio.CancelledError:
        logger.info("SSE stream cancelled for: %s", client_ip)
```

**Version-based change detection:** the generator compares `price_cache.version` to its local `last_version` — only sends a new event when the cache has been updated. At 500ms poll interval with 500ms simulator ticks, events fire roughly every 500ms. In Massive mode with 15s polling, events fire every 15s.

---

## FastAPI App Integration

The full lifecycle — creating the cache and source, starting the background task, mounting the SSE router, and clean shutdown:

```python
# backend/app/main.py (sketch)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.market import PriceCache, create_market_data_source, create_stream_router

DEFAULT_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]

price_cache = PriceCache()
market_source = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global market_source

    # Load watchlist from DB, fall back to defaults
    tickers = load_watchlist_from_db() or DEFAULT_TICKERS

    market_source = create_market_data_source(price_cache)
    await market_source.start(tickers)

    yield  # App is running

    await market_source.stop()


app = FastAPI(lifespan=lifespan)

# Mount SSE router
app.include_router(create_stream_router(price_cache))

# Mount other API routers (portfolio, watchlist, chat)
# ...

# Serve Next.js static export at root
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

### Reading prices from other routes

```python
# In any FastAPI endpoint or background task:

price = price_cache.get_price("AAPL")      # float | None
update = price_cache.get("AAPL")           # PriceUpdate | None
all_prices = price_cache.get_all()         # dict[str, PriceUpdate]

# When executing a trade:
current_price = price_cache.get_price(ticker)
if current_price is None:
    raise HTTPException(404, f"No price data for {ticker}")
# execute at current_price ...
```

### Watchlist mutations

Watchlist changes must update both the database and the market source:

```python
# Add ticker
async def add_to_watchlist(ticker: str) -> None:
    ticker = ticker.upper().strip()
    db_add_watchlist_entry(ticker)          # persist to SQLite
    await market_source.add_ticker(ticker)  # start tracking (seeds cache)

# Remove ticker
async def remove_from_watchlist(ticker: str) -> None:
    db_remove_watchlist_entry(ticker)          # remove from SQLite
    await market_source.remove_ticker(ticker)  # stop tracking, removes from cache
```

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Strategy pattern (ABC) | Downstream code is fully source-agnostic; swap via env var at startup |
| PriceCache as single point of truth | Producers write, consumers read — no direct coupling |
| `threading.Lock` in cache | Works in both event-loop (simulator) and thread-pool (Massive) contexts |
| Version counter on cache | SSE sends only when data has changed — avoids duplicate pushes |
| Immediate seed/first poll | SSE clients get data on connect without waiting for the next tick interval |
| Factory reads env var | No config plumbing through app code — just set `MASSIVE_API_KEY` |
| Errors logged, not re-raised | Massive poll failures leave last-known prices; app stays alive |
| `asyncio.to_thread` for Massive | Synchronous `massive` client doesn't block the event loop |
| SSE over WebSockets | One-way push is all we need; simpler, universal browser support, no bidirectional complexity |
