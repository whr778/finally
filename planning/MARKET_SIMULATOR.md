# Market Simulator Design

Approach for simulating realistic stock prices when no `MASSIVE_API_KEY` is configured. The simulator is the default data source.

## Overview

The simulator uses **Geometric Brownian Motion (GBM)** to generate realistic stock price paths. GBM is the standard model underlying Black-Scholes option pricing -- prices evolve continuously with random noise, can't go negative, and exhibit the lognormal distribution seen in real markets.

Updates run every 500ms, producing a continuous stream of price changes.

## GBM Math

At each time step, a stock price evolves as:

```
S(t+dt) = S(t) * exp((mu - sigma^2/2) * dt + sigma * sqrt(dt) * Z)
```

Where:
- `S(t)` = current price
- `mu` = annualized drift (expected return), e.g. 0.05 (5%)
- `sigma` = annualized volatility, e.g. 0.20 (20%)
- `dt` = time step as fraction of a trading year
- `Z` = standard normal random variable (correlated across tickers)

For 500ms updates with 252 trading days and 6.5 hours/day:
```
dt = 0.5 / (252 * 6.5 * 3600) = ~8.48e-8
```

This tiny `dt` produces sub-cent moves per tick that accumulate naturally over time.

## Correlated Moves

Real stocks don't move independently -- tech stocks tend to move together, etc. We use **Cholesky decomposition** of a correlation matrix to generate correlated random draws.

Given correlation matrix `C`, compute `L = cholesky(C)`. Then for independent standard normals `Z_independent`:
```
Z_correlated = L @ Z_independent
```

### Correlation Structure

| Group | Tickers | Intra-group Correlation |
|-------|---------|------------------------|
| Tech | AAPL, GOOGL, MSFT, AMZN, META, NVDA, NFLX | 0.6 |
| Finance | JPM, V | 0.5 |
| Cross-sector | Any pair across groups | 0.3 |
| TSLA | With anything | 0.3 (it does its own thing) |

Note: TSLA is technically in the tech set but is handled as an independent mover with lower correlation to everything.

The Cholesky matrix is rebuilt whenever tickers are added or removed. This is O(n^2) but n is small (< 50 tickers).

## Random Events

Each step, each ticker has a ~0.1% probability of a "shock event" -- a sudden 2-5% move in either direction. This adds visual drama to the dashboard.

```python
if random.random() < 0.001:
    shock = random.uniform(0.02, 0.05) * random.choice([-1, 1])
    price *= (1 + shock)
```

With 10 tickers at 2 ticks/sec, expect an event somewhere roughly every 50 seconds.

## Seed Prices

Realistic starting prices for the default watchlist:

| Ticker | Seed Price | Sigma (Volatility) | Mu (Drift) | Notes |
|--------|-----------|-------------------|-----------|-------|
| AAPL | $190.00 | 0.22 | 0.05 | |
| GOOGL | $175.00 | 0.25 | 0.05 | |
| MSFT | $420.00 | 0.20 | 0.05 | |
| AMZN | $185.00 | 0.28 | 0.05 | |
| TSLA | $250.00 | 0.50 | 0.03 | High vol, low drift |
| NVDA | $800.00 | 0.40 | 0.08 | High vol, strong drift |
| META | $500.00 | 0.30 | 0.05 | |
| JPM | $195.00 | 0.18 | 0.04 | Low vol (bank) |
| V | $280.00 | 0.17 | 0.04 | Low vol (payments) |
| NFLX | $600.00 | 0.35 | 0.05 | |

Tickers added dynamically (not in the seed list) start at a random price between $50-$300 and use default parameters: `sigma=0.25`, `mu=0.05`.

## Implementation

### GBMSimulator Class

The core simulator. Manages prices, parameters, and the Cholesky matrix for all tracked tickers.

```python
class GBMSimulator:
    """Geometric Brownian Motion simulator for correlated stock prices."""

    TRADING_SECONDS_PER_YEAR = 252 * 6.5 * 3600  # 5,896,800
    DEFAULT_DT = 0.5 / TRADING_SECONDS_PER_YEAR   # ~8.48e-8

    def __init__(self, tickers: list[str], dt=DEFAULT_DT, event_probability=0.001):
        # Initialize tickers with seed prices and params
        # Build Cholesky matrix once for batch initialization

    def step(self) -> dict[str, float]:
        """Advance all tickers by one time step. Returns {ticker: new_price}.
        This is the hot path -- called every 500ms."""
        # 1. Generate n independent standard normal draws
        # 2. Apply Cholesky to get correlated draws
        # 3. Apply GBM formula to each ticker
        # 4. Check for random events
        # 5. Return rounded prices

    def add_ticker(self, ticker: str) -> None:
        """Add a ticker. Rebuilds correlation matrix."""

    def remove_ticker(self, ticker: str) -> None:
        """Remove a ticker. Rebuilds correlation matrix."""

    def get_price(self, ticker: str) -> float | None:
        """Current price for a ticker."""

    def get_tickers(self) -> list[str]:
        """List of currently tracked tickers."""
```

### SimulatorDataSource Wrapper

The `SimulatorDataSource` (implements `MarketDataSource` ABC) wraps `GBMSimulator` in an async background loop that writes to the `PriceCache` every 500ms:

```python
class SimulatorDataSource(MarketDataSource):
    def __init__(self, price_cache: PriceCache, update_interval=0.5, event_probability=0.001):
        ...

    async def start(self, tickers: list[str]) -> None:
        self._sim = GBMSimulator(tickers=tickers, event_probability=self._event_prob)
        # Seed cache with initial prices immediately
        for ticker in tickers:
            self._cache.update(ticker=ticker, price=self._sim.get_price(ticker))
        self._task = asyncio.create_task(self._run_loop())

    async def _run_loop(self) -> None:
        while True:
            prices = self._sim.step()
            for ticker, price in prices.items():
                self._cache.update(ticker=ticker, price=price)
            await asyncio.sleep(self._interval)
```

## File Structure

```
backend/app/market/
    simulator.py     # GBMSimulator class + SimulatorDataSource
    seed_prices.py   # SEED_PRICES, TICKER_PARAMS, DEFAULT_PARAMS, correlation constants
```

`seed_prices.py` contains only constant definitions. `simulator.py` contains the `GBMSimulator` class and the `SimulatorDataSource` wrapper.

## Behavior Notes

- **Prices never go negative** -- GBM is multiplicative (`exp()` is always positive)
- **Sub-cent per-tick moves** -- the tiny `dt` produces realistic, smooth price paths
- **Intraday range scales correctly** -- with `sigma=0.50` (TSLA), a simulated day produces roughly the right intraday range
- **Positive semi-definite guarantee** -- Cholesky decomposition requires a valid correlation matrix; our symmetric construction ensures this
- **Dynamic tickers** -- when a ticker is added/removed mid-session, the Cholesky matrix is rebuilt. O(n^2) but n < 50, so effectively instant
- **Cache seeding** -- initial prices are written to the cache in `start()` so SSE clients get data immediately on connect, before the first `step()` runs
