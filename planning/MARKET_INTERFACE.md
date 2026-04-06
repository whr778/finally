# Market Data Interface Design

Unified Python interface for market data in FinAlly. Two implementations (simulator and Massive API) behind one abstract interface. All downstream code -- SSE streaming, price cache, portfolio valuation, trade execution -- is source-agnostic.

## Architecture

```
create_market_data_source(cache)    <-- Factory (reads MASSIVE_API_KEY)
          |
          v
MarketDataSource (ABC)
├── SimulatorDataSource  -->  GBM simulator (default, no API key needed)
└── MassiveDataSource    -->  Polygon.io REST poller (when MASSIVE_API_KEY set)
          |
          v
     PriceCache (thread-safe, in-memory)
          |
          ├──> SSE stream endpoint (GET /api/stream/prices)
          ├──> Portfolio valuation
          └──> Trade execution
```

## Core Data Model

```python
from dataclasses import dataclass, field
import time

@dataclass(frozen=True, slots=True)
class PriceUpdate:
    """Immutable snapshot of a single ticker's price at a point in time."""
    ticker: str
    price: float
    previous_price: float
    timestamp: float = field(default_factory=time.time)  # Unix seconds

    # Computed properties (not stored):
    # .change        -> float   (price - previous_price)
    # .change_percent -> float  (percentage change)
    # .direction     -> str     ("up", "down", or "flat")
    # .to_dict()     -> dict    (JSON-serializable)
```

`PriceUpdate` is the only data structure that crosses the market data boundary. Everything downstream works with these objects.

## Abstract Interface

```python
from abc import ABC, abstractmethod

class MarketDataSource(ABC):
    """Contract for market data providers.

    Implementations push price updates into a shared PriceCache on their own
    schedule. Downstream code never calls the data source directly for prices --
    it reads from the cache.
    """

    @abstractmethod
    async def start(self, tickers: list[str]) -> None:
        """Begin producing price updates. Starts a background task.
        Must be called exactly once."""

    @abstractmethod
    async def stop(self) -> None:
        """Stop the background task. Safe to call multiple times."""

    @abstractmethod
    async def add_ticker(self, ticker: str) -> None:
        """Add a ticker to the active set. No-op if already present."""

    @abstractmethod
    async def remove_ticker(self, ticker: str) -> None:
        """Remove a ticker. Also removes from the PriceCache."""

    @abstractmethod
    def get_tickers(self) -> list[str]:
        """Return the current list of actively tracked tickers."""
```

Both implementations write to a shared `PriceCache`. The interface does **not** return prices directly -- it pushes updates into the cache on its own schedule.

## Price Cache

Thread-safe in-memory store. Writers: data sources. Readers: SSE, portfolio, trades.

```python
from threading import Lock

class PriceCache:
    """Thread-safe cache of latest prices per ticker."""

    def __init__(self) -> None:
        self._prices: dict[str, PriceUpdate] = {}
        self._lock = Lock()         # threading.Lock, not asyncio.Lock
        self._version: int = 0      # Monotonic counter for SSE change detection

    def update(self, ticker: str, price: float, timestamp: float | None = None) -> PriceUpdate:
        """Record a new price. Computes direction from previous price automatically.
        First update for a ticker sets previous_price = price (direction='flat')."""

    def get(self, ticker: str) -> PriceUpdate | None:
        """Get latest PriceUpdate for a ticker."""

    def get_price(self, ticker: str) -> float | None:
        """Convenience: get just the float price."""

    def get_all(self) -> dict[str, PriceUpdate]:
        """Snapshot of all current prices (shallow copy)."""

    def remove(self, ticker: str) -> None:
        """Remove a ticker from the cache."""

    @property
    def version(self) -> int:
        """Monotonic counter. Bumped on every update. Used by SSE to detect changes."""
```

Why `threading.Lock` instead of `asyncio.Lock`: the cache is written from both the event-loop thread (simulator) and from `asyncio.to_thread` workers (Massive client). A threading lock handles both contexts correctly.

## Factory

Select the data source at startup based on environment:

```python
import os

def create_market_data_source(price_cache: PriceCache) -> MarketDataSource:
    """Create the appropriate data source based on environment.

    - MASSIVE_API_KEY set and non-empty -> MassiveDataSource
    - Otherwise -> SimulatorDataSource

    Returns an unstarted source. Caller must await source.start(tickers).
    """
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()

    if api_key:
        return MassiveDataSource(api_key=api_key, price_cache=price_cache)
    else:
        return SimulatorDataSource(price_cache=price_cache)
```

## Massive Implementation

Polls the Massive REST API on a timer using the `massive` Python package.

