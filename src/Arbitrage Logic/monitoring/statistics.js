/**
 * Statistics and monitoring module for the arbitrage trading system
 * 
 * This module provides comprehensive tracking and analysis of:
 * 1. Trading performance metrics (P&L, win rate, trade counts)
 * 2. Session-based statistics and historical data
 * 3. Position monitoring and investment tracking
 * 4. Performance caching for efficiency
 * 5. Detailed reporting and display functions
 * 
 * All statistics are session-based and reset on system startup.
 */

import logger from "../logging/logger.js";
import config from "../config/config.js";
import { FormattingUtils } from "../utils/index.js";

/**
 * Main Statistics class for tracking trading performance
 * 
 * Features:
 * - Session-based data collection
 * - Real-time P&L calculation
 * - Win rate and trade analysis
 * - Performance caching with timeouts
 * - Comprehensive reporting capabilities
 */
class Statistics {
    /**
     * Initialize the statistics module
     * 
     * Sets up caching, session data structures, and resets
     * all counters to start fresh for each trading session.
     */
    constructor() {
        // Performance cache for frequently accessed data
        this.cache = new Map();
        this.cacheTimeout = config.cache.statisticsTimeout;

        // Session data - tracks current session only
        // All data is reset when the system starts
        this.sessionData = {
            totalTrades: 0, // Total number of completed trades
            profitableTrades: 0, // Number of profitable trades
            losingTrades: 0, // Number of losing trades
            totalProfit: 0, // Cumulative profit/loss in USD
            totalVolume: 0, // Total volume traded across all trades
            totalFees: 0, // Total fees paid across all trades
            bestTrade: { profit: -Infinity, tradeNumber: 0 }, // Best performing trade
            worstTrade: { profit: 0, tradeNumber: 0 }, // Worst performing trade
            openPositions: 0, // Current number of open positions
            currentInvestment: 0 // Total amount currently invested
        };

        // Reset session data on startup
        this.resetSessionData();
    }

    /**
     * Reset session data to start fresh
     * 
     * Called on system startup to ensure clean statistics
     * for each trading session. Preserves historical data
     * in log files while starting fresh counters.
     */
    resetSessionData() {
        this.sessionData = {
            totalTrades: 0,
            profitableTrades: 0,
            losingTrades: 0,
            totalProfit: 0,
            totalVolume: 0,
            totalFees: 0,
            bestTrade: { profit: -Infinity, tradeNumber: 0 },
            worstTrade: { profit: 0, tradeNumber: 0 },
            openPositions: 0,
            currentInvestment: 0
        };

        if (config.logSettings.enableDetailedLogging) {
            console.log(`🔄 Session data reset`);
        }
    }

    /**
     * Record a trade opening (increases investment and open positions)
     * 
     * Called when a new arbitrage position is opened to track:
     * - Investment amount
     * - Open position count
     * - Volume traded
     * 
     * @param {object} tradeData - Trade opening data
     * @param {number} tradeData.volume - Trade volume in asset units
     * @param {number} tradeData.buyPrice - Price at which asset was bought
     */
    recordTradeOpen(tradeData) {
        this.sessionData.openPositions++;
        this.sessionData.currentInvestment += parseFloat(tradeData.volume) * parseFloat(tradeData.buyPrice);

        if (config.logSettings.enableDetailedLogging) {
            console.log(`📈 Trade opened - Investment: $${this.sessionData.currentInvestment.toFixed(2)}`);
        }
    }

