/**
 * Data formatting and display utilities
 * 
 * This module provides comprehensive formatting functions for:
 * 1. Price formatting with configurable decimal places
 * 2. Currency formatting with proper symbols and precision
 * 3. Percentage formatting for profit/loss display
 * 4. Volume formatting with appropriate units
 * 5. Timestamp formatting for human-readable display
 * 6. Visual separators and formatting helpers
 * 
 * All formatting functions respect configuration settings and
 * provide consistent output across the system.
 */

import config from "../config/config.js";
import chalk from "chalk";

/**
 * Format a price value with appropriate decimal places
 * 
 * Formats price values according to configuration settings.
 * Ensures consistent precision across all price displays.
 * 
 * @param {number} price - Price value to format
 * @returns {string} Formatted price string
 */
export function formatPrice(price) {
    if (price == null || isNaN(price)) {
        return 'n/a';
    }

    // Use configured decimal places for price formatting
    const decimalPlaces = config.display.decimalPlaces.price;
    return price.toFixed(decimalPlaces);
}

/**
 * Format a percentage value with appropriate decimal places
 * 
 * Formats percentage values for profit/loss display.
 * Adds % symbol and ensures consistent precision.
 * 
 * @param {number} percentage - Percentage value to format
 * @returns {string} Formatted percentage string with % symbol
 */
export function formatPercentage(percentage) {
    if (percentage == null || isNaN(percentage)) {
        return 'n/a%';
    }

    // Use configured decimal places for percentage formatting
    const decimalPlaces = config.display.decimalPlaces.percentage;
    return `${percentage.toFixed(decimalPlaces)}%`;
}

/**
 * Format and colorize a percentage based on sign
 * - Positive: green
 * - Negative: red
 * - Zero/NaN: yellow/n-a
 */
export function formatPercentageColored(percentage) {
    if (percentage == null || isNaN(percentage)) {
        return chalk.yellow('n/a%');
    }
    const formatted = formatPercentage(percentage);
    if (percentage > 0) return chalk.green(formatted);
    if (percentage < 0) return chalk.red(formatted);
    return chalk.yellow(formatted);
}

/**
 * Format a currency value with appropriate decimal places
 * 
 * Formats USD currency values with proper symbol and precision.
 * Ensures consistent display across all financial data.
 * 
 * @param {number} amount - Currency amount to format
 * @returns {string} Formatted currency string with $ symbol
 */
export function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) {
        return '$n/a';
    }

    // Ensure amount is a number
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
        return '$n/a';
    }

    // Use configured decimal places for currency formatting
    const decimalPlaces = config.display.decimalPlaces.currency;
    return `$${numericAmount.toFixed(decimalPlaces)}`;
}

/**
 * Format and colorize a currency amount based on sign
 * - Positive: green with plus sign
 * - Negative: red
 * - Zero: gray
 */
export function formatCurrencyColored(amount) {
    if (amount == null || isNaN(amount)) {
        return chalk.yellow('$n/a');
    }
    const value = Number(amount);
    const base = formatCurrency(Math.abs(value));
    if (value > 0) return chalk.green(`+${base}`);
    if (value < 0) return chalk.red(`-${base}`);
    return chalk.gray(base);
}

/**
 * Format a volume value with appropriate decimal places
 * 
 * Formats trading volume values for display.
 * Ensures consistent precision across volume displays.
 * 
 * @param {number} volume - Volume value to format
 * @returns {string} Formatted volume string
 */
export function formatVolume(volume) {
    if (volume == null || isNaN(volume)) {
        return 'n/a';
    }

    // Ensure volume is a number
    const numericVolume = Number(volume);
    if (isNaN(numericVolume)) {
        return 'n/a';
    }

    // Use configured decimal places for volume formatting
    const decimalPlaces = config.display.decimalPlaces.volume;
    return numericVolume.toFixed(decimalPlaces);
}

/**
 * Format a timestamp for human-readable display
 * 
 * Converts ISO timestamp strings to localized, readable format.
 * Provides consistent time display across the system.
 * 
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted timestamp string
 */
export function formatTimestamp(timestamp) {
    if (!timestamp) {
        return 'n/a';
    }

    try {
        const date = new Date(timestamp);
        return date.toLocaleString();
    } catch (error) {
        return 'Invalid timestamp';
    }
}

