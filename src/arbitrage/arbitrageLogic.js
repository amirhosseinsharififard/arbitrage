import config from "../config/config.js";
import { CalculationUtils, ValidationUtils } from "../utils/index.js";

/**
 * Arbitrage Logic Module - Handles all arbitrage calculations and validations
 */
class ArbitrageLogic {
    constructor() {
        this.minDifference = config.arbitrage.minDifference;
        this.enableVolumeValidation = config.arbitrage.enableVolumeValidation;
        this.enableFeeCalculation = config.arbitrage.enableFeeCalculation;
    }

    /**
     * Check if there's an arbitrage opportunity between two prices
     * @param {number} bidPrice - Bid price (buy price)
     * @param {number} askPrice - Ask price (sell price)
     * @returns {boolean} True if arbitrage opportunity exists
     */
    checkArbitrageOpportunity(bidPrice, askPrice) {
        return ValidationUtils.validateArbitrageOpportunity(bidPrice, askPrice, this.minDifference);
    }

    /**
     * Validate arbitrage opportunity with additional checks
     * @param {number} bidPrice - Bid price (buy price)
     * @param {number} askPrice - Ask price (sell price)
     * @param {number} minDifference - Minimum price difference percentage
     * @returns {boolean} True if valid arbitrage opportunity
     */
    isValidArbitrage(bidPrice, askPrice, minDifference = null) {
        const threshold = minDifference || this.minDifference;
        return ValidationUtils.validateArbitrageOpportunity(bidPrice, askPrice, threshold);
    }

    /**
     * Calculate potential profit from arbitrage
     * @param {number} bidPrice - Bid price (buy price)
     * @param {number} askPrice - Ask price (sell price)
     * @param {number} volume - Trading volume
     * @param {number} fees - Trading fees percentage
     * @returns {object} Profit calculation details
     */
    calculatePotentialProfit(bidPrice, askPrice, volume, fees = 0) {
        if (!this.checkArbitrageOpportunity(bidPrice, askPrice)) {
            return {
                grossProfit: 0,
                netProfit: 0,
                profitPercent: 0,
                isValid: false
            };
        }

        return CalculationUtils.calculatePotentialProfit(bidPrice, askPrice, volume, fees);
    }

    /**
     * Calculate optimal trade volume based on available liquidity
     * @param {number} maxVolume - Maximum available volume
     * @param {number} targetVolume - Target trade volume
     * @param {number} minVolume - Minimum trade volume
     * @returns {number} Optimal trade volume
     */
    calculateOptimalVolume(maxVolume, targetVolume, minVolume = 0.001) {
        return CalculationUtils.calculateOptimalVolume(maxVolume, targetVolume, minVolume);
    }

    /**
     * Calculate risk-adjusted profit threshold
     * @param {number} baseThreshold - Base profit threshold
     * @param {number} volatility - Market volatility factor
     * @param {number} riskMultiplier - Risk adjustment multiplier
     * @returns {number} Adjusted profit threshold
     */
    calculateRiskAdjustedThreshold(baseThreshold, volatility = 1, riskMultiplier = 1.2) {
        return CalculationUtils.calculateRiskAdjustedThreshold(baseThreshold, volatility, riskMultiplier);
    }

    /**
     * Validate trade parameters before execution
     * @param {object} tradeParams - Trade parameters
     * @returns {object} Validation result
     */
    validateTradeParameters(tradeParams) {
        const validation = ValidationUtils.validateTradeParameters(tradeParams);

        if (validation.isValid) {
            const { buyPrice, sellPrice, volume } = tradeParams;
            const profitCalculation = this.calculatePotentialProfit(buyPrice, sellPrice, volume);

            return {
                ...validation,
                profitCalculation,
                recommendation: profitCalculation.isValid ? "EXECUTE" : "SKIP"
            };
        }

        return validation;
    }

    /**
     * Get arbitrage configuration
     * @returns {object} Current arbitrage configuration
     */
    getConfig() {
        return {
            minDifference: this.minDifference,
            enableVolumeValidation: this.enableVolumeValidation,
            enableFeeCalculation: this.enableFeeCalculation
        };
    }

    /**
     * Update arbitrage configuration
     * @param {object} newConfig - New configuration
     */
    updateConfig(newConfig) {
        if (newConfig.minDifference !== undefined) {
            this.minDifference = newConfig.minDifference;
        }
        if (newConfig.enableVolumeValidation !== undefined) {
            this.enableVolumeValidation = newConfig.enableVolumeValidation;
        }
        if (newConfig.enableFeeCalculation !== undefined) {
            this.enableFeeCalculation = newConfig.enableFeeCalculation;
        }
    }
}

// Create singleton instance
const arbitrageLogic = new ArbitrageLogic();

export default arbitrageLogic;
export { ArbitrageLogic };