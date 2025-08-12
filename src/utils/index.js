/**
 * Utilities module index - Central export point for all utility functions
 * 
 * This module provides access to:
 * 1. Mathematical calculations and arbitrage computations
 * 2. Data formatting and display utilities
 * 3. Common helper functions
 * 4. Input validation and sanitization
 * 5. Order book processing utilities
 * 
 * All utility functions are organized by category and exported
 * for easy access throughout the system.
 */

// Import calculation utilities
import * as CalculationUtils from './calculations.js';

// Import formatting utilities
import * as FormattingUtils from './formatting.js';

// Import common utilities
import * as CommonUtils from './common.js';

// Import validation utilities
import * as ValidationUtils from './validation.js';

// Import order book utilities
import * as OrderbookUtils from './orderbook.js';

// Export all utility modules
export {
    CalculationUtils,
    FormattingUtils,
    CommonUtils,
    ValidationUtils,
    OrderbookUtils
};

// Export individual calculation functions for direct access
export const {
    calculatePriceDifference,
    calculateAbsolutePriceDifference,
    calculateProfitLossPercentage,
    calculateTotalCost,
    calculateNetProfit,
    calculateBreakEvenPrice,
    calculateOptimalTradeVolume,
    calculateSharpeRatio,
    calculateMaxDrawdown
} = CalculationUtils;