import ccxt from "ccxt";
import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";
import { retryWrapper } from "./src/error/errorBoundory.js";
import { getTradingStatus } from "./src/arbitrage_bot/arbitrage.js";

// Global error handlers for uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Creates and initializes an exchange instance with retry logic
 * @param {string} id - Exchange ID (e.g., 'mexc', 'lbank')
 * @param {object} options - Exchange configuration options
 * @returns {object} Initialized exchange instance
 */
async function createExchange(id, options) {
    const exchange = new ccxt[id](options);
    await retryWrapper(exchange.loadMarkets.bind(exchange), [], 3, 1000);
    return exchange;
}

/**
 * Displays the overall trading system status
 */
function displayTradingStatus() {
    const status = getTradingStatus();
    console.log("\n" + "=".repeat(60));
    console.log("📊 Overall Arbitrage System Status");
    console.log("=".repeat(60));
    console.log(`🔒 Open Position: ${status.isAnyPositionOpen ? '✅ Yes' : '❌ No'}`);
    console.log(`💰 Total P&L: $${status.totalProfit.toFixed(2)}`);
    console.log(`📈 Total Trades: ${status.totalTrades}`);
    console.log(`📊 Last Trade P&L: $${status.lastTradeProfit.toFixed(2)}`);
    console.log(`🔍 Open Positions Count: ${status.openPositionsCount}`);
    console.log("=".repeat(60) + "\n");
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
    // Initialize exchange instances
    const mexc = await createExchange("mexc", {
        options: { defaultType: "future" },
    });
    const lbank = await createExchange("lbank", {
        options: { defaultType: "future" },
    });

    const exchanges = { mexc, lbank };

    // Display system startup information
    console.log("🚀 Arbitrage system started!");
    console.log(`⏱️  Check interval: ${intervalMs}ms`);
    console.log(`💵 Trade volume: $${config.tradeVolumeUSD}`);
    console.log(`📊 Profit threshold: ${config.profitThresholdPercent}%`);
    console.log(`🔒 Close threshold: ${config.closeThresholdPercent}%`);
    console.log("=".repeat(60));

    let iterationCount = 0;
    const statusUpdateInterval = 10; // Display status every 10 iterations

    // Main trading loop
    while (true) {
        try {
            iterationCount++;

            // Display overall status every 10 iterations for monitoring
            if (iterationCount % statusUpdateInterval === 0) {
                displayTradingStatus();
            }

            // Process prices and execute arbitrage logic
            await printBidAskPairs(symbols, exchanges);
        } catch (error) {
            console.error(`❌ Error in main loop: ${error.message || error}`);
            console.log(`⏳ Waiting 5 seconds before retrying...`);
            await new Promise((r) => setTimeout(r, 5000));
            continue;
        }

        // Wait for next iteration
        await new Promise((r) => setTimeout(r, intervalMs));
    }
}

// Start the arbitrage system
startLoop();