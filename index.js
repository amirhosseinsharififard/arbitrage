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

import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";
import { retryWrapper } from "./src/error/errorBoundory.js";
import exchangeManager from "./src/exchanges/exchangeManager.js";
import exitHandler from "./src/system/exitHandler.js";
import { getTradingStatus } from "./src/arbitrage_bot/arbitrage.js";
import statistics from "./src/monitoring/statistics.js";
import logger from "./src/logging/logger.js";
import { FormattingUtils } from "./src/utils/index.js";
import performanceOptimizer from "./src/utils/performanceOptimizer.js";

/**
 * Initialize the system on startup
 * 
 * Performs essential startup tasks:
 * - Clears log files based on configuration
 * - Resets session statistics for fresh start
 * - Prepares system for trading operations
 * 
 * @throws {Error} If system initialization fails
 */
async function initializeSystem() {
    try {
        console.log("🚀 Initializing arbitrage system...");

        // Clear log files based on persistence configuration
        // Respects preserve flags: do not clear logs/summaries if preserve flags are true
        await logger.clearLogFiles();

        // Reset session statistics to start fresh
        statistics.resetSessionData();

        // Start performance optimization
        performanceOptimizer.startOptimization();

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
 */
function displayTradingStatus() {
    // Get current trading status from arbitrage module
    const status = getTradingStatus();

    // Display basic status information
    console.log(`P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)}`);

    // Display detailed status if configured
    if (config.logSettings.printStatusToConsole) {
        statistics.displayFullStatus(status);
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
async function startLoop(
    symbols = config.symbols,
    intervalMs = config.intervalMs
) {
    try {
        // Initialize the system components
        await initializeSystem();

        // Initialize exchange instances for trading
        await exchangeManager.initialize();
        const exchanges = exchangeManager.getAllExchanges();

        // Display system startup information
        console.log("🚀 Arbitrage system started!");
        console.log(`⏱️  Check interval: ${intervalMs}ms`);
        console.log(`💵 Trade volume: $${config.tradeVolumeUSD}`);
        console.log(`📊 Profit threshold: ${config.profitThresholdPercent}%`);
        console.log(`🔒 Close threshold: ${config.closeThresholdPercent}%`);
        console.log("=".repeat(60));

        // Initialize loop control variables
        let iterationCount = 0;
        const statusUpdateInterval = config.statusUpdateInterval;

        // Main trading loop - runs until shutdown is requested
        while (!exitHandler.isExitingNow()) {
            try {
                iterationCount++;

                // Display overall status every N iterations for monitoring
                if (iterationCount % statusUpdateInterval === 0) {
                    displayTradingStatus();
                }

                // Always display current iteration for monitoring
                if (config.logSettings.printStatusToConsole) {
                    console.log(`🔄 Iteration ${iterationCount} - ${new Date().toLocaleTimeString()}`);
                }

                // Process prices and execute arbitrage logic
                // This is the core function that handles all trading decisions
                await printBidAskPairs(symbols, exchanges);

            } catch (error) {
                // Handle errors in the main loop gracefully
                console.error(`❌ Error in main loop: ${error.message || error}`);
                console.log(`⏳ Waiting ${config.retryDelayMs / 1000} seconds before retrying...`);

                // Wait before retrying to avoid rapid error loops
                await new Promise((r) => setTimeout(r, config.retryDelayMs));
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