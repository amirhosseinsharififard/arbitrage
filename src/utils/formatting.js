import config from "../config/config.js";

/**
 * Formatting utilities for consistent display across the application
 */
export class FormattingUtils {
    /**
     * Format currency amount with proper decimal places
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency string
     */
    static formatCurrency(amount, currency = 'USD') {
        if (amount == null || isNaN(amount)) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: config.display.decimalPlaces.currency,
            maximumFractionDigits: config.display.decimalPlaces.currency
        }).format(amount);
    }

    /**
     * Format percentage with proper decimal places
     * @param {number} value - Percentage value
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage string
     */
    static formatPercentage(value, decimals = null) {
        if (value == null || isNaN(value)) return 'N/A';
        const decimalPlaces = decimals !== null ? decimals : config.display.decimalPlaces.percentage;
        return `${value.toFixed(decimalPlaces)}%`;
    }

    /**
     * Format price with proper decimal places
     * @param {number} price - Price to format
     * @returns {string} Formatted price string
     */
    static formatPrice(price) {
        if (price == null || isNaN(price)) return 'N/A';
        return price.toFixed(config.display.decimalPlaces.price);
    }

    /**
     * Format volume with proper decimal places
     * @param {number} volume - Volume to format
     * @returns {string} Formatted volume string
     */
    static formatVolume(volume) {
        if (volume == null || isNaN(volume)) return 'N/A';
        return volume.toFixed(config.display.decimalPlaces.volume);
    }

    /**
     * Format timestamp to readable string
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted timestamp string
     */
    static formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('en-US');
    }

    /**
     * Calculate time difference between two timestamps
     * @param {string|Date} startTime - Start time
     * @param {string|Date} endTime - End time
     * @returns {string} Formatted time difference
     */
    static calculateTimeDifference(startTime, endTime) {
        if (!startTime || !endTime) return 'N/A';
        const diff = new Date(endTime) - new Date(startTime);
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Create separator line with specified length
     * @param {number} length - Length of separator
     * @param {string} character - Character to use for separator
     * @returns {string} Separator string
     */
    static createSeparator(length = null, character = '=') {
        const separatorLength = length || config.display.separatorLength;
        return character.repeat(separatorLength);
    }

    /**
     * Format trade information for display
     * @param {object} trade - Trade object
     * @returns {string} Formatted trade string
     */
    static formatTradeInfo(trade) {
        if (!trade) return 'N/A';
        return `${trade.symbol} | ${trade.action} | ${this.formatCurrency(trade.profit)}`;
    }

    /**
     * Format profit/loss information for display
     * @param {object} profitData - Profit data object
     * @returns {string} Formatted profit string
     */
    static formatProfitInfo(profitData) {
        if (!profitData) return 'N/A';
        return `Profit: ${this.formatPercentage(profitData.percentage)} | ${this.formatCurrency(profitData.amount)}`;
    }
}

export default FormattingUtils;