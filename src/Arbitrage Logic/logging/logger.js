/**
 * Centralized Logger for the arbitrage trading system
 * 
 * This module provides comprehensive logging capabilities including:
 * 1. Trade logging with structured JSON format
 * 2. Session summary generation and persistence
 * 3. Request/response logging for debugging
 * 4. Log file management and cleanup
 * 5. Configurable logging levels and actions
 * 
 * All logs are written in JSON format for easy parsing and analysis.
 */

import fs from "fs/promises";
import config from "../config/config.js";

/**
 * Main Logger class that handles all logging operations
 * 
 * Features:
 * - Structured JSON logging for trades
 * - Session summary generation
 * - Request/response logging
 * - Configurable log file management
 * - Automatic cleanup and rotation
 */
class Logger {
    /**
     * Initialize the logger with configuration
     * 
     * @param {boolean} clearOnStartup - Whether to clear log files when starting
     */
    constructor(clearOnStartup = config.logSettings.clearOnStartup) {
        // Configure log file paths
        this.logFile = config.logSettings.logFile; // Main trade log file
        this.summaryFile = config.logSettings.summaryFile; // Session summary file
        this.requestLogFile = config.logSettings.requestLogFile; // Network request log file

        // Clear files on startup if requested
        if (clearOnStartup) {
            this.clearLogFiles();
        }
    }

    /**
     * Clear all log files on startup based on configuration
     * 
     * This method respects the preserve flags in config:
     * - preserveLogs: Whether to keep trade logs between sessions
     * - preserveSummary: Whether to keep summary files between sessions
     * - requestLogFile: Always maintained for debugging purposes
     */
    async clearLogFiles() {
        try {
            // Clear main trade log if not preserving
            if (!config.logSettings.preserveLogs) {
                await fs.writeFile(this.logFile, '', 'utf-8');
            }

            // Clear session summary if not preserving
            if (!config.logSettings.preserveSummary) {
                await fs.writeFile(this.summaryFile, '', 'utf-8');
            }

            // Always maintain a separate request log file for debugging
            if (this.requestLogFile) {
                try {
                    await fs.access(this.requestLogFile);
                } catch {
                    await fs.writeFile(this.requestLogFile, '', 'utf-8');
                }
            }

            // Log the cleanup operation if detailed logging is enabled
            if (config.logSettings.enableDetailedLogging) {
                console.log(`🧹 Log files cleared on startup`);
            }
        } catch (error) {
            console.error(`❌ Failed to clear log files: ${error.message}`);
        }
    }

