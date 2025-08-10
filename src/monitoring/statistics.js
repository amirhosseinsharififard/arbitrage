import logger from "../logging/logger.js";
import config from "../config/config.js";
import { FormattingUtils } from "../utils/index.js";

/**
 * Statistics and monitoring module for the arbitrage system
 */
class Statistics {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = config.cache.statisticsTimeout;

        // Session data - tracks current session only
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

        // Reset session data on startup
        this.resetSessionData();
    }

    /**
     * Reset session data to start fresh
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
     */
    recordTradeClose(tradeData) {
        const profit = parseFloat(tradeData.actualProfitUSD);
        const volume = parseFloat(tradeData.volume);

        this.sessionData.totalTrades++;
        this.sessionData.totalProfit += profit;
        this.sessionData.totalVolume += volume;
        this.sessionData.openPositions--;
        this.sessionData.currentInvestment -= volume * parseFloat(tradeData.buyPriceOpen);

        // Calculate fees if available
        if (tradeData.feesPercent && tradeData.volume && tradeData.buyPriceOpen) {
            const fees = parseFloat(tradeData.feesPercent) * volume * parseFloat(tradeData.buyPriceOpen) / 100;
            this.sessionData.totalFees += fees;
        }

        // Track profitable/losing trades
        if (profit > 0) {
            this.sessionData.profitableTrades++;
            if (profit > this.sessionData.bestTrade.profit) {
                this.sessionData.bestTrade = { profit, tradeNumber: this.sessionData.totalTrades };
            }
        } else if (profit < 0) {
            this.sessionData.losingTrades++;
        }

        // Track worst trade
        if (this.sessionData.totalTrades === 1 || profit < this.sessionData.worstTrade.profit) {
            this.sessionData.worstTrade = { profit, tradeNumber: this.sessionData.totalTrades };
        }

        if (config.logSettings.enableDetailedLogging) {
            console.log(`📉 Trade closed - P&L: $${profit.toFixed(2)}, Total: $${this.sessionData.totalProfit.toFixed(2)}`);
        }
    }

    /**
     * Get current session statistics
     */
    getCurrentSessionStats() {
        const winRate = this.sessionData.totalTrades > 0 ?
            (this.sessionData.profitableTrades / this.sessionData.totalTrades) * 100 : 0;
        const avgProfit = this.sessionData.totalTrades > 0 ?
            this.sessionData.totalProfit / this.sessionData.totalTrades : 0;

        return {
            totalTrades: this.sessionData.totalTrades,
            profitableTrades: this.sessionData.profitableTrades,
            losingTrades: this.sessionData.losingTrades,
            winRate: winRate.toFixed(2),
            totalProfit: this.sessionData.totalProfit.toFixed(2),
            avgProfit: avgProfit.toFixed(2),
            totalVolume: this.sessionData.totalVolume.toFixed(6),
            totalFeesUSD: this.sessionData.totalFees.toFixed(2),
            openPositions: this.sessionData.openPositions,
            currentInvestment: this.sessionData.currentInvestment.toFixed(2),
            bestTrade: {
                profit: this.sessionData.bestTrade.profit.toFixed(2),
                tradeNumber: this.sessionData.bestTrade.tradeNumber
            },
            worstTrade: {
                profit: this.sessionData.worstTrade.profit.toFixed(2),
                tradeNumber: this.sessionData.worstTrade.tradeNumber
            }
        };
    }

    /**
     * Calculate comprehensive profit/loss summary for current session only
     * @returns {object} Summary statistics
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
     * @returns {object} Basic statistics
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
     * Display complete system status
     * @param {object} tradingStatus - Current trading status
     */
    displayFullStatus(tradingStatus) {
        const currentStats = this.getCurrentSessionStats();

        console.log("\n" + FormattingUtils.createSeparator(80));
        console.log("🚀 Complete Arbitrage System Status");
        console.log(FormattingUtils.createSeparator(80));
        console.log(`🔒 Open Position: ${tradingStatus.isAnyPositionOpen ? '✅ Yes' : '❌ No'}`);
        console.log(`💰 Total P&L: ${FormattingUtils.formatCurrency(tradingStatus.totalProfit)}`);
        console.log(`📈 Total Trades: ${currentStats.totalTrades}`);
        console.log(`📊 Last Trade P&L: ${FormattingUtils.formatCurrency(tradingStatus.lastTradeProfit)}`);
        console.log(`🔍 Open Positions Count: ${currentStats.openPositions}`);
        console.log(`💵 Current Investment: ${FormattingUtils.formatCurrency(currentStats.currentInvestment)}`);

        if (currentStats.totalTrades > 0) {
            const avgProfit = parseFloat(currentStats.avgProfit);
            console.log(`📊 Average P&L per trade: ${FormattingUtils.formatCurrency(avgProfit)}`);

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
     * Display recent trade logs
     * @param {number} limit - Number of recent trades to display
     */
    async displayTradeLogs(limit = config.logSettings.maxRecentTrades) {
        try {
            const recentTrades = await logger.getRecentTrades(limit);

            if (recentTrades.length === 0) {
                console.log("📋 No trades found in log.");
                return;
            }

            console.log(`\n📋 Last ${recentTrades.length} trades:`);
            console.log(FormattingUtils.createSeparator(80, '-'));

            for (const logEntry of recentTrades) {
                const timestamp = FormattingUtils.formatTimestamp(logEntry.timestamp);
                const action = logEntry.action === 'OPEN' ? '🔓 Opening' : '🔒 Closing';
                const symbol = logEntry.symbol;

                if (logEntry.action === 'OPEN') {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    console.log(`   Buy: ${logEntry.buyExchangeId} @ ${FormattingUtils.formatPrice(logEntry.buyPrice)}`);
                    console.log(`   Sell: ${logEntry.sellExchangeId} @ ${FormattingUtils.formatPrice(logEntry.sellPrice)}`);
                    console.log(`   Difference: ${logEntry.diffPercent}%`);
                } else {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    console.log(`   Net P&L: ${logEntry.netProfitPercent}% | ${FormattingUtils.formatCurrency(logEntry.actualProfitUSD)}`);
                    console.log(`   Total P&L: ${FormattingUtils.formatCurrency(logEntry.totalProfitUSD)}`);
                }
                console.log("");
            }
        } catch (error) {
            console.error(`❌ Error displaying trade logs: ${error.message}`);
        }
    }

    /**
     * Display session summary
     */
    async displaySessionSummary() {
        try {
            const summary = await this.generateProfitLossSummary();

            if (summary) {
                console.log("\n📊 SESSION SUMMARY");
                console.log(FormattingUtils.createSeparator(60));
                console.log(`🕐 Session End: ${FormattingUtils.formatTimestamp(summary.timestamp)}`);
                console.log(`📈 Total Trades: ${summary.sessionStats.totalTrades}`);
                console.log(`✅ Profitable: ${summary.sessionStats.profitableTrades} | ❌ Losing: ${summary.sessionStats.losingTrades}`);
                console.log(`🎯 Win Rate: ${summary.sessionStats.winRate}%`);
                console.log(`💰 Total P&L: ${FormattingUtils.formatCurrency(summary.sessionStats.totalProfit)}`);
                console.log(`📊 Average P&L: ${FormattingUtils.formatCurrency(summary.sessionStats.avgProfit)}`);
                console.log(`🔍 Open Positions: ${summary.sessionStats.openPositions}`);
                console.log(`💵 Current Investment: ${FormattingUtils.formatCurrency(summary.sessionStats.currentInvestment)}`);
                console.log(`📈 Best Trade: ${FormattingUtils.formatCurrency(summary.sessionStats.bestTrade.profit)} (Trade #${summary.sessionStats.bestTrade.tradeNumber})`);
                console.log(`📉 Worst Trade: ${FormattingUtils.formatCurrency(summary.sessionStats.worstTrade.profit)} (Trade #${summary.sessionStats.worstTrade.tradeNumber})`);
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
     * @param {string} key - Cache key
     * @returns {object|null} Cached data or null if expired
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
     * @param {string} key - Cache key
     * @param {object} data - Data to cache
     */
    setCachedStats(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

// Create singleton instance
const statistics = new Statistics();

export default statistics;
export { Statistics };