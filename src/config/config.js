const config = {
    // Trading symbols for each exchange
    symbols: {
        mexc: "DEBT/USDT:USDT",
        lbank: "DEBT/USDT:USDT",
    },

    // Timing and intervals
    intervalMs: 500,
    statusUpdateInterval: 10, // Display status every N iterations
    retryDelayMs: 5000, // Delay before retrying after error

    // Trading thresholds and limits
    profitThresholdPercent: 2, // Percentage threshold for opening a trade
    closeThresholdPercent: 1, // Percentage threshold for closing a trade
    tradeVolumeUSD: 100, // Dollar volume for each trade
    maxTrades: 0, // Maximum number of trades (0 = unlimited)
    maxLossPercent: -1000, // Stop-loss disabled (effectively never triggers)

    // Exchange fees
    feesPercent: {
        mexc: 0.04,
        lbank: 0.05,
    },

    // Exchange configuration
    exchanges: {
        mexc: {
            id: "mexc",
            options: { defaultType: "future" },
            retryAttempts: 3,
            retryDelay: 1000
        },
        lbank: {
            id: "lbank",
            options: { defaultType: "future" },
            retryAttempts: 3,
            retryDelay: 1000
        }
    },

    // Logging and monitoring
    logSettings: {
        maxRecentTrades: 10, // Number of recent trades to display
        summaryUpdateInterval: 10, // How often to update summary
        enableDetailedLogging: true,
        logFile: "trades.log",
        summaryFile: "session_summary.txt",
        // New flags for persistence and console behavior
        clearOnStartup: false,
        preserveLogs: true,
        preserveSummary: true,
        printSummaryToConsole: false,
        printStatusToConsole: false,
        requestLogFile: "requests.log"
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
    activeScenario: 'amir', // 'amir' or 'alireza'
    scenarios: {
        amir: {
            // Open if either direction meets threshold (uses profitThresholdPercent)
            enabled: true
        },
        alireza: {
            // Open only if MEXC(ask)->LBANK(bid) is greater than the opposite
            openThresholdPercent: 0.5,
            // Close when LBANK(ask)->MEXC(bid) reaches this percent
            closeAtPercent: 1
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