/**
 * Create a visual separator line for console output
 * 
 * Generates consistent separator lines for better readability
 * in console output. Length is configurable.
 * 
 * @param {number} length - Length of separator line (default from config)
 * @param {string} character - Character to use for separator (default: '=')
 * @returns {string} Separator line string
 */
export function createSeparator(length = config.display.separatorLength, character = '=') {
    return chalk.gray(character.repeat(length));
}

/**
 * Create a colored label like [STATUS]
 */
export function label(text, color = 'cyan') {
    const fn = chalk[color] || chalk.cyan;
    return fn.bold(`[${text}]`);
}

/**
 * Colorize exchange names consistently
 */
export function colorExchange(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('mexc')) return chalk.blueBright(name);
    if (n.includes('lbank')) return chalk.magentaBright(name);
    return chalk.cyan(name);
}

/**
 * Dim helper
 */
export function dim(text) {
    return chalk.dim(text);
}

/**
 * Bold helper
 */
export function bold(text) {
    return chalk.bold(text);
}

/**
 * Format a number with appropriate precision based on its magnitude
 * 
 * Automatically adjusts decimal places based on the number's size.
 * Small numbers get more precision, large numbers get less.
 * 
 * @param {number} value - Number to format
 * @param {number} maxDecimals - Maximum decimal places to show
 * @returns {string} Formatted number string
 */
export function formatSmartNumber(value, maxDecimals = 6) {
    if (value == null || isNaN(value)) {
        return 'n/a';
    }

    // Determine appropriate decimal places based on magnitude
    let decimalPlaces = maxDecimals;

    if (Math.abs(value) >= 1000) {
        decimalPlaces = Math.min(maxDecimals, 2);
    } else if (Math.abs(value) >= 100) {
        decimalPlaces = Math.min(maxDecimals, 3);
    } else if (Math.abs(value) >= 10) {
        decimalPlaces = Math.min(maxDecimals, 4);
    } else if (Math.abs(value) >= 1) {
        decimalPlaces = Math.min(maxDecimals, 5);
    }

    return value.toFixed(decimalPlaces);
}

/**
 * Format a large number with appropriate units (K, M, B)
 * 
 * Converts large numbers to human-readable format with units.
 * Useful for displaying large volumes or amounts.
 * 
 * @param {number} value - Number to format
 * @returns {string} Formatted number with appropriate unit
 */
export function formatLargeNumber(value) {
    if (value == null || isNaN(value)) {
        return 'n/a';
    }

    const absValue = Math.abs(value);

    if (absValue >= 1e9) {
        return `${(value / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
        return `${(value / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
        return `${(value / 1e3).toFixed(2)}K`;
    } else {
        return value.toFixed(2);
    }
}

/**
 * Format a duration in milliseconds to human-readable format
 * 
 * Converts millisecond durations to readable time format.
 * Shows appropriate units based on duration length.
 * 
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(milliseconds) {
    if (milliseconds == null || isNaN(milliseconds)) {
        return 'n/a';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Format a file size in bytes to human-readable format
 * 
 * Converts byte sizes to appropriate units (KB, MB, GB).
 * Useful for log file size display and monitoring.
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size string
 */
export function formatFileSize(bytes) {
    if (bytes == null || isNaN(bytes)) {
        return 'n/a';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format a trade status with appropriate emoji and color
 * 
 * Creates visually appealing trade status displays.
 * Uses emojis and formatting for quick visual recognition.
 * 
 * @param {string} status - Trade status string
 * @returns {string} Formatted status with emoji
 */
export function formatTradeStatus(status) {
    if (!status) return 'Unknown';

    const statusMap = {
        'OPENING': '🔓 Opening',
        'OPEN': '🟢 Open',
        'CLOSING': '🔒 Closing',
        'CLOSED': '🔴 Closed',
        'CANCELLED': '❌ Cancelled',
        'ERROR': '⚠️ Error'
    };

    return statusMap[status] || status;
}

/**
 * Format a profit/loss value with appropriate color and symbol
 * 
 * Creates visually distinct profit/loss displays.
 * Uses emojis and formatting to indicate positive/negative values.
 * 
 * @param {number} value - Profit/loss value
 * @returns {string} Formatted P&L string with emoji
 */
export function formatProfitLoss(value) {
    if (value == null || isNaN(value)) {
        return '💰 n/a';
    }

    if (value > 0) {
        return `📈 +${formatCurrency(value)}`;
    } else if (value < 0) {
        return `📉 ${formatCurrency(value)}`;
    } else {
        return `➖ ${formatCurrency(value)}`;
    }
}