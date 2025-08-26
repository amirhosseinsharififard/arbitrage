/**
 * Main entry point for the arbitrage trading system
 * 
 * This file orchestrates the entire system lifecycle including:
 * 1. System initialization and startup
 * 2. Exchange connection establishment
 * 3. Main trading loop execution
 * 4. Status monitoring and display
 * 5. Error handling and graceful shutdown
 * 
 * The system runs continuously, monitoring prices and executing
 * arbitrage trades based on configured thresholds and strategies.
 */

import { processAllCurrencies, setWebInterface } from "./src/Arbitrage Logic/core/multiCurrencyManager.js";
import { getAvailableCurrencies } from "./src/Arbitrage Logic/config/multiCurrencyConfig.js";
import { retryWrapper } from "./src/Arbitrage Logic/error/errorBoundary.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import exitHandler from "./src/Arbitrage Logic/system/exitHandler.js";
import { getTradingStatus, restoreOpenPositionsFromLog } from "./src/Arbitrage Logic/arbitrage_bot/arbitrage.js";
import statistics from "./src/Arbitrage Logic/monitoring/statistics.js";
import logger from "./src/Arbitrage Logic/logging/logger.js";
import { FormattingUtils } from "./src/Arbitrage Logic/utils/index.js";
import "./src/Arbitrage Logic/utils/performanceOptimizer.js";
import { lbankPriceService, kcexPuppeteerService } from "./src/Arbitrage Logic/services/index.js";
import WebInterface from "./web_interface.js";
import dataUpdateManager from "./src/Arbitrage Logic/utils/dataUpdateManager.js";
import githubAuth from "./src/utils/githubAuth.js";
import chalk from "chalk";

// Global web interface instance
let webInterface = null;
let performanceMonitor = null;

/**
 * Initialize the system on startup
 * 
 * Performs essential startup tasks:
 * - Clears log files based on configuration
 * - Resets session statistics for fresh start
 * - Prepares system for trading operations
 * - Starts web interface for real-time monitoring
 * 
 * @throws {Error} If system initialization fails
 */
async function initializeSystem() {
    try {
        console.log("🚀 Initializing arbitrage system...");

        // Step 1: GitHub Authentication Check
        console.log("🔐 Checking GitHub authentication...");
        const authResult = await githubAuth.authenticate();

        if (!authResult) {
            console.error("❌ GitHub authentication failed! Application cannot start.");
            console.error("Please check your GitHub token in config.env file.");
            console.error("📞 Contact developer for technical support:");
            console.error("👤 Amir Sharifi");
            console.error("📱 +98 917 238 4087");
            console.error("💬 Contact developer for technical support");
            process.exit(1);
        }

        // Step 2: Continue with system initialization
        console.log("✅ GitHub authentication passed, continuing system initialization...");

        // Clear log files on startup
        await logger.clearLogFiles();

        // Reset session statistics to start fresh
        statistics.resetSessionData();

        // Restore open positions from trades.log file
        restoreOpenPositionsFromLog();

        // Initialize performance monitoring
        const performanceModule = await
        import ("./src/Arbitrage Logic/utils/performanceOptimizer.js");
        performanceMonitor = new performanceModule.PerformanceMonitor();

        // Set performance monitor in data update manager
        dataUpdateManager.setPerformanceMonitor(performanceMonitor);

        // Initialize and start web interface
        webInterface = new WebInterface();
        await webInterface.start();

        // Set web interface reference in multi-currency manager for data broadcasting
        setWebInterface(webInterface);

        // Register web interface cleanup with exit handler
        exitHandler.addExitHandler(async() => {
            if (webInterface) {
                webInterface.stop();
            }
            if (performanceMonitor) {
                performanceMonitor.stopMonitoring();
            }
        });

        console.log("✅ System initialization completed!");
    } catch (error) {
        console.error(`❌ System initialization failed: ${error.message}`);
        throw error;
    }
}

/**
 * Displays the overall trading system status
 * 
 * Shows current P&L, trade counts, and investment information
 * for monitoring and debugging purposes. Updates are displayed
 * based on configuration settings.
 * Also updates the web interface with real-time data.
 */
function displayTradingStatus() {
    // Get current trading status from arbitrage module
    const status = getTradingStatus();

    // Display basic status information
    console.log(`P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)}`);

    // Display detailed status
    statistics.displayFullStatus(status);

    // Update web interface with real-time data
    if (webInterface) {
        webInterface.broadcastDataUpdate();
    }
}

/**
 * Main arbitrage loop that continuously monitors prices and executes trades
 * 
 * This is the core loop that:
 * 1. Runs continuously until system shutdown is requested
 * 2. Fetches current prices from all exchanges
 * 3. Analyzes arbitrage opportunities
 * 4. Opens and closes positions based on strategy
 * 5. Displays status updates and monitoring information
 * 6. Handles errors gracefully with retry logic
 * 
 * The loop runs at the configured interval (default: 100ms) to ensure
 * timely response to market opportunities.
 * 
 * @param {object} symbols - Trading symbols for each exchange
 * @param {number} intervalMs - Interval between price checks in milliseconds
 */
async function startLoop(intervalMs = 50) {
    try {
        // Initialize the system components
        await initializeSystem();

        // Initialize LBank price service
        await lbankPriceService.initialize();

        // Initialize KCEX Puppeteer service
        await kcexPuppeteerService.initialize();

        // Register service cleanup with exit handler
        exitHandler.addExitHandler(async() => {
            await kcexPuppeteerService.cleanup();
        });

        // Initialize exchange instances for trading (MEXC and LBank)
        await exchangeManager.initialize();
        const exchanges = exchangeManager.getAllExchanges();

        // Display system startup information
        const availableCurrencies = getAvailableCurrencies();

        console.log("🚀 Multi-Currency Arbitrage System Started!");
        console.log(`⏱️  Check interval: ${intervalMs}ms`);
        console.log(`💰 Currencies: ${availableCurrencies.join(', ')}`);
        console.log(`🌐 Exchanges: MEXC, LBank, KCEX, DexScreener`);
        console.log("=".repeat(60));

        // Initialize loop control variables
        let iterationCount = 0;
        const statusUpdateInterval = 2000; // Status update every 2 seconds

        // Main trading loop - runs until shutdown is requested
        while (!exitHandler.isExitingNow()) {
            try {
                iterationCount++;

                // Display overall status every N iterations for monitoring
                if (iterationCount % statusUpdateInterval === 0) {
                    displayTradingStatus();
                }

                // Removed iteration log to reduce console spam

                // Process all currencies and execute arbitrage logic
                // This is the core function that handles all trading decisions for multiple currencies
                await processAllCurrencies(exchanges);

            } catch (error) {
                // Handle errors in the main loop gracefully
                console.error(`❌ Error in main loop: ${error.message || error}`);
                console.log(`⏳ Waiting 2 seconds before retrying...`);

                // Wait before retrying to avoid rapid error loops
                await new Promise((r) => setTimeout(r, 2000));
                continue;
            }

            // Wait for next iteration to maintain configured interval
            await new Promise((r) => setTimeout(r, intervalMs));
        }
    } catch (error) {
        // Handle critical system errors
        console.error(`❌ Failed to start arbitrage system: ${error.message}`);
        await exitHandler.forceExit();
    }
}

// Start the arbitrage system when this file is executed
startLoop();