import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";
import { retryWrapper } from "./src/error/errorBoundory.js";
import exchangeManager from "./src/exchanges/exchangeManager.js";
import exitHandler from "./src/system/exitHandler.js";
import { getTradingStatus } from "./src/arbitrage_bot/arbitrage.js";
import statistics from "./src/monitoring/statistics.js";
import logger from "./src/logging/logger.js";
import { FormattingUtils } from "./src/utils/index.js";

/**
 * Initialize the system on startup
 */
async function initializeSystem() {
    try {
        console.log("🚀 Initializing arbitrage system...");

        // Respect persistence flags: do not clear logs/summaries if preserve flags are true (default true)
        await logger.clearLogFiles();

        // Reset session statistics
        statistics.resetSessionData();

        console.log("✅ System initialization completed!");
    } catch (error) {
        console.error(`❌ System initialization failed: ${error.message}`);
        throw error;
    }
}

/**
 * Displays the overall trading system status
 */
function displayTradingStatus() {
    const status = getTradingStatus();
    const amirPnL = 0; // placeholder aggregate until we track per-scenario P&L
    const alirezaPnL = 0;
    console.log(`P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)} | amir:${FormattingUtils.formatCurrency(amirPnL)} | alireza:${FormattingUtils.formatCurrency(alirezaPnL)} |`);
    if (config.logSettings.printStatusToConsole) {
        statistics.displayFullStatus(status);
    }
}

/**
 * Main arbitrage loop that continuously monitors prices and executes trades
 * @param {object} symbols - Trading symbols for each exchange
 * @param {number} intervalMs - Interval between price checks in milliseconds
 */
async function startLoop(
    symbols = config.symbols,
    intervalMs = config.intervalMs
) {
    try {
        // Initialize the system
        await initializeSystem();

        // Initialize exchange instances
        await exchangeManager.initialize();
        const exchanges = exchangeManager.getAllExchanges();

        // Display system startup information
        console.log("🚀 Arbitrage system started!");
        console.log(`⏱️  Check interval: ${intervalMs}ms`);
        console.log(`💵 Trade volume: $${config.tradeVolumeUSD}`);
        console.log(`📊 Profit threshold: ${config.profitThresholdPercent}%`);
        console.log(`🔒 Close threshold: ${config.closeThresholdPercent}%`);
        console.log("=".repeat(60));

        let iterationCount = 0;
        const statusUpdateInterval = config.statusUpdateInterval;

        // Main trading loop
        while (!exitHandler.isExitingNow()) {
            try {
                iterationCount++;

                // Display overall status every N iterations for monitoring
                if (iterationCount % statusUpdateInterval === 0) {
                    displayTradingStatus();
                }

                // Process prices and execute arbitrage logic
                await printBidAskPairs(symbols, exchanges);
            } catch (error) {
                console.error(`❌ Error in main loop: ${error.message || error}`);
                console.log(`⏳ Waiting ${config.retryDelayMs / 1000} seconds before retrying...`);
                await new Promise((r) => setTimeout(r, config.retryDelayMs));
                continue;
            }

            // Wait for next iteration
            await new Promise((r) => setTimeout(r, intervalMs));
        }
    } catch (error) {
        console.error(`❌ Failed to start arbitrage system: ${error.message}`);
        await exitHandler.forceExit();
    }
}

// Start the arbitrage system
startLoop();