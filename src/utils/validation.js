/**
 * Input validation and sanitization utilities
 * 
 * This module provides comprehensive validation functions for:
 * 1. Trading parameter validation (prices, volumes, percentages)
 * 2. Exchange configuration validation
 * 3. Symbol and asset validation
 * 4. Configuration file validation
 * 5. Data type and format validation
 * 
 * All validation functions provide descriptive error messages
 * and ensure data integrity throughout the system.
 */

import config from "../config/config.js";

/**
 * Validate trading symbol format
 * 
 * Ensures trading symbols follow the expected format:
 * - Must be a string
 * - Must contain a forward slash separator
 * - Must have valid base and quote currencies
 * 
 * @param {string} symbol - Trading symbol to validate
 * @returns {boolean} True if symbol is valid
 */
export function validateTradingSymbol(symbol) {
    if (typeof symbol !== 'string') {
        return false;
    }

    // Check if symbol contains the required separator
    if (!symbol.includes('/')) {
        return false;
    }

    // Split symbol into base and quote currencies
    const parts = symbol.split('/');
    if (parts.length !== 2) {
        return false;
    }

    const [base, quote] = parts;

    // Check if both parts are non-empty
    if (!base || !quote) {
        return false;
    }

    // Check if currencies contain only valid characters
    const validChars = /^[A-Z0-9:]+$/;
    if (!validChars.test(base) || !validChars.test(quote)) {
        return false;
    }

    return true;
}

/**
 * Validate price values
 * 
 * Ensures price values are valid for trading operations:
 * - Must be a positive number
 * - Must be finite (not NaN or Infinity)
 * - Must be within reasonable bounds
 * 
 * @param {number} price - Price value to validate
 * @param {string} name - Name of the price parameter for error messages
 * @returns {boolean} True if price is valid
 */
export function validatePrice(price, name = 'Price') {
    // Check if price is a number
    if (typeof price !== 'number' || isNaN(price)) {
        console.error(`${name} must be a valid number, got: ${price}`);
        return false;
    }

    // Check if price is finite
    if (!isFinite(price)) {
        console.error(`${name} must be a finite number, got: ${price}`);
        return false;
    }

    // Check if price is positive
    if (price <= 0) {
        console.error(`${name} must be positive, got: ${price}`);
        return false;
    }

    // Check if price is within reasonable bounds (0.000001 to 1,000,000)
    if (price < 0.000001 || price > 1000000) {
        console.error(`${name} is outside reasonable bounds: ${price}`);
        return false;
    }

    return true;
}

/**
 * Validate volume values
 * 
 * Ensures trading volume values are valid:
 * - Must be a positive number
 * - Must be finite
 * - Must be within reasonable bounds
 * 
 * @param {number} volume - Volume value to validate
 * @param {string} name - Name of the volume parameter for error messages
 * @returns {boolean} True if volume is valid
 */
export function validateVolume(volume, name = 'Volume') {
    // Check if volume is a number
    if (typeof volume !== 'number' || isNaN(volume)) {
        console.error(`${name} must be a valid number, got: ${volume}`);
        return false;
    }

    // Check if volume is finite
    if (!isFinite(volume)) {
        console.error(`${name} must be a finite number, got: ${volume}`);
        return false;
    }

    // Check if volume is positive
    if (volume <= 0) {
        console.error(`${name} must be positive, got: ${volume}`);
        return false;
    }

    // Check if volume is within reasonable bounds (0.000001 to 1,000,000)
    if (volume < 0.000001 || volume > 1000000) {
        console.error(`${name} is outside reasonable bounds: ${volume}`);
        return false;
    }

    return true;
}

/**
 * Validate percentage values
 * 
 * Ensures percentage values are valid for calculations:
 * - Must be a number
 * - Must be finite
 * - Must be within reasonable range (-1000% to +1000%)
 * 
 * @param {number} percentage - Percentage value to validate
 * @param {string} name - Name of the percentage parameter for error messages
 * @returns {boolean} True if percentage is valid
 */
