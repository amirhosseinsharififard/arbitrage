# Arbitrage Trading Bot

This project performs cross-exchange arbitrage using `ccxt` with detailed trade logging and a single, consistent trading strategy: buy at `LBANK` ask and sell at `MEXC` bid for symbol `DEBT/USDT:USDT`.

## Run

```bash
node index.js
```

## Core Behavior

- One open position at a time
- Opens only when LBANK(ask)->MEXC(bid) profit ≥ `profitThresholdPercent`
- Closes when MEXC(bid) vs LBANK(ask) profit ≤ `scenarios.alireza.closeAtPercent`
- Considers configured fees in P&L calculations
- Writes precise, structured logs for every open/close

## Configuration

Edit `src/config/config.js`:

```javascript
symbols: { mexc: "DEBT/USDT:USDT", lbank: "DEBT/USDT:USDT" }
intervalMs: 100
profitThresholdPercent: 2
closeThresholdPercent: 1
tradeVolumeUSD: 200
feesPercent: { mexc: 0, lbank: 0 }
logSettings.loggableActions: ["ARBITRAGE_OPEN", "ARBITRAGE_CLOSE"]
scenarios.alireza: { openThresholdPercent: 0.5, closeAtPercent: 1.5 }
```

## Detailed Trade Log Format

All entries are newline-delimited JSON in `trades.log`.

### ARBITRAGE_OPEN
```json
{
  "action": "ARBITRAGE_OPEN",
  "symbol": "DEBT/USDT:USDT",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "arbitrageId": "lbank-mexc",
  "buyExchangeId": "lbank",
  "sellExchangeId": "mexc",
  "buyPrice": 1.000100,
  "sellPrice": 1.020200,
  "volume": 100.000000,
  "buyAmount": 100.000000,
  "sellAmount": 100.000000,
  "buyCostUSD": "$100.01",
  "sellProceedsUSD": "$102.02",
  "diffPercent": "2.020%",
  "totalInvestmentUSD": "$202.03",
  "expectedProfitUSD": "$4.08",
  "details": {
    "openTime": "2025-01-01T12:00:00.000Z",
    "orderbookAtOpen": { "buyExchange": "lbank", "sellExchange": "mexc" },
    "profitBreakdown": {
      "grossDiffPercent": "2.020%",
      "feesPercentTotal": "0.000%",
      "netExpectedDiffPercent": "2.020%",
      "estimatedFeesUSD": "$0.00"
    },
    "spreads": { "openDirection": "2.020%", "oppositeDirection": null }
  }
}
```

### ARBITRAGE_CLOSE
```json
{
  "action": "ARBITRAGE_CLOSE",
  "symbol": "DEBT/USDT:USDT",
  "timestamp": "2025-01-01T12:05:00.000Z",
  "arbitrageId": "lbank-mexc",
  "buyExchangeId": "lbank",
  "sellExchangeId": "mexc",
  "originalBuyPrice": 1.000100,
  "originalSellPrice": 1.020200,
  "currentBuyPrice": 1.010000,
  "currentSellPrice": 1.030000,
  "volume": 100.000000,
  "buyAmount": 100.000000,
  "sellAmount": 100.000000,
  "originalDiffPercent": "2.020%",
  "currentDiffPercent": "1.980%",
  "netProfitPercent": "0.040%",
  "actualProfitUSD": "$0.08",
  "totalFees": "0.000%",
  "durationMs": 300000,
  "closeReason": "Target profit reached",
  "tradeNumber": 1,
  "details": { "closeTime": "2025-01-01T12:05:00.000Z" }
}
```

## Files

- `index.js`: main loop and lifecycle
- `src/prices.js`: price fetch and open/close checks
- `src/arbitrage_bot/arbitrage.js`: open/close logic and state
- `src/logging/logger.js`: structured logging
- `src/monitoring/statistics.js`: session stats and display
- `src/exchanges/exchangeManager.js`: ccxt exchange init/helpers

## Notes

- Strategy is single-direction; opposite direction is shown for info only.
- Logs are precise and ready for analytics ingestion.
- Only ARBITRAGE_OPEN/ARBITRAGE_CLOSE actions are persisted in `trades.log`.