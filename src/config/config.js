const config = {
    // Trading symbols for each exchange
    symbols: {
        mexc: "DEBT/USDT:USDT",
        lbank: "DEBT/USDT:USDT",
    },

    // Timing and intervals
    intervalMs: 100,
    statusUpdateInterval: 1000, // Display status every N iterations
    retryDelayMs: 5000, // Delay before retrying after error

    // Trading thresholds and limits
    profitThresholdPercent: 2, // Percentage threshold for opening a trade
    closeThresholdPercent: 1, // Percentage threshold for closing a trade
    tradeVolumeUSD: 200, // Dollar volume for each trade (total investment across both exchanges)
    maxTrades: 0, // Maximum number of trades (0 = unlimited)
    maxLossPercent: -10000, // Stop-loss disabled (effectively never triggers)

    // Exchange fees
    feesPercent: {
        mexc: 0,
        lbank: 0,
    },

    // Exchange configuration
    exchanges: {
        mexc: {
            id: "mexc",
            options: { defaultType: "future" },
            retryAttempts: 10,
            retryDelay: 1000
        },
        lbank: {
            id: "lbank",
            options: { defaultType: "future" },
            retryAttempts: 10,
            retryDelay: 1000
        }
    },

    // Logging and monitoring
    logSettings: {
        maxRecentTrades: 1000, // Number of recent trades to display
        summaryUpdateInterval: 10, // How often to update summary
        enableDetailedLogging: true,
        logFile: "trades.log",
        summaryFile: "session_summary.txt",
        // New flags for persistence and console behavior
        clearOnStartup: true, // Clear logs on startup
        preserveLogs: false, // Don't preserve logs between sessions
        preserveSummary: false, // Don't preserve summary between sessions
        printSummaryToConsole: true,
        printStatusToConsole: true,
        requestLogFile: "requests.log",
        // Control what actions get logged to trades.log
        loggableActions: ["OPEN", "CLOSE", "TRADE", "ARBITRAGE"], // Only log actual trade actions
        excludeActions: ["PRICE_ORDERBOOK", "PRICE_ERROR"] // Explicitly exclude price data logging
    },

    // Arbitrage validation
    arbitrage: {
        minDifference: 0.5, // Minimum price difference to consider
        enableVolumeValidation: true,
        enableFeeCalculation: true,
        enableThresholdFiltering: false, // Enable profit threshold filtering
        defaultThresholdPercent: 0.5, // Default threshold for profit logging
        // Use order book top-of-book volumes to cap trade volume
        useOrderBookVolume: true
    },

    // Error handling and retry settings
    errorHandling: {
        maxRetries: 3,
        defaultRetryDelay: 1000,
        enableErrorLogging: true,
        logLevel: "info" // debug, info, warn, error
    },

    // Cache settings
    cache: {
        statisticsTimeout: 5000, // 5 seconds cache for statistics
        priceCacheTimeout: 1000, // 1 second cache for prices
        maxCacheSize: 100
    },

    // Display and formatting
    display: {
        decimalPlaces: {
            price: 6,
            percentage: 3,
            currency: 2,
            volume: 6
        },
        enableEmojis: true,
        enableColor: true,
        separatorLength: 60
    },

    // Scenario control
    activeScenario: 'alireza', // 'amir' or 'alireza'
    scenarios: {
        amir: {
            // Open if either direction meets threshold (uses profitThresholdPercent)
            enabled: false
        },
        alireza: {
            // Open only if MEXC(ask)->LBANK(bid) is greater than the opposite
            openThresholdPercent: 0.5,
            // Close when lbankBidVsMexcAskPct reaches this percent
            closeAtPercent: 1.5
        }
    },

    // File paths
    paths: {
        logs: "./",
        exports: "./exports/",
        temp: "./temp/"
    },

    // Performance settings
    performance: {
        enableBatchProcessing: true,
        maxConcurrentRequests: 5,
        requestTimeout: 30000,
        enableCompression: false
    }
};

export default config;