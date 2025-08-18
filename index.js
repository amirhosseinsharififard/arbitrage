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

import { printBidAskPairs } from "./src/Arbitrage Logic/prices.js";
import config from "./src/Arbitrage Logic/config/config.js";
import { retryWrapper } from "./src/Arbitrage Logic/error/errorBoundary.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import exitHandler from "./src/Arbitrage Logic/system/exitHandler.js";
import { getTradingStatus, restoreOpenPositionsFromLog } from "./src/Arbitrage Logic/arbitrage_bot/arbitrage.js";
import statistics from "./src/Arbitrage Logic/monitoring/statistics.js";
import logger from "./src/Arbitrage Logic/logging/logger.js";
import { FormattingUtils } from "./src/Arbitrage Logic/utils/index.js";
import "./src/Arbitrage Logic/utils/performanceOptimizer.js";
import { lbankPriceService, kcexPuppeteerService } from "./src/Arbitrage Logic/services/index.js";

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

        // Restore open positions from trades.log file
        restoreOpenPositionsFromLog();

        // Performance monitoring is initialized by side-effect import

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

        // Initialize LBank price service (for LBank data) - only if enabled
        if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
            await lbankPriceService.initialize();
        }

        // Initialize KCEX Puppeteer service (for KCEX data)
        if (config.kcex.enabled) {
            await kcexPuppeteerService.initialize();

            // Register KCEX service cleanup with exit handler
            exitHandler.addExitHandler(async() => {
                await kcexPuppeteerService.cleanup();
            });
        }

        // Initialize exchange instances for trading (MEXC and LBank)
        await exchangeManager.initialize();
        const exchanges = exchangeManager.getAllExchanges();

        // Display system startup information
        // Build list of enabled exchanges
        const enabledExchanges = [];
        if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) enabledExchanges.push('MEXC');
        if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) enabledExchanges.push('LBank');
        if (config.xt.enabled) enabledExchanges.push('XT');
        if (config.kcex.enabled) enabledExchanges.push('KCEX');

        console.log("🚀 Arbitrage system started!");
        console.log(`⏱️  Check interval: ${intervalMs}ms`);
        console.log(`💵 Trade volume: $${config.tradeVolumeUSD}`);
        console.log(`📊 Profit threshold: ${config.profitThresholdPercent}%`);
        console.log(`🔒 Close threshold: ${config.closeThresholdPercent}%`);
        console.log(`🌐 Exchanges: ${enabledExchanges.join(' + ')}`);
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

                // Removed iteration log to reduce console spam

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