export function validatePercentage(percentage, name = 'Percentage') {
    // Check if percentage is a number
    if (typeof percentage !== 'number' || isNaN(percentage)) {
        console.error(`${name} must be a valid number, got: ${percentage}`);
        return false;
    }

    // Check if percentage is finite
    if (!isFinite(percentage)) {
        console.error(`${name} must be a finite number, got: ${percentage}`);
        return false;
    }

    // Check if percentage is within reasonable range
    if (percentage < -1000 || percentage > 1000) {
        console.error(`${name} is outside reasonable range (-1000% to +1000%), got: ${percentage}%`);
        return false;
    }

    return true;
}

/**
 * Validate exchange configuration
 * 
 * Ensures exchange configuration objects are valid:
 * - Must have required properties
 * - Must have valid property types
 * - Must have reasonable values
 * 
 * @param {object} exchangeConfig - Exchange configuration to validate
 * @param {string} exchangeId - Exchange identifier for error messages
 * @returns {boolean} True if configuration is valid
 */
export function validateExchangeConfig(exchangeConfig, exchangeId) {
    if (!exchangeConfig || typeof exchangeConfig !== 'object') {
        console.error(`Exchange config for ${exchangeId} must be an object`);
        return false;
    }

    // Check required properties
    const requiredProps = ['id', 'options', 'retryAttempts', 'retryDelay'];
    for (const prop of requiredProps) {
        if (!(prop in exchangeConfig)) {
            console.error(`Exchange config for ${exchangeId} missing required property: ${prop}`);
            return false;
        }
    }

    // Validate exchange ID
    if (typeof exchangeConfig.id !== 'string' || !exchangeConfig.id) {
        console.error(`Exchange config for ${exchangeId} must have a valid string ID`);
        return false;
    }

    // Validate options object
    if (!exchangeConfig.options || typeof exchangeConfig.options !== 'object') {
        console.error(`Exchange config for ${exchangeId} must have a valid options object`);
        return false;
    }

    // Validate retry settings
    if (!Number.isInteger(exchangeConfig.retryAttempts) || exchangeConfig.retryAttempts < 0) {
        console.error(`Exchange config for ${exchangeId} must have non-negative integer retryAttempts`);
        return false;
    }

    if (!Number.isInteger(exchangeConfig.retryDelay) || exchangeConfig.retryDelay < 0) {
        console.error(`Exchange config for ${exchangeId} must have non-negative integer retryDelay`);
        return false;
    }

    return true;
}

/**
 * Validate trading configuration
 * 
 * Ensures trading configuration parameters are valid:
 * - Thresholds must be reasonable
 * - Volumes must be positive
 * - Intervals must be reasonable
 * 
 * @returns {boolean} True if trading configuration is valid
 */