    /**
     * Record a trade closing (calculates profit/loss and updates statistics)
     * 
     * Called when an arbitrage position is closed to:
     * - Calculate actual profit/loss
     * - Update trade counts and win rate
     * - Track best/worst trades
     * - Update investment and position counts
     * 
     * @param {object} tradeData - Trade closing data
     * @param {number} tradeData.actualProfitUSD - Actual profit/loss in USD
     * @param {number} tradeData.volume - Trade volume in asset units
     * @param {number} tradeData.buyPriceOpen - Price at which position was opened
     * @param {number} tradeData.feesPercent - Total fees as percentage
     */
    recordTradeClose(tradeData) {
        const profit = parseFloat(tradeData.actualProfitUSD);
        const volume = parseFloat(tradeData.volume);

        // Update basic trade statistics
        this.sessionData.totalTrades++;
        this.sessionData.totalProfit += profit;
        this.sessionData.totalVolume += volume;
        this.sessionData.openPositions--;
        this.sessionData.currentInvestment -= volume * parseFloat(tradeData.buyPriceOpen);

        // Calculate and track fees if available
        if (tradeData.feesPercent && tradeData.volume && tradeData.buyPriceOpen) {
            const fees = parseFloat(tradeData.feesPercent) * volume * parseFloat(tradeData.buyPriceOpen) / 100;
            this.sessionData.totalFees += fees;
        }

        // Track profitable vs losing trades for win rate calculation
        if (profit > 0) {
            this.sessionData.profitableTrades++;
            // Update best trade if this one is more profitable
            if (profit > this.sessionData.bestTrade.profit) {
                this.sessionData.bestTrade = { profit, tradeNumber: this.sessionData.totalTrades };
            }
        } else if (profit < 0) {
            this.sessionData.losingTrades++;
        }

        // Track worst trade for risk analysis
        if (this.sessionData.totalTrades === 1 || profit < this.sessionData.worstTrade.profit) {
            this.sessionData.worstTrade = { profit, tradeNumber: this.sessionData.totalTrades };
        }

        // Log trade closing for monitoring
        if (config.logSettings.enableDetailedLogging) {
            console.log(`📉 Trade closed - P&L: $${profit.toFixed(2)}, Total: $${this.sessionData.totalProfit.toFixed(2)}`);
        }
    }

    /**
     * Get current session statistics for display and analysis
     * 
     * Calculates derived metrics like win rate and average profit
     * from the raw session data. Returns formatted values for
     * easy display and comparison.
     * 
     * @returns {object} Current session statistics including:
     *   - totalTrades: Number of completed trades
     *   - profitableTrades: Number of profitable trades
     *   - losingTrades: Number of losing trades
     *   - winRate: Percentage of profitable trades
     *   - totalProfit: Cumulative P&L in USD
     *   - avgProfit: Average P&L per trade
     *   - totalVolume: Total volume traded
     *   - totalFeesUSD: Total fees paid in USD
     *   - openPositions: Current open position count
     *   - currentInvestment: Current investment amount
     *   - bestTrade: Best trade details
     *   - worstTrade: Worst trade details
     */
    getCurrentSessionStats() {
        // Ensure sessionData exists
        if (!this.sessionData) {
            this.resetSessionData();
        }

        // Calculate win rate percentage
        const winRate = this.sessionData.totalTrades > 0 ?
            (this.sessionData.profitableTrades / this.sessionData.totalTrades) * 100 : 0;

        // Calculate average profit per trade
        const avgProfit = this.sessionData.totalTrades > 0 ?
            this.sessionData.totalProfit / this.sessionData.totalTrades : 0;

        return {
            totalTrades: this.sessionData.totalTrades,
            profitableTrades: this.sessionData.profitableTrades,
            losingTrades: this.sessionData.losingTrades,
            winRate: Number(winRate).toFixed(2),
            totalProfit: Number(this.sessionData.totalProfit).toFixed(2),
            avgProfit: Number(avgProfit).toFixed(2),
            totalVolume: Number(this.sessionData.totalVolume).toFixed(6),
            totalFeesUSD: Number(this.sessionData.totalFees).toFixed(2),
            openPositions: this.sessionData.openPositions,
            currentInvestment: Number(this.sessionData.currentInvestment).toFixed(2),
            bestTrade: {
                profit: Number(this.sessionData.bestTrade.profit).toFixed(2),
                tradeNumber: this.sessionData.bestTrade.tradeNumber
            },
            worstTrade: {
                profit: Number(this.sessionData.worstTrade.profit).toFixed(2),
                tradeNumber: this.sessionData.worstTrade.tradeNumber
            }
        };
    }

