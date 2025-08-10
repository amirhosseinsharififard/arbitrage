import config from "../config/config.js";
import logger from "../logging/logger.js";
import statistics from "../monitoring/statistics.js";
import { CalculationUtils, FormattingUtils } from "../utils/index.js";

// Map to store open arbitrage positions
export const openPositions = new Map();
// Key: arbitrageId (e.g., "mexc-lbank" or "lbank-mexc")
// Value: { 
//   buyExchangeId, sellExchangeId, buyPrice, sellPrice, 
//   volume, openTime, buyOrderId, sellOrderId, 
//   totalInvestmentUSD, expectedProfitUSD 
// }

// Global trading state to maintain overall system status
export const tradingState = {
    isAnyPositionOpen: false,
    totalProfit: 0,
    totalTrades: 0,
    lastTradeProfit: 0,
    totalInvestment: 0
};

/**
 * Generates unique arbitrage position ID
 * @param {string} buyExchangeId - Exchange to buy from
 * @param {string} sellExchangeId - Exchange to sell to
 * @returns {string} Unique arbitrage ID
 */
function generateArbitrageId(buyExchangeId, sellExchangeId) {
    return `${buyExchangeId}-${sellExchangeId}`;
}

/**
 * Attempts to open a new arbitrage position
 * @param {string} symbol - Trading symbol
 * @param {string} buyExchangeId - Exchange to buy from
 * @param {string} sellExchangeId - Exchange to sell to
 * @param {number} buyPrice - Current buy price
 * @param {number} sellPrice - Current sell price
 */
export async function tryOpenPosition(
    symbol,
    buyExchangeId,
    sellExchangeId,
    buyPrice,
    sellPrice
) {
    const arbitrageId = generateArbitrageId(buyExchangeId, sellExchangeId);

    // Prevent opening new positions if one is already open
    if (tradingState.isAnyPositionOpen) {
        console.log(`[SKIP] Position already open. Waiting for previous position to close...`);
        return;
    }

    // Check if maximum number of trades has been reached
    if (config.maxTrades > 0 && tradingState.totalTrades >= config.maxTrades) {
        console.log(`[STOP] Maximum number of trades (${config.maxTrades}) reached. System stopped.`);
        return;
    }

    // Calculate price difference percentage between two exchanges
    const diffPercent = CalculationUtils.calculatePriceDifference(buyPrice, sellPrice);

    // Only open position if profit threshold is met
    if (diffPercent >= config.profitThresholdPercent) {
        // Calculate volume for each exchange (100 USD each)
        const buyVolume = config.tradeVolumeUSD / buyPrice; // Convert USD to coin volume
        const sellVolume = config.tradeVolumeUSD / sellPrice; // Convert USD to coin volume

        // Use the smaller volume to ensure we can execute both trades
        const volume = Math.min(buyVolume, sellVolume);
        const totalInvestmentUSD = CalculationUtils.calculateTotalInvestment(volume, buyPrice, sellPrice);
        const expectedProfitUSD = CalculationUtils.calculateExpectedProfit(diffPercent, config.tradeVolumeUSD);

        const position = {
            arbitrageId,
            symbol,
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume,
            openTime: new Date().toISOString(),
            totalInvestmentUSD,
            expectedProfitUSD,
            buyOrderId: null, // Will be filled when order is placed
            sellOrderId: null, // Will be filled when order is placed
            status: 'OPENING'
        };

        openPositions.set(arbitrageId, position);
        tradingState.isAnyPositionOpen = true;
        tradingState.totalInvestment += totalInvestmentUSD;

        // Log the arbitrage position opening
        await logger.logTrade("ARBITRAGE_OPEN", symbol, {
            arbitrageId,
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume,
            diffPercent: FormattingUtils.formatPercentage(diffPercent),
            totalInvestmentUSD: FormattingUtils.formatCurrency(totalInvestmentUSD),
            expectedProfitUSD: FormattingUtils.formatCurrency(expectedProfitUSD)
        });

        // Record trade opening in statistics
        statistics.recordTradeOpen({
            volume,
            buyPrice
        });

        console.log(
            `[ARBITRAGE_OPEN] ${symbol} | Buy@${FormattingUtils.formatPrice(buyPrice)} from ${buyExchangeId} | Sell@${FormattingUtils.formatPrice(sellPrice)} to ${sellExchangeId} | ` +
            `Vol:${FormattingUtils.formatVolume(volume)} | Diff:${FormattingUtils.formatPercentage(diffPercent)} | Investment:${FormattingUtils.formatCurrency(totalInvestmentUSD)} | ` +
            `Expected Profit:${FormattingUtils.formatCurrency(expectedProfitUSD)}`
        );
    }
}

