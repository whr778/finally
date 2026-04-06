# Massive API Reference (formerly Polygon.io)

Reference documentation for the Massive REST API as used in FinAlly for retrieving real-time and end-of-day stock prices.

## Overview

| Detail | Value |
|--------|-------|
| Base URL | `https://api.massive.com` (legacy `https://api.polygon.io` still works) |
| Python package | `massive` (`uv add massive`) |
| Min Python | 3.9+ |
| Auth (header) | `Authorization: Bearer <API_KEY>` |
| Auth (query) | `?apiKey=<API_KEY>` |
| Rebrand | Polygon.io became Massive on October 30, 2025. All endpoints/schemas unchanged. |

## Rate Limits

| Tier | Limit | Recommended Poll Interval |
|------|-------|---------------------------|
| Free | 5 requests/minute | 15 seconds |
| Paid (all) | Unlimited (stay under 100 req/s) | 2-5 seconds |

Free tier data has a 15-minute delay on intraday prices. Paid tiers get real-time data.

## Python Client

```python
from massive import RESTClient
from massive.rest.models import SnapshotMarketType

# Reads MASSIVE_API_KEY from environment automatically
client = RESTClient()

# Or pass explicitly
client = RESTClient(api_key="your_key_here")
```

## Endpoints

### 1. Full Market Snapshot (Primary Endpoint)

The batch endpoint we use for polling multiple tickers in a single API call. This is the main endpoint used by FinAlly.

**REST:** `GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,MSFT,GOOGL`

**Python client:**
```python
snapshots = client.get_snapshot_all(
    market_type=SnapshotMarketType.STOCKS,
    tickers=["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"],
)

for snap in snapshots:
    print(f"{snap.ticker}: ${snap.last_trade.price}")
    print(f"  Day change: {snap.day.change_percent}%")
    print(f"  Day OHLC: O={snap.day.open} H={snap.day.high} L={snap.day.low} C={snap.day.close}")
    print(f"  Volume: {snap.day.volume}")
```

**Raw JSON response:**
```json
{
  "status": "OK",
  "count": 3,
  "tickers": [
    {
      "ticker": "AAPL",
      "todaysChange": -1.23,
      "todaysChangePerc": -0.65,
      "updated": 1675190399000000000,
      "day": {
        "o": 152.50,
        "h": 154.20,
        "l": 151.80,
        "c": 153.10,
        "v": 65432100,
        "vw": 152.95
      },
      "prevDay": {
        "o": 151.00,
        "h": 153.80,
        "l": 150.50,
        "c": 154.33,
        "v": 58000000,
        "vw": 152.10
      },
      "min": {
        "o": 153.05, "h": 153.15, "l": 153.00, "c": 153.10,
        "v": 12500, "vw": 153.08, "t": 1675190340000, "n": 45,
        "av": 65432100
      },
      "lastTrade": {
        "p": 153.10,
        "s": 100,
        "t": 1675190399000000000,
        "x": 11,
        "i": "abc123",
        "c": [14, 41]
      },
      "lastQuote": {
        "p": 153.09,
        "s": 500,
        "P": 153.11,
        "S": 300,
        "t": 1675190399500000000
      }
    }
  ]
}
```

**Python client field mapping** (the `massive` package maps raw JSON to objects):

| Raw JSON | Python client | Description |
|----------|--------------|-------------|
| `lastTrade.p` | `snap.last_trade.price` | Last trade price (current price) |
| `lastTrade.s` | `snap.last_trade.size` | Last trade size |
| `lastTrade.t` | `snap.last_trade.timestamp` | Timestamp (Unix milliseconds) |
| `lastQuote.p` | `snap.last_quote.bid_price` | Bid price |
| `lastQuote.P` | `snap.last_quote.ask_price` | Ask price |
| `day.o/h/l/c` | `snap.day.open/high/low/close` | Today's OHLC |
| `day.v` | `snap.day.volume` | Today's volume |
| `day.vw` | `snap.day.volume_weighted_average_price` | VWAP |
| `prevDay.c` | `snap.day.previous_close` | Previous day's close |
| `todaysChange` | `snap.day.change` | Absolute change from previous close |
| `todaysChangePerc` | `snap.day.change_percent` | Percentage change |