export function validateTradingConfig() {
    const errors = [];

    // Validate profit threshold
    if (!validatePercentage(config.profitThresholdPercent, 'Profit threshold')) {
        errors.push('Invalid profit threshold');
    }

    // Validate close threshold
    if (!validatePercentage(config.closeThresholdPercent, 'Close threshold')) {
        errors.push('Invalid close threshold');
    }

    // Validate trade volume
    if (!validateVolume(config.tradeVolumeUSD, 'Trade volume')) {
        errors.push('Invalid trade volume');
    }

    // Validate intervals
    if (!Number.isInteger(config.intervalMs) || config.intervalMs < 50) {
        errors.push('Interval must be at least 50ms');
    }

    if (!Number.isInteger(config.statusUpdateInterval) || config.statusUpdateInterval < 1) {
        errors.push('Status update interval must be at least 1');
    }

    // Validate fee percentages
    for (const [exchangeId, feePercent] of Object.entries(config.feesPercent)) {
        if (!validatePercentage(feePercent, `Fee for ${exchangeId}`)) {
            errors.push(`Invalid fee percentage for ${exchangeId}`);
        }
    }

    // Report all errors
    if (errors.length > 0) {
        console.error('Trading configuration validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        return false;
    }

    return true;
}

/**
 * Validate order book data
 * 
 * Ensures order book data is valid for trading decisions:
 * - Must have bids and asks arrays
 * - Must have valid price and volume data
 * - Must be properly structured
 * 
 * @param {object} orderBook - Order book data to validate
 * @returns {boolean} True if order book is valid
 */
export function validateOrderBook(orderBook) {
    if (!orderBook || typeof orderBook !== 'object') {
        return false;
    }

    // Check if order book has required properties
    if (!Array.isArray(orderBook.bids) || !Array.isArray(orderBook.asks)) {
        return false;
    }

    // Validate bid entries
    for (const bid of orderBook.bids) {
        if (!Array.isArray(bid) || bid.length < 2) {
            return false;
        }
        if (!validatePrice(bid[0]) || !validateVolume(bid[1])) {
            return false;
        }
    }

    // Validate ask entries
    for (const ask of orderBook.asks) {
        if (!Array.isArray(ask) || ask.length < 2) {
            return false;
        }
        if (!validatePrice(ask[0]) || !validateVolume(ask[1])) {
            return false;
        }
    }

    return true;
}

/**
 * Validate arbitrage opportunity data
 * 
 * Ensures arbitrage opportunity calculations are valid:
 * - Prices must be valid
 * - Volume must be valid
 * - Profit calculations must be reasonable
 * 
 * @param {object} opportunity - Arbitrage opportunity data to validate
 * @returns {boolean} True if opportunity data is valid
 */
export function validateArbitrageOpportunity(opportunity) {
    if (!opportunity || typeof opportunity !== 'object') {
        return false;
    }

    // Validate required properties
    const requiredProps = ['buyPrice', 'sellPrice', 'volume', 'profitPercent'];
    for (const prop of requiredProps) {
        if (!(prop in opportunity)) {
            return false;
        }
    }

    // Validate prices
    if (!validatePrice(opportunity.buyPrice, 'Buy price') ||
        !validatePrice(opportunity.sellPrice, 'Sell price')) {
        return false;
    }

    // Validate volume
    if (!validateVolume(opportunity.volume, 'Volume')) {
        return false;
    }

    // Validate profit percentage
    if (!validatePercentage(opportunity.profitPercent, 'Profit percentage')) {
        return false;
    }

    // Validate that sell price is greater than buy price for profitable opportunity
    if (opportunity.sellPrice <= opportunity.buyPrice) {
        return false;
    }

    return true;
}

/**
 * Sanitize string input
 * 
 * Removes potentially dangerous characters and normalizes strings:
 * - Trims whitespace
 * - Removes control characters
 * - Limits length
 * 
 * @param {string} input - String to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') {
        return '';
    }

    // Trim whitespace
    let sanitized = input.trim();

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

/**
 * Validate and sanitize configuration object
 * 
 * Performs comprehensive validation of the entire configuration:
 * - Validates all trading parameters
 * - Validates exchange configurations
 * - Sanitizes string values
 * - Reports all validation errors
 * 
 * @returns {object} Validation result with success status and errors
 */
export function validateAndSanitizeConfig() {
    const errors = [];
    const warnings = [];

    try {
        // Validate trading configuration
        if (!validateTradingConfig()) {
            errors.push('Trading configuration validation failed');
        }

        // Validate exchange configurations
        for (const [exchangeId, exchangeConfig] of Object.entries(config.exchanges)) {
            if (!validateExchangeConfig(exchangeConfig, exchangeId)) {
                errors.push(`Exchange configuration validation failed for ${exchangeId}`);
            }
        }

        // Validate symbols
        for (const [exchangeId, symbol] of Object.entries(config.symbols)) {
            if (!validateTradingSymbol(symbol)) {
                errors.push(`Invalid trading symbol for ${exchangeId}: ${symbol}`);
            }
        }

        // Sanitize string values
        if (config.logSettings.logFile) {
            config.logSettings.logFile = sanitizeString(config.logSettings.logFile);
        }

        if (config.logSettings.summaryFile) {
            config.logSettings.summaryFile = sanitizeString(config.logSettings.summaryFile);
        }

    } catch (error) {
        errors.push(`Configuration validation error: ${error.message}`);
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}