    /**
     * Log a trade action to the trades.log file
     * 
     * This is the primary logging method for all trading activities.
     * Each log entry contains:
     * - Action type (ARBITRAGE_OPEN, ARBITRAGE_CLOSE)
     * - Trading symbol and timestamp
     * - Complete trade details and metadata
     * - Structured in JSON format for easy parsing
     * 
     * @param {string} action - Trade action type (e.g., "ARBITRAGE_OPEN", "ARBITRAGE_CLOSE")
     * @param {string} symbol - Trading symbol (e.g., "DEBT/USDT:USDT")
     * @param {object} data - Complete trade data object to log
     */
    async logTrade(action, symbol, data) {
        try {
            // Check if this action should be logged based on configuration
            const shouldLog = this.shouldLogAction(action);
            if (!shouldLog) {
                return; // Skip logging for excluded actions
            }

            // Create log entry with standard fields
            const logEntry = {
                action, // Action type
                symbol, // Trading symbol
                timestamp: new Date().toISOString(), // ISO timestamp
                ...data // All additional trade data
            };

            // Convert to JSON and append to log file
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine);

            // Optional console logging for debugging
            if (config.logSettings.enableDetailedLogging) {
                // console.log(`📝 Logged ${action} trade for ${symbol}`);
            }
        } catch (error) {
            console.error(`❌ Failed to log trade: ${error.message}`);
        }
    }

    /**
     * Check if an action should be logged based on configuration
     * 
     * Logging behavior is controlled by:
     * - loggableActions: Array of actions that should be logged
     * - excludeActions: Array of actions that should be excluded
     * - Default behavior: log everything if no filters are set
     * 
     * @param {string} action - Action to check for logging
     * @returns {boolean} Whether the action should be logged
     */
    shouldLogAction(action) {
        // If loggableActions is defined, only log those specific actions
        if (config.logSettings.loggableActions && config.logSettings.loggableActions.length > 0) {
            return config.logSettings.loggableActions.includes(action);
        }

        // If excludeActions is defined, don't log those actions
        if (config.logSettings.excludeActions && config.logSettings.excludeActions.length > 0) {
            return !config.logSettings.excludeActions.includes(action);
        }

        // Default behavior: log everything if no filters are configured
        return true;
    }

    /**
     * Log a detailed backtest entry (never deletes or rotates)
     * 
     * Backtest logs are preserved indefinitely for analysis and comparison.
     * They contain comprehensive data about simulated trading scenarios.
     * 
     * @param {object} data - Detailed backtest data to log
     */
    async logBacktest(data) {
        try {
            const entry = {
                action: 'BACKTEST',
                timestamp: new Date().toISOString(),
                ...data
            };
            const line = JSON.stringify(entry) + '\n';
            await fs.appendFile(this.logFile, line);
        } catch (error) {
            if (config.logSettings.enableDetailedLogging) {
                console.error(`❌ Failed to log backtest: ${error.message}`);
            }
        }
    }

    /**
     * Read and parse trade logs from the log file
     * 
     * This method reads the log file, parses each line as JSON,
     * and returns an array of parsed log entries. Invalid JSON lines
     * are automatically skipped.
     * 
     * @param {number} limit - Maximum number of lines to read (null = all lines)
     * @returns {Array} Array of parsed log entries
     */
    async readTradeLogs(limit = null) {
        try {
            // Read the entire log file content
            const logContent = await fs.readFile(this.logFile, "utf-8");
            const lines = logContent.trim().split('\n').filter(line => line.trim());

            // Parse each line as JSON
            const parsedLines = [];
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    parsedLines.push(logEntry);
                } catch (parseError) {
                    // Skip invalid JSON lines (corrupted entries)
                    continue;
                }
            }

            // Apply limit if specified
            if (limit) {
                return parsedLines.slice(-limit);
            }
            return parsedLines;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            throw error;
        }
    }

    /**
     * Get recent trade logs for display and analysis
     * 
     * @param {number} count - Number of recent trades to retrieve
     * @returns {Array} Array of recent trade entries
     */
    async getRecentTrades(count = config.logSettings.maxRecentTrades) {
        return await this.readTradeLogs(count);
    }

    /**
     * Write summary to session_summary.txt file
     * 
     * Session summaries are comprehensive reports that include:
     * - Trading statistics and performance metrics
     * - Profit/loss analysis
     * - Volume and fee information
     * - Best and worst trades
     * 
     * @param {object} summary - Summary object to write to file
     */
    async writeSummaryToFile(summary) {
        try {
            const formattedSummary = this.formatSummary(summary);

            // Always append to session summary, don't overwrite previous summaries
            // This preserves historical session data for analysis
            let prefix = '';
            try {
                await fs.access(this.summaryFile);
                prefix = '';
            } catch {
                prefix = '';
            }
            await fs.appendFile(this.summaryFile, formattedSummary, 'utf-8');

            if (config.logSettings.enableDetailedLogging) {
                console.log(`💾 Summary written to ${this.summaryFile}`);
            }
        } catch (error) {
            console.error(`❌ Failed to write summary: ${error.message}`);
        }
    }

    /**
     * Append summary to trades.log for comprehensive logging
     * 
     * This method adds session summaries to the main trade log
     * so all trading-related information is in one place.
     * 
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
     * Append a simple footer with last exit timestamp to the summary file
     * 
     * This provides a quick reference for when the system last ran
     * and helps track system uptime and session frequency.
     * 
     * @param {string} isoTimestamp - ISO timestamp string
     */
    async appendLastExitFooter(isoTimestamp) {
        try {
            const footer = `\nLast Exit: ${new Date(isoTimestamp).toLocaleString()}\n`;
            await fs.appendFile(this.summaryFile, footer, 'utf-8');
        } catch (error) {
            if (config.logSettings.enableDetailedLogging) {
                console.error(`❌ Failed to append last exit footer: ${error.message}`);
            }
        }
    }

    /**
     * Append a captured network request/response entry
     * 
     * Request logging is useful for debugging API issues,
     * monitoring exchange communication, and analyzing performance.
     * 
     * @param {object} entry - Request/response data to log
     */
    async logRequest(entry) {
        try {
            if (!this.requestLogFile) return;

            const line = JSON.stringify({
                type: 'REQUEST',
                timestamp: new Date().toISOString(),
                ...entry
            }) + '\n';
            await fs.appendFile(this.requestLogFile, line);
        } catch (error) {
            if (config.logSettings.enableDetailedLogging) {
                console.error(`❌ Failed to log request: ${error.message}`);
            }
        }
    }

    /**
     * Log error with developer contact information
     * 
     * This method logs errors with developer contact details
     * for quick support and troubleshooting.
     * 
     * @param {string} errorType - Type of error (e.g., "API_ERROR", "SYSTEM_ERROR")
     * @param {string} message - Error message
     * @param {object} details - Additional error details
     * @param {string} severity - Error severity (ERROR, WARNING, CRITICAL)
     */
    async logErrorWithContact(errorType, message, details = {}, severity = 'ERROR') {
        try {
            const errorEntry = {
                type: 'ERROR',
                errorType,
                message,
                details,
                severity,
                timestamp: new Date().toISOString(),
                developerContact: {
                    name: 'Amir Sharifi',
                    phone: '+98 917 238 4087',
                    note: 'Contact developer for technical support'
                }
            };

            // Log to main log file
            const logLine = JSON.stringify(errorEntry) + '\n';
            await fs.appendFile(this.logFile, logLine);

            // Log to request log file for better visibility
            if (this.requestLogFile) {
                await fs.appendFile(this.requestLogFile, logLine);
            }

            // Console output with contact information
            console.error(`\n❌ ${severity}: ${errorType}`);
            console.error(`📝 ${message}`);
            if (Object.keys(details).length > 0) {
                console.error(`🔍 Details:`, details);
            }
            console.error(`\n📞 Contact developer for technical support:`);
            console.error(`👤 Amir Sharifi`);
            console.error(`📱 +98 917 238 4087`);
            console.error(`💬 ${errorEntry.developerContact.note}\n`);

        } catch (error) {
            console.error(`❌ Failed to log error: ${error.message}`);
        }
    }

    /**
     * Get developer contact information
     * 
     * @returns {object} Developer contact details
     */
    getDeveloperContact() {
        return {
            name: 'Amir Sharifi',
            phone: '+98 917 238 4087',
            email: 'developer@arbitrage-bot.com',
            note: 'Contact developer for technical support'
        };
    }

    /**
     * Format summary for human-readable output
     * 
     * Converts summary data into a formatted string with:
     * - Clear section headers
     * - Organized statistics display
     * - Visual separators for readability
     * - Emoji indicators for quick visual scanning
     * 
     * @param {object} summary - Summary object to format
     * @returns {string} Formatted summary string
     */
    formatSummary(summary) {
        const stats = summary.sessionStats;

        return `\n\n📊 ARBITRAGE SESSION SUMMARY
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
     * 
     * This method provides optional log rotation functionality.
     * By default, logs are preserved indefinitely to maintain
     * complete trading history and enable backtesting analysis.
     * 
     * @param {number} maxAgeDays - Maximum age of logs in days
     */
    async cleanupOldLogs(maxAgeDays = 30) {
        try {
            const stats = await fs.stat(this.logFile);
            const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

            // Never auto-delete logs; only log a notice if very old
            // This preserves backtests and trading history
            if (ageInDays > maxAgeDays && config.logSettings.enableDetailedLogging) {
                console.log(`ℹ️ Log file is ${ageInDays.toFixed(1)} days old (preserved by config).`);
            }
        } catch (error) {
            // Ignore cleanup errors to prevent system disruption
        }
    }
}

// Create singleton instance for use throughout the system
const logger = new Logger();

export default logger;
export { Logger };