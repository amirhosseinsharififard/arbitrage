// Main index file for the src directory
// Provides easy access to all modules

// Core modules
export { default as config }
from './config/config.js';

// Exchange management
export { default as exchangeManager, ExchangeManager }
from './exchanges/exchangeManager.js';

// Logging
export { default as logger, Logger }
from './logging/logger.js';

// Monitoring and statistics
export { default as statistics, Statistics }
from './monitoring/statistics.js';

// Arbitrage logic
export { default as arbitrageLogic, ArbitrageLogic }
from './arbitrage/arbitrageLogic.js';

// System management
export { default as exitHandler, ExitHandler }
from './system/exitHandler.js';

// Arbitrage bot
export {
    tryOpenPosition,
    tryClosePosition,
    openPositions,
    tradingState,
    getTradingStatus
}
from './arbitrage_bot/arbitrage.js';

// New utility classes
export { CalculationUtils, FormattingUtils, ValidationUtils }
from './utils/index.js';

// New services
export { ourbitPriceService, OurbitPriceService }
from './services/index.js';

// Error handling
export { retryWrapper }
from './error/errorBoundary.js';

// Prices and market data
export { printBidAskPairs, getPrice }
from './prices.js';