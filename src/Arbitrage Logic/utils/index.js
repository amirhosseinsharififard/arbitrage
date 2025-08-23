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
import calculationManager from './calculationManager.js';

// Import formatting utilities
import * as FormattingUtils from './formatting.js';

// Import common utilities
import * as CommonUtils from './common.js';

// Import validation utilities
import * as ValidationUtils from './validation.js';

// Import order book utilities
import * as OrderbookUtils from './orderbook.js';
import { computeSpreads } from './spreads.js';

// Import request and data management utilities
import requestManager from './requestManager.js';
import dataUpdateManager from './dataUpdateManager.js';
import systemMonitor from './systemMonitor.js';

// Export all utility modules
export {
    CalculationUtils,
    FormattingUtils,
    CommonUtils,
    ValidationUtils,
    OrderbookUtils,
    computeSpreads,
    calculationManager,
    requestManager,
    dataUpdateManager,
    systemMonitor
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

// Export calculation manager functions
export const {
    calculateProfitPercentage,
    calculateArbitrageOpportunity,
    calculateAllArbitrageOpportunities,
    calculateTradeVolume,
    calculateRiskMetrics
} = calculationManager;