import config from "../config/config.js";

/**
 * Validation utilities for data validation across the application
 */
export class ValidationUtils {
    /**
     * Validate numeric input with optional range constraints
     * @param {any} value - Value to validate
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {boolean} True if valid
     */
    static validateNumericInput(value, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    }

    /**
     * Validate price data
     * @param {number} price - Price to validate
     * @returns {boolean} True if valid
     */
    static validatePrice(price) {
        return this.validateNumericInput(price, 0);
    }

    /**
     * Validate volume data
     * @param {number} volume - Volume to validate
     * @returns {boolean} True if valid
     */
    static validateVolume(volume) {
        return this.validateNumericInput(volume, 0);
    }

    /**
     * Validate percentage value
     * @param {number} percentage - Percentage to validate
     * @returns {boolean} True if valid
     */
    static validatePercentage(percentage) {
        return this.validateNumericInput(percentage, -100, 1000);
    }

    /**
     * Validate exchange ID
     * @param {string} exchangeId - Exchange ID to validate
     * @returns {boolean} True if valid
     */
    static validateExchangeId(exchangeId) {
        if (!exchangeId || typeof exchangeId !== 'string') return false;
        return Object.keys(config.exchanges).includes(exchangeId);
    }

    /**
     * Validate trading symbol
     * @param {string} symbol - Symbol to validate
     * @returns {boolean} True if valid
     */
    static validateSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return false;
        return Object.values(config.symbols).includes(symbol);
    }

    /**
     * Validate trade parameters before execution
     * @param {object} tradeParams - Trade parameters
     * @returns {object} Validation result
     */
    static validateTradeParameters(tradeParams) {
        const {
            symbol,
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume
        } = tradeParams;

        const errors = [];

        if (!this.validateSymbol(symbol)) errors.push("Invalid symbol");
        if (!this.validateExchangeId(buyExchangeId)) errors.push("Invalid buy exchange ID");
        if (!this.validateExchangeId(sellExchangeId)) errors.push("Invalid sell exchange ID");
        if (!this.validatePrice(buyPrice)) errors.push("Invalid buy price");
        if (!this.validatePrice(sellPrice)) errors.push("Invalid sell price");
        if (!this.validateVolume(volume)) errors.push("Invalid volume");

        if (buyExchangeId === sellExchangeId) {
            errors.push("Buy and sell exchanges must be different");
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            recommendation: isValid ? "EXECUTE" : "SKIP"
        };
    }

    /**
     * Validate arbitrage opportunity
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @param {number} minDifference - Minimum price difference
     * @returns {boolean} True if valid arbitrage opportunity
     */
    static validateArbitrageOpportunity(buyPrice, sellPrice, minDifference = null) {
        if (!this.validatePrice(buyPrice) || !this.validatePrice(sellPrice)) {
            return false;
        }

        const threshold = minDifference !== null ? minDifference : config.arbitrage.minDifference;
        const differencePercent = ((sellPrice - buyPrice) / buyPrice) * 100;

        return differencePercent >= threshold;
    }

    /**
     * Validate configuration object
     * @param {object} configObj - Configuration to validate
     * @returns {object} Validation result
     */
    static validateConfig(configObj) {
        const errors = [];

        // Validate required fields
        if (!configObj.symbols) errors.push("Symbols configuration is required");
        if (!configObj.exchanges) errors.push("Exchanges configuration is required");
        if (!configObj.intervalMs) errors.push("Interval configuration is required");
        if (!configObj.profitThresholdPercent) errors.push("Profit threshold is required");

        // Validate numeric values
        if (!this.validateNumericInput(configObj.intervalMs, 100)) {
            errors.push("Interval must be at least 100ms");
        }
        if (!this.validatePercentage(configObj.profitThresholdPercent)) {
            errors.push("Invalid profit threshold percentage");
        }

        const isValid = errors.length === 0;

        return {
            isValid,
            errors,
            recommendation: isValid ? "VALID" : "INVALID"
        };
    }
}

export default ValidationUtils;