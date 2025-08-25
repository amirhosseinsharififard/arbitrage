/**
 * Main export file for the Arbitrage Logic module
 * 
 * This file provides centralized access to all arbitrage system components
 * including configuration, core logic, utilities, and services.
 */

// Core system components
export { processAllCurrencies, setWebInterface }
from './core/multiCurrencyManager.js';
export { getTradingStatus, restoreOpenPositionsFromLog }
from './arbitrage_bot/arbitrage.js';

// Configuration
export { getCurrencyConfig, getAvailableCurrencies, getEnabledExchanges }
from './config/multiCurrencyConfig.js';

// Utilities
export { calculationManager, FormattingUtils }
from './utils/index.js';

// Services
export { lbankPriceService, kcexPuppeteerService, dexscreenerApiService }
from './services/index.js';

// Error handling
export { retryWrapper }
from './error/errorBoundary.js';

// System components
export { default as exitHandler }
from './system/exitHandler.js';
export { default as exchangeManager }
from './exchanges/exchangeManager.js';
export { default as logger }
from './logging/logger.js';
export { default as statistics }
from './monitoring/statistics.js';