    /**
     * Calculate comprehensive profit/loss summary for current session only
     * 
     * Creates a summary object suitable for logging and display.
     * Includes all session statistics and is timestamped for
     * historical tracking.
     * 
     * @returns {object} Summary object with session statistics and metadata
     */
    async generateProfitLossSummary() {
        try {
            const currentStats = this.getCurrentSessionStats();

            const summary = {
                action: "SESSION_SUMMARY",
                timestamp: new Date().toISOString(),
                sessionStats: currentStats
            };

            return summary;
        } catch (error) {
            console.error(`❌ Error generating summary: ${error.message}`);
            return null;
        }
    }

    /**
     * Calculate basic trading statistics for current session only
     * 
     * Returns a simplified statistics object with essential metrics
     * for quick analysis and monitoring. Used by other modules
     * that need basic performance data.
     * 
     * @returns {object} Basic trading statistics
     */
    async calculateBasicStatistics() {
        try {
            const currentStats = this.getCurrentSessionStats();

            return {
                totalProfit: parseFloat(currentStats.totalProfit),
                profitableTrades: currentStats.profitableTrades,
                losingTrades: currentStats.losingTrades,
                totalVolume: parseFloat(currentStats.totalVolume),
                totalTrades: currentStats.totalTrades,
                openPositions: currentStats.openPositions,
                currentInvestment: parseFloat(currentStats.currentInvestment)
            };
        } catch (error) {
            console.error(`❌ Error calculating statistics: ${error.message}`);
            return null;
        }
    }

    /**
     * Display complete system status in console
     * 
     * Provides a comprehensive overview of the current trading
     * system status including P&L, trade counts, and performance
     * indicators. Uses visual formatting for easy reading.
     * 
     * @param {object} tradingStatus - Current trading status from arbitrage module
     */
    displayFullStatus(tradingStatus) {
        const currentStats = this.getCurrentSessionStats();

        // Create visual separator and header
        console.log("\n" + FormattingUtils.createSeparator(80));
        console.log("🚀 Complete Arbitrage System Status");
        console.log(FormattingUtils.createSeparator(80));

        // Display core status information
        console.log(`🔒 Open Position: ${tradingStatus.isAnyPositionOpen ? '✅ Yes' : '❌ No'}`);
        console.log(`💰 Total P&L: ${FormattingUtils.formatCurrency(tradingStatus.totalProfit)}`);
        console.log(`📈 Total Trades: ${currentStats.totalTrades}`);
        console.log(`📊 Last Trade P&L: ${FormattingUtils.formatCurrency(tradingStatus.lastTradeProfit)}`);
        console.log(`🔍 Open Positions Count: ${currentStats.openPositions}`);
        console.log(`💵 Current Investment: ${FormattingUtils.formatCurrency(currentStats.currentInvestment)}`);

        // Display performance analysis if trades exist
        if (currentStats.totalTrades > 0) {
            const avgProfit = parseFloat(currentStats.avgProfit);
            console.log(`📊 Average P&L per trade: ${FormattingUtils.formatCurrency(avgProfit)}`);

            // Show system profitability status
            if (parseFloat(currentStats.totalProfit) > 0) {
                console.log(`✅ System is profitable`);
            } else if (parseFloat(currentStats.totalProfit) < 0) {
                console.log(`⚠️  System is at loss`);
            } else {
                console.log(`➖ System is at break-even`);
            }
        }

        console.log(FormattingUtils.createSeparator(80));
    }

    /**
     * Display recent trade logs for monitoring and analysis
     * 
     * Reads the trade log file and displays the most recent
     * trades in a formatted, human-readable format. Shows
     * key information like prices, P&L, and timestamps.
     * 
     * @param {number} limit - Number of recent trades to display
     */
    async displayTradeLogs(limit = config.logSettings.maxRecentTrades) {
        try {
            const recentTrades = await logger.getRecentTrades(limit);

            if (recentTrades.length === 0) {
                console.log("📋 No trades found in log.");
                return;
            }

            // Display header and separator
            console.log(`\n📋 Last ${recentTrades.length} trades:`);
            console.log(FormattingUtils.createSeparator(80, '-'));

            // Process each trade entry
            for (const logEntry of recentTrades) {
                const timestamp = FormattingUtils.formatTimestamp(logEntry.timestamp);

                // Determine action type and format display
                const action = logEntry.action === 'ARBITRAGE_OPEN' ? '🔓 Opening' :
                    (logEntry.action === 'ARBITRAGE_CLOSE' ? '🔒 Closing' : logEntry.action);
                const symbol = logEntry.symbol;

                // Display different information based on action type
                if (logEntry.action === 'ARBITRAGE_OPEN') {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    console.log(`   Buy: ${logEntry.buyExchangeId} @ ${FormattingUtils.formatPrice(logEntry.buyPrice)}`);
                    console.log(`   Sell: ${logEntry.sellExchangeId} @ ${FormattingUtils.formatPrice(logEntry.sellPrice)}`);
                    console.log(`   Difference: ${logEntry.diffPercent}%`);
                } else {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    // Only show P&L if available (for close actions)
                    if (logEntry.netProfitPercent) {
                        console.log(`   Net P&L: ${logEntry.netProfitPercent}% | ${FormattingUtils.formatCurrency(logEntry.actualProfitUSD)}`);
                    }
                }
                console.log("");
            }
        } catch (error) {
            console.error(`❌ Error displaying trade logs: ${error.message}`);
        }
    }