**Key fields we extract for FinAlly:**
- `snap.last_trade.price` -- current price for trading and display
- `snap.last_trade.timestamp` -- when the price was recorded (Unix ms)

**Notes:**
- Snapshot data clears at 3:30 AM EST daily, repopulates starting ~4:00 AM EST
- Omitting the `tickers` parameter returns ALL US stocks
- Comma-separated tickers, case-sensitive

### 2. Single Ticker Snapshot

For detailed data on one ticker (e.g., when the user clicks a ticker for the detail view).

**REST:** `GET /v2/snapshot/locale/us/markets/stocks/tickers/{stocksTicker}`

**Python client:**
```python
snapshot = client.get_snapshot_ticker(
    market_type=SnapshotMarketType.STOCKS,
    ticker="AAPL",
)

print(f"Price: ${snapshot.last_trade.price}")
print(f"Bid/Ask: ${snapshot.last_quote.bid_price} / ${snapshot.last_quote.ask_price}")
print(f"Day range: ${snapshot.day.low} - ${snapshot.day.high}")
```

Same response structure as the batch endpoint but returns a single `ticker` object.

### 3. Previous Close (Single Ticker)

Previous trading day's OHLCV data.

**REST:** `GET /v2/aggs/ticker/{stocksTicker}/prev`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stocksTicker` | string (path) | Yes | Ticker symbol |
| `adjusted` | boolean (query) | No | Adjust for splits. Default: `true` |

**Python client:**
```python
prev = client.get_previous_close_agg(ticker="AAPL")

for agg in prev:
    print(f"Previous close: ${agg.close}")
    print(f"OHLC: O={agg.open} H={agg.high} L={agg.low} C={agg.close}")
    print(f"Volume: {agg.volume}")
```

**Raw JSON response:**
```json
{
  "ticker": "AAPL",
  "adjusted": true,
  "queryCount": 1,
  "resultsCount": 1,
  "status": "OK",
  "results": [
    {
      "T": "AAPL",
      "o": 115.55,
      "h": 117.59,
      "l": 114.13,
      "c": 115.97,
      "v": 131704427,
      "vw": 116.3058,
      "t": 1605042000000,
      "n": 824271
    }
  ]
}
```

Raw field mapping: `T`=ticker, `o`=open, `h`=high, `l`=low, `c`=close, `v`=volume, `vw`=VWAP, `t`=timestamp (Unix ms), `n`=number of transactions.

**Limitation:** Single-ticker endpoint. Use the snapshot endpoint for multiple tickers.

### 4. Grouped Daily Bars (All Tickers, One Date)

Returns OHLCV for ALL U.S. stocks on a given date in one request.

**REST:** `GET /v2/aggs/grouped/locale/us/market/stocks/{date}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string (path) | Yes | `YYYY-MM-DD` format |
| `adjusted` | boolean (query) | No | Adjust for splits. Default: `true` |
| `include_otc` | boolean (query) | No | Include OTC securities. Default: `false` |

**Python client:**
```python
aggs = client.get_grouped_daily_aggs(date="2026-04-02")

for agg in aggs:
    print(f"{agg.ticker}: O={agg.open} H={agg.high} L={agg.low} C={agg.close} V={agg.volume}")
```

**Raw JSON response:**
```json
{
  "adjusted": true,
  "queryCount": 10532,
  "resultsCount": 10532,
  "status": "OK",
  "results": [
    {
      "T": "AAPL",
      "o": 152.50, "h": 154.20, "l": 151.80, "c": 153.10,
      "v": 65432100, "vw": 152.95,
      "t": 1675209600000, "n": 824271
    }
  ]
}
```

