/**
 * Mathematical calculations and arbitrage computations
 * 
 * This module provides essential mathematical functions for:
 * 1. Price difference calculations between exchanges
 * 2. Profit/loss percentage computations
 * 3. Fee calculations and adjustments
 * 4. Volume and investment calculations
 * 5. Risk and performance metrics
 * 
 * All calculations are optimized for financial precision and
 * handle edge cases gracefully.
 * 
 * Now enhanced with intelligent caching for repetitive calculations.
 */

import calculationCache from "./calculationCache.js";

/**
 * Calculate the percentage difference between two prices
 * 
 * This is the core function for determining arbitrage opportunities.
 * The formula calculates the relative difference as a percentage,
 * where positive values indicate profitable opportunities.
 * 
 * Formula: ((sellPrice - buyPrice) / buyPrice) * 100
 * 
 * Examples:
 * - buyPrice: 100, sellPrice: 102 → returns 2.0 (2% profit)
 * - buyPrice: 100, sellPrice: 98 → returns -2.0 (2% loss)
 * - buyPrice: 100, sellPrice: 100 → returns 0.0 (no difference)
 * 
 * @param {number} buyPrice - Price at which asset is bought (lower price)
 * @param {number} sellPrice - Price at which asset is sold (higher price)
 * @returns {number} Percentage difference (positive = profit, negative = loss)
 */
export function calculatePriceDifference(buyPrice, sellPrice) {
    // Validate input parameters
    if (typeof buyPrice !== 'number' || typeof sellPrice !== 'number') {
        throw new Error('Price parameters must be numbers');
    }

    if (buyPrice <= 0 || sellPrice <= 0) {
        throw new Error('Prices must be positive numbers');
    }

    // Use cached calculation for better performance
    return calculationCache.calculatePriceDifference(buyPrice, sellPrice);
}

/**
 * Calculate the absolute price difference between two prices
 * 
 * Returns the raw price difference in the same units as the input prices.
 * Useful for understanding the magnitude of price differences
 * independent of the base price level.
 * 
 * @param {number} price1 - First price
 * @param {number} price2 - Second price
 * @returns {number} Absolute difference between prices
 */
export function calculateAbsolutePriceDifference(price1, price2) {
    // Validate input parameters
    if (typeof price1 !== 'number' || typeof price2 !== 'number') {
        throw new Error('Price parameters must be numbers');
    }

    // Return absolute difference
    return Math.abs(price1 - price2);
}

/**
 * Calculate profit/loss percentage from cost and selling price
 * 
 * Similar to calculatePriceDifference but specifically for
 * profit/loss calculations where cost is the basis.
 * 
 * @param {number} costPrice - Cost price of the asset
 * @param {number} sellingPrice - Price at which asset is sold
 * @returns {number} Profit/loss percentage
 */
export function calculateProfitLossPercentage(costPrice, sellingPrice) {
    return calculatePriceDifference(costPrice, sellingPrice);
}

/**
 * Calculate the total cost including fees
 * 
 * Computes the total cost of a trade including:
 * - Base price of the asset
 * - Trading fees as a percentage
 * - Any additional fixed costs
 * 
 * @param {number} basePrice - Base price of the asset
 * @param {number} feePercentage - Trading fee as percentage (e.g., 0.1 for 0.1%)
 * @param {number} fixedCost - Additional fixed costs (default: 0)
 * @returns {number} Total cost including all fees
 */
export function calculateTotalCost(basePrice, feePercentage, fixedCost = 0) {
    // Validate input parameters
    if (typeof basePrice !== 'number' || typeof feePercentage !== 'number') {
        throw new Error('Price and fee parameters must be numbers');
    }

    if (basePrice <= 0 || feePercentage < 0) {
        throw new Error('Base price must be positive and fee must be non-negative');
    }

    // Use cached fee calculation for better performance
    const feeAmount = calculationCache.calculateFee(basePrice, feePercentage);

    // Return total cost
    return basePrice + feeAmount + fixedCost;
}

/**
 * Calculate net profit after deducting fees
 * 
 * Determines the actual profit after accounting for:
 * - Trading fees on both buy and sell sides
 * - Any other transaction costs
 * 
 * @param {number} grossProfit - Gross profit before fees
 * @param {number} buyFeePercentage - Fee percentage on buy side
 * @param {number} sellFeePercentage - Fee percentage on sell side
 * @param {number} tradeAmount - Amount traded
 * @returns {number} Net profit after all fees
 */
export function calculateNetProfit(grossProfit, buyFeePercentage, sellFeePercentage, tradeAmount) {
    // Validate input parameters
    if (typeof grossProfit !== 'number' || typeof buyFeePercentage !== 'number' ||
        typeof sellFeePercentage !== 'number' || typeof tradeAmount !== 'number') {
        throw new Error('All parameters must be numbers');
    }

    if (tradeAmount <= 0) {
        throw new Error('Trade amount must be positive');
    }

    // Use cached fee calculations for better performance
    const buyFees = calculationCache.calculateFee(tradeAmount, buyFeePercentage);
    const sellFees = calculationCache.calculateFee(tradeAmount, sellFeePercentage);
    const totalFees = buyFees + sellFees;

    // Return net profit
    return grossProfit - totalFees;
}