```python
class MassiveDataSource(MarketDataSource):
    def __init__(self, api_key: str, price_cache: PriceCache, poll_interval: float = 15.0):
        self._client: RESTClient        # Created in start()
        self._cache = price_cache
        self._interval = poll_interval  # 15s for free tier (5 req/min)
        self._tickers: list[str] = []
        self._task: asyncio.Task | None = None

    async def start(self, tickers: list[str]) -> None:
        self._client = RESTClient(api_key=self._api_key)
        self._tickers = list(tickers)
        await self._poll_once()  # Immediate first poll so cache has data right away
        self._task = asyncio.create_task(self._poll_loop())

    async def _poll_once(self) -> None:
        # Synchronous Massive client runs in a thread
        snapshots = await asyncio.to_thread(self._fetch_snapshots)
        for snap in snapshots:
            self._cache.update(
                ticker=snap.ticker,
                price=snap.last_trade.price,
                timestamp=snap.last_trade.timestamp / 1000,  # ms -> seconds
            )

    def _fetch_snapshots(self) -> list:
        return self._client.get_snapshot_all(
            market_type=SnapshotMarketType.STOCKS,
            tickers=self._tickers,
        )
```

Key design choices:
- `asyncio.to_thread()` wraps the synchronous Massive client to avoid blocking the event loop
- Immediate first poll in `start()` so the cache has data before the SSE stream begins
- Errors in `_poll_once` are logged but don't crash the loop -- retry happens on next interval

## Simulator Implementation

Wraps a `GBMSimulator` (see `MARKET_SIMULATOR.md`) in an async background loop.

```python
class SimulatorDataSource(MarketDataSource):
    def __init__(self, price_cache: PriceCache, update_interval: float = 0.5):
        self._cache = price_cache
        self._interval = update_interval  # 500ms between ticks
        self._sim: GBMSimulator | None = None
        self._task: asyncio.Task | None = None

    async def start(self, tickers: list[str]) -> None:
        self._sim = GBMSimulator(tickers=tickers)
        # Seed cache with initial prices immediately
        for ticker in tickers:
            price = self._sim.get_price(ticker)
            if price is not None:
                self._cache.update(ticker=ticker, price=price)
        self._task = asyncio.create_task(self._run_loop())

    async def _run_loop(self) -> None:
        while True:
            prices = self._sim.step()  # Returns dict[str, float]
            for ticker, price in prices.items():
                self._cache.update(ticker=ticker, price=price)
            await asyncio.sleep(self._interval)
```

## SSE Streaming

The SSE endpoint reads from the PriceCache and pushes to connected clients:

```python
def create_stream_router(price_cache: PriceCache) -> APIRouter:
    """Factory: creates FastAPI router with GET /api/stream/prices."""

    @router.get("/prices")
    async def stream_prices(request: Request) -> StreamingResponse:
        return StreamingResponse(
            _generate_events(price_cache, request),
            media_type="text/event-stream",
        )
```

The event generator:
- Sends all prices every ~500ms
- Uses `price_cache.version` for change detection (only sends when new data arrives)
- Sends heartbeat comments every 15s for proxy/LB keep-alive
- Stops when `request.is_disconnected()` returns `True`

SSE event format:
```
data: {"AAPL": {"ticker": "AAPL", "price": 190.50, "previous_price": 190.45, "change": 0.05, "change_percent": 0.0263, "direction": "up", "timestamp": 1712160000.0}, ...}
```

## File Structure

```
backend/app/market/
    __init__.py          # Public API: PriceCache, PriceUpdate, MarketDataSource, create_market_data_source, create_stream_router
    models.py            # PriceUpdate frozen dataclass
    interface.py         # MarketDataSource ABC
    cache.py             # PriceCache (thread-safe, version counter)
    factory.py           # create_market_data_source()
    massive_client.py    # MassiveDataSource (REST poller)
    simulator.py         # GBMSimulator + SimulatorDataSource
    seed_prices.py       # SEED_PRICES, TICKER_PARAMS, correlation constants
    stream.py            # SSE endpoint factory (create_stream_router)
```

## Lifecycle

```python
from app.market import PriceCache, create_market_data_source, create_stream_router

# 1. Startup
cache = PriceCache()
source = create_market_data_source(cache)       # Reads MASSIVE_API_KEY
await source.start(["AAPL", "GOOGL", "MSFT"])   # Begins background task

# 2. Read prices (from anywhere in the app)
update = cache.get("AAPL")          # PriceUpdate or None
price = cache.get_price("AAPL")     # float or None
all_prices = cache.get_all()        # dict[str, PriceUpdate]

# 3. Dynamic watchlist changes
await source.add_ticker("TSLA")
await source.remove_ticker("GOOGL")

# 4. SSE streaming (FastAPI router)
router = create_stream_router(cache)

# 5. Shutdown
await source.stop()
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Strategy pattern (ABC) | Downstream code is source-agnostic; swap implementations via env var |
| PriceCache as single point of truth | Producers write, consumers read; no direct coupling between layers |
| `threading.Lock` in cache | Works in both event-loop and thread-pool contexts |
| Version counter on cache | SSE only sends data when something changed; avoids duplicate pushes |
| Factory reads env var | No config plumbing needed; just set `MASSIVE_API_KEY` |
| Immediate first poll/seed | SSE clients get data on connect without waiting for the next tick |
