## Overview

This system is a real-time crypto arbitrage bot that monitors prices across exchanges and opens/closes positions based on configured thresholds.

### Runtime Flow
- Entry: `index.js`
- Initialize: logs, stats, Ourbit/KCEX/XT services, exchange manager (MEXC)
- Loop: fetch prices, compute spreads, open/close positions, display status
- Exit: cleanup services and write summaries

### Key Modules
- `src/arbitrage/prices.js`: Orchestrates price fetching and arbitrage checks
- `src/arbitrage/arbitrage_bot/arbitrage.js`: Position lifecycle and P&L
- `src/arbitrage/exchanges/exchangeManager.js`: CCXT exchange management
- `src/arbitrage/services/ourbitPriceService.js`: Ourbit via Puppeteer
- `src/arbitrage/services/index.js`: Service exports (Ourbit, KCEX, XT)
- `src/arbitrage/utils/*`: Calculations, formatting, spreads, performance
- `src/arbitrage/logging/logger.js`: JSON logs and summaries
- `src/arbitrage/monitoring/statistics.js`: Session stats
- `src/arbitrage/error/errorBoundary.js`: Retry helper

### Performance
- Price change deduplication in `prices.js`
- Lightweight console output with `conciseOutput`
- Caches and batch utilities in `utils/performanceOptimizer.js`

### Logging
- Trades appended to `trades.log`
- Session summaries appended to `session_summary.txt`
- Requests (optional) in `requests.log`

### Configuration
- Centralized in `src/arbitrage/config/config.js`
- Controls symbols, thresholds, fees, logging, and Puppeteer selectors