/**
 * Calculate the break-even price including fees
 * 
 * Determines the minimum selling price needed to break even
 * after accounting for all trading fees and costs.
 * 
 * @param {number} buyPrice - Price at which asset was bought
 * @param {number} buyFeePercentage - Fee percentage on buy side
 * @param {number} sellFeePercentage - Fee percentage on sell side
 * @returns {number} Break-even selling price
 */
export function calculateBreakEvenPrice(buyPrice, buyFeePercentage, sellFeePercentage) {
    // Validate input parameters
    if (typeof buyPrice !== 'number' || typeof buyFeePercentage !== 'number' ||
        typeof sellFeePercentage !== 'number') {
        throw new Error('All parameters must be numbers');
    }

    if (buyPrice <= 0 || buyFeePercentage < 0 || sellFeePercentage < 0) {
        throw new Error('Buy price must be positive and fees must be non-negative');
    }

    // Calculate total cost including buy fees
    const totalCost = calculateTotalCost(buyPrice, buyFeePercentage);

    // Calculate selling price needed to cover costs and sell fees
    // Formula: totalCost / (1 - sellFeePercentage/100)
    const sellFeeMultiplier = 1 - (sellFeePercentage / 100);
    const breakEvenPrice = totalCost / sellFeeMultiplier;

    return breakEvenPrice;
}

/**
 * Calculate the optimal trade volume based on available liquidity
 * 
 * Determines the maximum trade volume that can be executed
 * without significantly impacting market prices, based on:
 * - Available order book depth
 * - Maximum investment amount
 * - Risk tolerance parameters
 * 
 * @param {number} maxInvestment - Maximum investment amount in USD
 * @param {number} assetPrice - Current price of the asset
 * @param {number} availableVolume - Available volume in order book
 * @param {number} maxVolumePercentage - Maximum volume as percentage of order book (default: 10%)
 * @returns {number} Optimal trade volume in asset units
 */
export function calculateOptimalTradeVolume(maxInvestment, assetPrice, availableVolume, maxVolumePercentage = 10) {
    // Validate input parameters
    if (typeof maxInvestment !== 'number' || typeof assetPrice !== 'number' ||
        typeof availableVolume !== 'number' || typeof maxVolumePercentage !== 'number') {
        throw new Error('All parameters must be numbers');
    }

    if (maxInvestment <= 0 || assetPrice <= 0 || availableVolume <= 0 || maxVolumePercentage <= 0) {
        throw new Error('All parameters must be positive');
    }

    // Use cached volume calculation for better performance
    const investmentBasedVolume = calculationCache.calculateVolume(maxInvestment, assetPrice);

    // Calculate maximum volume based on order book depth
    const maxOrderBookVolume = (availableVolume * maxVolumePercentage) / 100;

    // Return the smaller of the two volumes
    return Math.min(investmentBasedVolume, maxOrderBookVolume);
}

/**
 * Calculate the Sharpe ratio for performance analysis
 * 
 * Measures risk-adjusted returns by comparing excess returns
 * to the standard deviation of returns. Higher values indicate
 * better risk-adjusted performance.
 * 
 * @param {number[]} returns - Array of return percentages
 * @param {number} riskFreeRate - Risk-free rate percentage (default: 0)
 * @returns {number} Sharpe ratio (higher is better)
 */
export function calculateSharpeRatio(returns, riskFreeRate = 0) {
    // Validate input parameters
    if (!Array.isArray(returns) || returns.length === 0) {
        throw new Error('Returns must be a non-empty array');
    }

    if (typeof riskFreeRate !== 'number') {
        throw new Error('Risk-free rate must be a number');
    }

    // Calculate average return
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    // Calculate excess return
    const excessReturn = avgReturn - riskFreeRate;

    // Calculate standard deviation
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Avoid division by zero
    if (stdDev === 0) {
        return 0;
    }

    // Return Sharpe ratio
    return excessReturn / stdDev;
}

/**
 * Calculate the maximum drawdown from peak
 * 
 * Measures the largest peak-to-trough decline in cumulative returns.
 * Useful for understanding the worst-case scenario and risk management.
 * 
 * @param {number[]} cumulativeReturns - Array of cumulative return percentages
 * @returns {object} Object containing maxDrawdown and peakIndex
 */
export function calculateMaxDrawdown(cumulativeReturns) {
    // Validate input parameters
    if (!Array.isArray(cumulativeReturns) || cumulativeReturns.length === 0) {
        throw new Error('Cumulative returns must be a non-empty array');
    }

    let maxDrawdown = 0;
    let peakIndex = 0;
    let peakValue = cumulativeReturns[0];

    // Find the maximum drawdown
    for (let i = 1; i < cumulativeReturns.length; i++) {
        const currentValue = cumulativeReturns[i];

        // Update peak if we have a new high
        if (currentValue > peakValue) {
            peakValue = currentValue;
            peakIndex = i;
        }

        // Calculate drawdown from current peak
        const drawdown = (peakValue - currentValue) / peakValue * 100;

        // Update maximum drawdown if this is worse
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    return {
        maxDrawdown: maxDrawdown,
        peakIndex: peakIndex
    };
}