    /**
     * Display comprehensive session summary
     * 
     * Shows a detailed breakdown of the current trading session
     * including all statistics, performance metrics, and analysis.
     * Uses formatted output with clear sections and visual indicators.
     */
    async displaySessionSummary() {
        try {
            const summary = await this.generateProfitLossSummary();

            if (summary) {
                // Display session summary header
                console.log("\n📊 SESSION SUMMARY");
                console.log(FormattingUtils.createSeparator(60));

                // Display session metadata
                console.log(`🕐 Session End: ${FormattingUtils.formatTimestamp(summary.timestamp)}`);
                console.log(`📈 Total Trades: ${summary.sessionStats.totalTrades}`);
                console.log(`✅ Profitable: ${summary.sessionStats.profitableTrades} | ❌ Losing: ${summary.sessionStats.losingTrades}`);
                console.log(`🎯 Win Rate: ${summary.sessionStats.winRate}%`);

                // Display P&L information
                console.log(`💰 Total P&L: ${FormattingUtils.formatCurrency(summary.sessionStats.totalProfit)}`);
                console.log(`📊 Average P&L: ${FormattingUtils.formatCurrency(summary.sessionStats.avgProfit)}`);

                // Display position and investment information
                console.log(`🔍 Open Positions: ${summary.sessionStats.openPositions}`);
                console.log(`💵 Current Investment: ${FormattingUtils.formatCurrency(summary.sessionStats.currentInvestment)}`);

                // Display best and worst trades
                console.log(`📈 Best Trade: ${FormattingUtils.formatCurrency(summary.sessionStats.bestTrade.profit)} (Trade #${summary.sessionStats.bestTrade.tradeNumber})`);
                console.log(`📉 Worst Trade: ${FormattingUtils.formatCurrency(summary.sessionStats.worstTrade.profit)} (Trade #${summary.sessionStats.worstTrade.tradeNumber})`);

                // Display volume and fee information
                console.log(`📊 Total Volume: ${summary.sessionStats.totalVolume}`);
                console.log(`💸 Total Fees: ${FormattingUtils.formatCurrency(summary.sessionStats.totalFeesUSD)}`);
                console.log(FormattingUtils.createSeparator(60));
            } else {
                console.log("⚠️  No session summary available");
            }
        } catch (error) {
            console.error(`❌ Error displaying session summary: ${error.message}`);
        }
    }

    /**
     * Get cached statistics (with timeout)
     * 
     * Provides performance optimization by caching frequently
     * accessed statistics. Cache entries expire after a
     * configurable timeout to ensure data freshness.
     * 
     * @param {string} key - Cache key for the statistics
     * @returns {object|null} Cached data or null if expired/not found
     */
    getCachedStats(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set cached statistics
     * 
     * Stores statistics data in cache with current timestamp
     * for timeout-based expiration management.
     * 
     * @param {string} key - Cache key for the statistics
     * @param {object} data - Statistics data to cache
     */
    setCachedStats(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear the statistics cache
     * 
     * Removes all cached statistics to free memory and
     * ensure fresh data on next access. Useful for
     * debugging or when cache corruption is suspected.
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create singleton instance for use throughout the system
const statistics = new Statistics();

export default statistics;
export { Statistics };