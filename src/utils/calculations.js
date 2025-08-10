import config from "../config/config.js";

/**
 * Calculation utilities for arbitrage operations
 */
export class CalculationUtils {
    /**
     * Calculate price difference percentage between two prices
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @returns {number} Price difference percentage
     */
    static calculatePriceDifference(buyPrice, sellPrice) {
        if (!buyPrice || !sellPrice || buyPrice <= 0) return 0;
        return ((sellPrice - buyPrice) / buyPrice) * 100;
    }

    /**
     * Calculate net profit percentage after fees
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @param {number} buyFeePercent - Buy fee percentage
     * @param {number} sellFeePercent - Sell fee percentage
     * @returns {number} Net profit percentage
     */
    static calculateNetProfitPercent(buyPrice, sellPrice, buyFeePercent, sellFeePercent) {
        const grossProfitPercent = this.calculatePriceDifference(buyPrice, sellPrice);
        const totalFeesPercent = buyFeePercent + sellFeePercent;
        return grossProfitPercent - totalFeesPercent;
    }

    /**
     * Calculate potential profit from arbitrage
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @param {number} volume - Trading volume
     * @param {number} totalFeesPercent - Total fees percentage
     * @returns {object} Profit calculation details
     */
    static calculatePotentialProfit(buyPrice, sellPrice, volume, totalFeesPercent = 0) {
        if (!buyPrice || !sellPrice || buyPrice <= 0 || volume <= 0) {
            return {
                grossProfit: 0,
                netProfit: 0,
                profitPercent: 0,
                feeAmount: 0,
                isValid: false
            };
        }

        const grossProfit = (sellPrice - buyPrice) * volume;
        const feeAmount = (totalFeesPercent / 100) * volume * buyPrice;
        const netProfit = grossProfit - feeAmount;
        const profitPercent = this.calculatePriceDifference(buyPrice, sellPrice);

        return {
            grossProfit,
            netProfit,
            profitPercent,
            feeAmount,
            isValid: netProfit > 0
        };
    }

    /**
     * Calculate optimal trade volume based on available liquidity
     * @param {number} maxVolume - Maximum available volume
     * @param {number} targetVolume - Target trade volume
     * @param {number} minVolume - Minimum trade volume
     * @returns {number} Optimal trade volume
     */
    static calculateOptimalVolume(maxVolume, targetVolume, minVolume = 0.001) {
        if (maxVolume < minVolume) return 0;
        if (maxVolume < targetVolume) return maxVolume;
        return targetVolume;
    }

    /**
     * Calculate risk-adjusted profit threshold
     * @param {number} baseThreshold - Base profit threshold
     * @param {number} volatility - Market volatility factor
     * @param {number} riskMultiplier - Risk adjustment multiplier
     * @returns {number} Adjusted profit threshold
     */
    static calculateRiskAdjustedThreshold(baseThreshold, volatility = 1, riskMultiplier = 1.2) {
        return baseThreshold * volatility * riskMultiplier;
    }

    /**
     * Calculate total investment USD for a trade
     * @param {number} volume - Trading volume
     * @param {number} buyPrice - Buy price
     * @param {number} sellPrice - Sell price
     * @returns {number} Total investment in USD
     */
    static calculateTotalInvestment(volume, buyPrice, sellPrice) {
        return volume * buyPrice + volume * sellPrice;
    }

    /**
     * Calculate expected profit USD for a trade
     * @param {number} diffPercent - Price difference percentage
     * @param {number} tradeVolumeUSD - Trade volume in USD
     * @returns {number} Expected profit in USD
     */
    static calculateExpectedProfit(diffPercent, tradeVolumeUSD) {
        return (diffPercent / 100) * tradeVolumeUSD * 2; // Both sides
    }
}

export default CalculationUtils;