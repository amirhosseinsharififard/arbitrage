/**
 * Common utility functions for the arbitrage trading system
 * 
 * This module provides essential helper functions including:
 * 1. Asynchronous sleep/delay functions
 * 2. Unique identifier generation
 * 3. Input validation and sanitization
 * 4. Array and object manipulation helpers
 * 5. Error handling and debugging utilities
 * 
 * These functions are used throughout the system for common
 * operations and data processing tasks.
 */

/**
 * Sleep/delay function for asynchronous operations
 * 
 * Creates a promise that resolves after the specified time.
 * Useful for implementing delays, rate limiting, and retry logic.
 * 
 * @param {number} ms - Time to sleep in milliseconds
 * @returns {Promise} Promise that resolves after the specified time
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique identifier string
 * 
 * Creates a unique identifier using timestamp and random components.
 * Useful for tracking trades, positions, and other system entities.
 * 
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier string
 */
export function generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`;
}

/**
 * Validate numeric input values
 * 
 * Ensures input values are valid numbers within specified ranges.
 * Throws descriptive errors for invalid inputs.
 * 
 * @param {*} value - Value to validate
 * @param {string} name - Name of the parameter for error messages
 * @param {number} min - Minimum allowed value (optional)
 * @param {number} max - Maximum allowed value (optional)
 * @returns {number} Validated numeric value
 * @throws {Error} If validation fails
 */
export function validateNumericInput(value, name, min = null, max = null) {
    // Check if value is a number
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`${name} must be a valid number, got: ${value}`);
    }

    // Check minimum value if specified
    if (min !== null && value < min) {
        throw new Error(`${name} must be at least ${min}, got: ${value}`);
    }

    // Check maximum value if specified
    if (max !== null && value > max) {
        throw new Error(`${name} must be at most ${max}, got: ${value}`);
    }

    return value;
}

/**
 * Deep clone an object or array
 * 
 * Creates a complete copy of nested objects and arrays.
 * Useful for creating independent copies of configuration objects
 * and data structures.
 * 
 * @param {*} obj - Object or array to clone
 * @returns {*} Deep cloned copy
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }

    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }

    return obj;
}

/**
 * Merge multiple objects with deep merging
 * 
 * Combines multiple objects, with later objects overriding
 * earlier ones. Performs deep merging for nested properties.
 * 
 * @param {...object} objects - Objects to merge
 * @returns {object} Merged object
 */
export function deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                        result[key] = deepMerge(result[key] || {}, obj[key]);
                    } else {
                        result[key] = obj[key];
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Check if two values are approximately equal
 * 
 * Compares numeric values with a tolerance for floating-point
 * precision issues. Useful for price comparisons and calculations.
 * 
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} tolerance - Tolerance for comparison (default: 0.000001)
 * @returns {boolean} True if values are approximately equal
 */
export function approximatelyEqual(a, b, tolerance = 0.000001) {
    return Math.abs(a - b) < tolerance;
}

/**
 * Round a number to specified decimal places
 * 
 * Rounds numeric values to avoid floating-point precision issues.
 * Useful for financial calculations and price formatting.
 * 
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
export function roundToDecimals(value, decimals) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Generate a random number within a range
 * 
 * Creates random numbers for testing and simulation purposes.
 * Useful for generating test data and random delays.
 * 
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random number in the specified range
 */
export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Format a number with appropriate precision
 * 
 * Automatically determines the appropriate number of decimal places
 * based on the magnitude of the number.
 * 
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return 'n/a';
    }

    // Determine appropriate decimal places
    let decimals = 2;
    if (Math.abs(value) < 0.01) decimals = 6;
    else if (Math.abs(value) < 0.1) decimals = 4;
    else if (Math.abs(value) < 1) decimals = 3;

    return value.toFixed(decimals);
}

/**
 * Check if a value is within a specified range
 * 
 * Validates whether a numeric value falls within given bounds.
 * Useful for parameter validation and range checking.
 * 
 * @param {number} value - Value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if value is within range
 */
export function isInRange(value, min, max) {
    return value >= min && value <= max;
}

/**
 * Clamp a value to a specified range
 * 
 * Ensures a numeric value stays within specified bounds.
 * Useful for limiting values to valid ranges.
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}