Returns 10,000+ results. Useful for end-of-day market summaries.

### 5. Historical Bars (Aggregates)

Historical OHLCV bars over a date range. Not used for live polling but available for future historical charts.

**REST:** `GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`

**Python client:**
```python
aggs = list(client.list_aggs(
    ticker="AAPL",
    multiplier=1,
    timespan="day",
    from_="2026-01-01",
    to="2026-03-31",
    limit=50000,
))

for a in aggs:
    print(f"Date: {a.timestamp}, O={a.open} H={a.high} L={a.low} C={a.close} V={a.volume}")
```

### 6. Last Trade / Last Quote

Individual endpoints for the most recent trade or NBBO quote. Single-ticker only.

```python
trade = client.get_last_trade(ticker="AAPL")
print(f"Last trade: ${trade.price} x {trade.size}")

quote = client.get_last_quote(ticker="AAPL")
print(f"Bid: ${quote.bid} x {quote.bid_size}")
print(f"Ask: ${quote.ask} x {quote.ask_size}")
```

## Endpoint Summary

| Use Case | Endpoint | Batch? | Notes |
|----------|----------|--------|-------|
| Live prices (multiple tickers) | `GET /v2/snapshot/.../tickers?tickers=X,Y` | Yes | Primary polling endpoint |
| Single ticker detail | `GET /v2/snapshot/.../tickers/{ticker}` | No | Same schema |
| Previous close | `GET /v2/aggs/ticker/{ticker}/prev` | No | One ticker at a time |
| All stocks EOD for a date | `GET /v2/aggs/grouped/.../stocks/{date}` | Yes (all) | 10K+ results |
| Historical bars | `GET /v2/aggs/ticker/{ticker}/range/...` | No | Configurable timespan |
| Last trade | `GET /v2/last/trade/{ticker}` | No | Most recent trade |
| Last quote (NBBO) | `GET /v2/last/nbbo/{ticker}` | No | Most recent bid/ask |

## How FinAlly Uses the API

The `MassiveDataSource` (in `backend/app/market/massive_client.py`) runs as a background task:

1. Collects all tickers from the active watchlist
2. Calls `get_snapshot_all()` with those tickers (one API call per poll)
3. Extracts `last_trade.price` and `last_trade.timestamp` from each snapshot
4. Writes to the shared in-memory `PriceCache`
5. Sleeps for the poll interval (15s on free tier), then repeats

The synchronous Massive client is run in a thread via `asyncio.to_thread()` to avoid blocking the event loop.

```python
import asyncio
from massive import RESTClient
from massive.rest.models import SnapshotMarketType

async def poll_massive(api_key: str, get_tickers, price_cache, interval: float = 15.0):
    """Poll Massive API and update the price cache."""
    client = RESTClient(api_key=api_key)

    while True:
        tickers = get_tickers()
        if tickers:
            snapshots = await asyncio.to_thread(
                client.get_snapshot_all,
                market_type=SnapshotMarketType.STOCKS,
                tickers=tickers,
            )
            for snap in snapshots:
                price_cache.update(
                    ticker=snap.ticker,
                    price=snap.last_trade.price,
                    timestamp=snap.last_trade.timestamp / 1000,  # ms -> seconds
                )

        await asyncio.sleep(interval)
```

## Error Handling

The `massive` client raises exceptions for HTTP errors:

| Status | Meaning |
|--------|---------|
| 401 | Invalid API key |
| 403 | Insufficient permissions (plan doesn't include the endpoint) |
| 429 | Rate limit exceeded (free tier: 5 req/min) |
| 5xx | Server error (client retries automatically, 3 attempts by default) |

## Ticker Validation

In Massive mode, ticker validation is done by attempting to fetch a snapshot. If the API returns no data for a ticker, it is rejected. This confirms the ticker is a real, tradeable symbol on the Massive platform.
