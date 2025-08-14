/**
 * Main configuration file for the arbitrage trading system
 * Contains all trading parameters, exchange settings, logging preferences, and system behavior controls
 */
const config = {
    // Trading symbols configuration for each exchange
    // Both exchanges trade the same symbol to enable arbitrage opportunities
    symbols: {
        mexc: "DEBT/USDT:USDT", // MEXC exchange symbol (futures)
        lbank: "DEBT/USDT:USDT", // LBank exchange symbol (futures)
    },

    // System timing and performance settings
    intervalMs: 50, // Main loop interval in milliseconds (20 checks per second) - Increased speed
    statusUpdateInterval: 2000, // How often to display status updates (every 40 iterations) - Reduced console spam
    retryDelayMs: 2000, // Delay before retrying after errors (2 seconds) - Faster recovery

    // Trading thresholds and risk management
    profitThresholdPercent: 3.1, // Minimum profit percentage to open a new position
    closeThresholdPercent: 2.5, // Profit percentage threshold to close an open position
    tradeVolumeUSD: 200, // Total investment amount across both exchanges ($100 per side)

    // New: Token quantity-based trading configuration
    tradingMode: "TOKEN", // "USD" for dollar-based, "TOKEN" for token quantity-based
    targetTokenQuantity: 5000, // Per-trade token batch size
    maxTokenQuantity: 35000, // Total allowed tokens across open positions

    maxTrades: 0, // Maximum number of trades (0 = unlimited)

    // Exchange fee configuration (percentage of trade value)
    // Set to 0 for testing, adjust based on actual exchange fees
    feesPercent: {
        mexc: 0, // MEXC trading fees (0.04 = 0.04%)
        lbank: 0, // LBank trading fees (0.05 = 0.05%)
    },

    // Exchange initialization and connection settings
    exchanges: {
        mexc: {
            id: "mexc", // Exchange identifier
            options: { defaultType: "future" }, // Use futures trading
            retryAttempts: 10, // Number of connection retry attempts
            retryDelay: 1000 // Delay between retries in milliseconds
        },
        lbank: {
            id: "lbank", // Exchange identifier
            options: { defaultType: "future" }, // Use futures trading
            retryAttempts: 10, // Number of connection retry attempts
            retryDelay: 1000 // Delay between retries in milliseconds
        }
    },

    // Logging and monitoring configuration
    logSettings: {
        maxRecentTrades: 500, // Maximum number of recent trades to display - Reduced memory usage
        summaryUpdateInterval: 20, // How often to update summary statistics - Less frequent updates
        enableDetailedLogging: false, // Enable verbose console output - Reduced console spam
        logFile: "trades.log", // Main trade log file path
        summaryFile: "session_summary.txt", // Session summary file path
        clearOnStartup: true, // Clear log files when system starts
        preserveLogs: false, // Don't preserve logs between sessions
        preserveSummary: false, // Don't preserve summary between sessions
        printSummaryToConsole: true, // Display summary in console
        printStatusToConsole: true, // Display status updates in console
        requestLogFile: "requests.log", // Network request log file
        // Only log actual trade actions, exclude price data and errors
        loggableActions: ["ARBITRAGE_OPEN", "ARBITRAGE_CLOSE"],
        excludeActions: ["PRICE_ORDERBOOK", "PRICE_ERROR", "PRICE_UPDATE"] // Exclude more noise
    },

    // Arbitrage validation and filtering settings
    arbitrage: {
        minDifference: 0.5, // Minimum price difference to consider for arbitrage
        enableVolumeValidation: true, // Validate order book volumes before trading
        enableFeeCalculation: true, // Include fees in profit calculations
        enableThresholdFiltering: false, // Enable profit threshold filtering
        defaultThresholdPercent: 0.5, // Default threshold for profit logging
        useOrderBookVolume: true // Use order book volumes to cap trade size
    },

    // Error handling and system resilience settings
    errorHandling: {
        maxRetries: 3, // Maximum retry attempts for failed operations
        defaultRetryDelay: 1000, // Default delay between retries (1 second)
        enableErrorLogging: true, // Log errors for debugging
        logLevel: "info" // Logging level (debug, info, warn, error)
    },

    // Cache management for performance optimization
    cache: {
        statisticsTimeout: 5000, // Statistics cache timeout (5 seconds)
        priceCacheTimeout: 1000, // Price cache timeout (1 second)
        maxCacheSize: 100 // Maximum number of cached items
    },

    // Display formatting and user interface settings
    display: {
        decimalPlaces: {
            price: 6, // Number of decimal places for price display
            percentage: 3, // Number of decimal places for percentage display
            currency: 2, // Number of decimal places for currency display
            volume: 6 // Number of decimal places for volume display
        },
        enableEmojis: true, // Use emojis in console output
        enableColor: true, // Enable colored console output
        separatorLength: 60 // Length of visual separators
    },

    // Trading strategy configuration
    // Current logic trades only in LBANK(ask)->MEXC(bid) direction
    scenarios: {
        alireza: {
            openThresholdPercent: 3.1, // Minimum profit % to open LBANK->MEXC position
            closeAtPercent: 2.5 // Close when current difference reaches +1%
        }
    },

    // File system paths for logs and exports
    paths: {
        logs: "./", // Directory for log files
        exports: "./exports/", // Directory for exported data
        temp: "./temp/" // Directory for temporary files
    },

    // Performance and resource management settings
    performance: {
        enableBatchProcessing: true, // Enable batch processing for efficiency
        maxConcurrentRequests: 5, // Maximum concurrent API requests
        requestTimeout: 30000, // API request timeout (30 seconds)
        enableCompression: false // Enable response compression
    }
};

export default config;