/**
 * Attempts to close an open arbitrage position
 * @param {string} symbol - Trading symbol
 * @param {number} buyPriceNow - Current buy price
 * @param {number} sellPriceNow - Current sell price
 */
export async function tryClosePosition(symbol, buyPriceNow, sellPriceNow) {
    // Check all open arbitrage positions
    for (const [arbitrageId, position] of openPositions.entries()) {
        if (position.symbol !== symbol) continue;

        // Calculate current price difference
        const currentDiffPercent = CalculationUtils.calculatePriceDifference(buyPriceNow, sellPriceNow);

        // Calculate current profit/loss based on original arbitrage
        const originalDiffPercent = CalculationUtils.calculatePriceDifference(position.buyPrice, position.sellPrice);
        const currentProfitPercent = originalDiffPercent - currentDiffPercent;

        // Calculate total fees for both exchanges
        const totalFees =
            config.feesPercent[position.buyExchangeId] +
            config.feesPercent[position.sellExchangeId];

        // Calculate net profit after fees
        const netProfitPercent = currentProfitPercent - totalFees;

        // Position closing conditions:
        // 1. Current price difference is <= close threshold (profit taken)
        // 2. Or loss is too high (to prevent further losses)
        const shouldClose =
            currentDiffPercent <= config.closeThresholdPercent ||
            netProfitPercent <= config.maxLossPercent;

        if (shouldClose) {
            const closeTime = new Date().toISOString();

            // Calculate actual profit/loss in USD
            const actualProfitUSD = (netProfitPercent / 100) * config.tradeVolumeUSD * 2; // Both sides
            tradingState.totalProfit += actualProfitUSD;
            tradingState.lastTradeProfit = actualProfitUSD;
            tradingState.totalTrades++;
            tradingState.totalInvestment -= position.totalInvestmentUSD;

            // Log the arbitrage position closing
            await logger.logTrade("ARBITRAGE_CLOSE", symbol, {
                arbitrageId,
                buyExchangeId: position.buyExchangeId,
                sellExchangeId: position.sellExchangeId,
                originalBuyPrice: position.buyPrice,
                originalSellPrice: position.sellPrice,
                currentBuyPrice: buyPriceNow,
                currentSellPrice: sellPriceNow,
                volume: position.volume,
                originalDiffPercent: FormattingUtils.formatPercentage(originalDiffPercent),
                currentDiffPercent: FormattingUtils.formatPercentage(currentDiffPercent),
                netProfitPercent: FormattingUtils.formatPercentage(netProfitPercent),
                actualProfitUSD: FormattingUtils.formatCurrency(actualProfitUSD),
                totalFees: FormattingUtils.formatPercentage(totalFees),
                closeReason: currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered',
                tradeNumber: tradingState.totalTrades
            });

            // Record trade closing in statistics
            statistics.recordTradeClose({
                actualProfitUSD: actualProfitUSD,
                volume: position.volume,
                buyPriceOpen: position.buyPrice,
                feesPercent: totalFees
            });

            console.log(
                `[ARBITRAGE_CLOSE] ${symbol} | Original Diff:${FormattingUtils.formatPercentage(originalDiffPercent)} | Current Diff:${FormattingUtils.formatPercentage(currentDiffPercent)} | ` +
                `Net Profit:${FormattingUtils.formatPercentage(netProfitPercent)} | P&L:${FormattingUtils.formatCurrency(actualProfitUSD)} | ` +
                `Reason: ${currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered'}`
            );

            // Remove the closed position
            openPositions.delete(arbitrageId);
            tradingState.isAnyPositionOpen = false;

            // Display trade summary
            console.log(`[SUMMARY] Arbitrage Trade #${tradingState.totalTrades} closed:`);
            console.log(`   - This trade P&L: ${FormattingUtils.formatCurrency(actualProfitUSD)}`);
            console.log(`   - Total P&L so far: ${FormattingUtils.formatCurrency(tradingState.totalProfit)}`);
            console.log(`   - Total trades: ${tradingState.totalTrades}`);
            console.log(`   - Close reason: ${currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered'}`);
            console.log(`   - Ready for next arbitrage opportunity...`);

            break; // Only close one position at a time
        }
    }
}

/**
 * Get current trading status
 * @returns {object} Current trading status
 */
export function getTradingStatus() {
    return {
        isAnyPositionOpen: tradingState.isAnyPositionOpen,
        totalProfit: tradingState.totalProfit,
        totalTrades: tradingState.totalTrades,
        lastTradeProfit: tradingState.lastTradeProfit,
        totalInvestment: tradingState.totalInvestment,
        openPositionsCount: openPositions.size
    };
}