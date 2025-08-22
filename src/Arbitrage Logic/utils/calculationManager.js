/**
 * Centralized Calculation Manager
 * Provides all calculation functions in one place for reuse throughout the project
 * 
 * This module centralizes all mathematical calculations and provides:
 * 1. Price difference calculations
 * 2. Profit/loss computations
 * 3. Fee calculations
 * 4. Volume and investment calculations
 * 5. Cached results for performance
 */

import calculationCache from "./calculationCache.js";

/**
 * Centralized calculation manager class
 */
class CalculationManager {
    constructor() {
        this.cache = calculationCache;
        this.calculationHistory = new Map();
    }

    /**
     * Calculate profit percentage between two prices
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @returns {number} Profit percentage
     */
    calculateProfitPercentage(buyPrice, sellPrice) {
        if (typeof buyPrice !== 'number' || typeof sellPrice !== 'number') {
            throw new Error('Price parameters must be numbers');
        }

        if (buyPrice <= 0 || sellPrice <= 0) {
            throw new Error('Prices must be positive numbers');
        }

        // Use cached calculation for better performance
        return this.cache.calculatePriceDifference(buyPrice, sellPrice);
    }

    /**
     * Calculate price difference percentage
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @returns {number} Price difference percentage
     */
    calculatePriceDifference(buyPrice, sellPrice) {
        return this.calculateProfitPercentage(buyPrice, sellPrice);
    }

    /**
     * Calculate absolute price difference
     * @param {number} price1 - First price
     * @param {number} price2 - Second price
     * @returns {number} Absolute difference
     */
    calculateAbsolutePriceDifference(price1, price2) {
        if (typeof price1 !== 'number' || typeof price2 !== 'number') {
            throw new Error('Price parameters must be numbers');
        }
        return Math.abs(price1 - price2);
    }

    /**
     * Calculate profit/loss percentage
     * @param {number} costPrice - Cost price
     * @param {number} sellingPrice - Selling price
     * @returns {number} Profit/loss percentage
     */
    calculateProfitLossPercentage(costPrice, sellingPrice) {
        return this.calculateProfitPercentage(costPrice, sellingPrice);
    }

    /**
     * Calculate total cost including fees
     * @param {number} basePrice - Base price
     * @param {number} feePercentage - Fee percentage
     * @param {number} fixedCost - Fixed cost
     * @returns {number} Total cost
     */
    calculateTotalCost(basePrice, feePercentage, fixedCost = 0) {
        if (typeof basePrice !== 'number' || typeof feePercentage !== 'number') {
            throw new Error('Price and fee parameters must be numbers');
        }

        if (basePrice <= 0) {
            throw new Error('Base price must be positive');
        }

        const feeAmount = basePrice * (feePercentage / 100);
        return basePrice + feeAmount + fixedCost;
    }

    /**
     * Calculate net profit after fees
     * @param {number} grossProfit - Gross profit
     * @param {number} buyFee - Buy fee percentage
     * @param {number} sellFee - Sell fee percentage
     * @param {number} tradeAmount - Trade amount
     * @returns {number} Net profit
     */
    calculateNetProfit(grossProfit, buyFee, sellFee, tradeAmount) {
        if (typeof grossProfit !== 'number' || typeof buyFee !== 'number' || 
            typeof sellFee !== 'number' || typeof tradeAmount !== 'number') {
            throw new Error('All parameters must be numbers');
        }

        const totalFees = tradeAmount * ((buyFee + sellFee) / 100);
        return grossProfit - totalFees;
    }

    /**
     * Calculate arbitrage opportunity
     * @param {object} exchangeA - First exchange data
     * @param {object} exchangeB - Second exchange data
     * @param {object} config - Configuration
     * @returns {object} Arbitrage opportunity data
     */
    calculateArbitrageOpportunity(exchangeA, exchangeB, config) {
        const opportunities = [];

        // A->B opportunity (buy on A, sell on B)
        if (exchangeA.ask && exchangeB.bid) {
            const profitPercent = this.calculateProfitPercentage(exchangeA.ask, exchangeB.bid);
            if (profitPercent >= config.profitThresholdPercent) {
                opportunities.push({
                    direction: 'A->B',
                    buyPrice: exchangeA.ask,
                    sellPrice: exchangeB.bid,
                    profitPercent: profitPercent,
                    buyExchange: 'A',
                    sellExchange: 'B'
                });
            }
        }

        // B->A opportunity (buy on B, sell on A)
        if (exchangeB.ask && exchangeA.bid) {
            const profitPercent = this.calculateProfitPercentage(exchangeB.ask, exchangeA.bid);
            if (profitPercent >= config.profitThresholdPercent) {
                opportunities.push({
                    direction: 'B->A',
                    buyPrice: exchangeB.ask,
                    sellPrice: exchangeA.bid,
                    profitPercent: profitPercent,
                    buyExchange: 'B',
                    sellExchange: 'A'
                });
            }
        }

        return opportunities;
    }

