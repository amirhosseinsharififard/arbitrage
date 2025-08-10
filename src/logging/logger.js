import fs from "fs/promises";
import config from "../config/config.js";

/**
 * Centralized Logger for the arbitrage system
 */
class Logger {
    constructor(clearOnStartup = true) {
        this.logFile = config.logSettings.logFile;
        this.summaryFile = config.logSettings.summaryFile;

        // Clear files on startup if requested
        if (clearOnStartup) {
            this.clearLogFiles();
        }
    }

    /**
     * Clear all log files on startup
     */
    async clearLogFiles() {
        try {
            // Clear trades.log
            await fs.writeFile(this.logFile, '', 'utf-8');

            // Clear session_summary.txt
            await fs.writeFile(this.summaryFile, '', 'utf-8');

            if (config.logSettings.enableDetailedLogging) {
                console.log(`🧹 Log files cleared on startup`);
            }
        } catch (error) {
            console.error(`❌ Failed to clear log files: ${error.message}`);
        }
    }

    /**
     * Log a trade action to the trades.log file
     * @param {string} action - Trade action (OPEN/CLOSE)
     * @param {string} symbol - Trading symbol
     * @param {object} data - Trade data to log
     */
    async logTrade(action, symbol, data) {
        try {
            const logEntry = {
                action,
                symbol,
                timestamp: new Date().toISOString(),
                ...data
            };

            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine);

            if (config.logSettings.enableDetailedLogging) {
                console.log(`📝 Logged ${action} trade for ${symbol}`);
            }
        } catch (error) {
            console.error(`❌ Failed to log trade: ${error.message}`);
        }
    }

    /**
     * Read and parse trade logs
     * @param {number} limit - Maximum number of lines to read
     * @returns {Array} Array of parsed log entries
     */
    async readTradeLogs(limit = null) {
        try {
            const logContent = await fs.readFile(this.logFile, "utf-8");
            const lines = logContent.trim().split('\n').filter(line => line.trim());

            const parsedLines = [];
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    parsedLines.push(logEntry);
                } catch (parseError) {
                    // Skip invalid JSON lines
                    continue;
                }
            }

            if (limit) {
                return parsedLines.slice(-limit);
            }
            return parsedLines;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get recent trade logs
     * @param {number} count - Number of recent trades to retrieve
     * @returns {Array} Array of recent trade entries
     */
    async getRecentTrades(count = config.logSettings.maxRecentTrades) {
        return await this.readTradeLogs(count);
    }

    /**
     * Write summary to session_summary.txt
     * @param {object} summary - Summary object to write
     */
    async writeSummaryToFile(summary) {
        try {
            const formattedSummary = this.formatSummary(summary);
            await fs.writeFile(this.summaryFile, formattedSummary, 'utf-8');

            if (config.logSettings.enableDetailedLogging) {
                console.log(`💾 Summary written to ${this.summaryFile}`);
            }
        } catch (error) {
            console.error(`❌ Failed to write summary: ${error.message}`);
        }
    }

    /**
     * Append summary to trades.log
     * @param {object} summary - Summary object to append
     */
    async appendSummaryToTradesLog(summary) {
        try {
            const logLine = JSON.stringify(summary) + '\n';
            await fs.appendFile(this.logFile, logLine);

            if (config.logSettings.enableDetailedLogging) {
                console.log(`📝 Summary appended to ${this.logFile}`);
            }
        } catch (error) {
            console.error(`❌ Failed to append summary: ${error.message}`);
        }
    }

    /**
     * Format summary for human-readable output
     * @param {object} summary - Summary object
     * @returns {string} Formatted summary string
     */
    formatSummary(summary) {
        const stats = summary.sessionStats;

        return `📊 ARBITRAGE SESSION SUMMARY
${'='.repeat(60)}
🕐 Session End: ${new Date(summary.timestamp).toLocaleString()}

📈 TRADING STATISTICS:
   • Total Trades: ${stats.totalTrades}
   • Profitable Trades: ${stats.profitableTrades}
   • Losing Trades: ${stats.losingTrades}
   • Win Rate: ${stats.winRate}%
   • Open Positions: ${stats.openPositions}

💰 PROFIT & LOSS:
   • Total P&L: $${stats.totalProfit}
   • Average P&L per Trade: $${stats.avgProfit}
   • Current Investment: $${stats.currentInvestment}
   • Best Trade: $${stats.bestTrade.profit} (Trade #${stats.bestTrade.tradeNumber})
   • Worst Trade: $${stats.worstTrade.profit} (Trade #${stats.worstTrade.tradeNumber})

📊 VOLUME & FEES:
   • Total Volume: ${stats.totalVolume}
   • Total Fees Paid: $${stats.totalFeesUSD}

${'='.repeat(60)}
🎯 Session completed successfully!
`;
    }

    /**
     * Clear old log files (optional cleanup)
     * @param {number} maxAgeDays - Maximum age of logs in days
     */
    async cleanupOldLogs(maxAgeDays = 30) {
        try {
            const stats = await fs.stat(this.logFile);
            const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

            if (ageInDays > maxAgeDays) {
                await fs.writeFile(this.logFile, '');
                console.log(`🧹 Cleared old log file (${ageInDays.toFixed(1)} days old)`);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { Logger };