    /**
     * Calculate all arbitrage opportunities for multiple exchanges
     * @param {object} prices - Price data for all exchanges
     * @param {object} config - Configuration
     * @returns {Array} Array of arbitrage opportunities
     */
    calculateAllArbitrageOpportunities(prices, config) {
        const opportunities = [];
        const exchanges = Object.keys(prices).filter(id => prices[id] !== null);
        
        for (let i = 0; i < exchanges.length; i++) {
            for (let j = i + 1; j < exchanges.length; j++) {
                const exchangeA = exchanges[i];
                const exchangeB = exchanges[j];
                const priceA = prices[exchangeA];
                const priceB = prices[exchangeB];
                
                if (!priceA || !priceB) continue;
                
                const pairOpportunities = this.calculateArbitrageOpportunity(
                    { ...priceA, name: exchangeA },
                    { ...priceB, name: exchangeB },
                    config
                );
                
                opportunities.push(...pairOpportunities);
            }
        }
        
        return opportunities;
    }

    /**
     * Calculate trade volume based on configuration
     * @param {object} config - Configuration
     * @param {number} price - Current price
     * @returns {object} Trade volume data
     */
    calculateTradeVolume(config, price) {
        if (config.tradingMode === "TOKEN") {
            return {
                tokenQuantity: config.targetTokenQuantity,
                usdValue: config.targetTokenQuantity * price,
                maxTokens: config.maxTokenQuantity
            };
        } else {
            return {
                tokenQuantity: config.tradeVolumeUSD / price,
                usdValue: config.tradeVolumeUSD,
                maxTokens: config.maxTokenQuantity
            };
        }
    }

    /**
     * Calculate risk metrics
     * @param {Array} opportunities - Arbitrage opportunities
     * @param {object} config - Configuration
     * @returns {object} Risk metrics
     */
    calculateRiskMetrics(opportunities, config) {
        if (!opportunities || opportunities.length === 0) {
            return {
                totalRisk: 0,
                averageRisk: 0,
                maxRisk: 0,
                riskLevel: 'LOW'
            };
        }

        const risks = opportunities.map(opp => {
            const risk = Math.abs(opp.profitPercent - config.profitThresholdPercent);
            return risk;
        });

        const totalRisk = risks.reduce((sum, risk) => sum + risk, 0);
        const averageRisk = totalRisk / risks.length;
        const maxRisk = Math.max(...risks);

        let riskLevel = 'LOW';
        if (averageRisk > 5) riskLevel = 'HIGH';
        else if (averageRisk > 2) riskLevel = 'MEDIUM';

        return {
            totalRisk,
            averageRisk,
            maxRisk,
            riskLevel
        };
    }

    /**
     * Store calculation result in history
     * @param {string} key - Calculation key
     * @param {any} result - Calculation result
     */
    storeCalculation(key, result) {
        this.calculationHistory.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Get calculation result from history
     * @param {string} key - Calculation key
     * @returns {any} Stored result or null
     */
    getCalculation(key) {
        const stored = this.calculationHistory.get(key);
        if (stored && Date.now() - stored.timestamp < 60000) { // 1 minute cache
            return stored.result;
        }
        return null;
    }

    /**
     * Clear calculation history
     */
    clearHistory() {
        this.calculationHistory.clear();
    }

    /**
     * Get calculation statistics
     * @returns {object} Statistics
     */
    getStatistics() {
        const cacheStats = this.cache.getStats();
        return {
            cacheSize: this.calculationHistory.size,
            cacheStats: cacheStats,
            totalCalculations: this.calculationHistory.size
        };
    }
}

// Create singleton instance
const calculationManager = new CalculationManager();

// Export the singleton instance
export default calculationManager;

// Also export individual functions for backward compatibility
export const {
    calculateProfitPercentage,
    calculatePriceDifference,
    calculateAbsolutePriceDifference,
    calculateProfitLossPercentage,
    calculateTotalCost,
    calculateNetProfit,
    calculateArbitrageOpportunity,
    calculateAllArbitrageOpportunities,
    calculateTradeVolume,
    calculateRiskMetrics
} = calculationManager;
