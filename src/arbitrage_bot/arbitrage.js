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
 * Attempts to close an open arbitrage position with improved logic
 * @param {string} symbol - Trading symbol
 * @param {object} currentPrices - Current prices from both exchanges
 */
export async function tryClosePosition(symbol, currentPrices) {
    // Check all open arbitrage positions
    for (const [arbitrageId, position] of openPositions.entries()) {
        if (position.symbol !== symbol) continue;

        let currentBuyPrice, currentSellPrice, shouldClose = false,
            closeReason = '';

        // Determine current prices based on position direction
        if (position.buyExchangeId === "mexc" && position.sellExchangeId === "lbank") {
            // Original: Buy from MEXC, Sell to LBANK
            // To close: Sell to MEXC (mexc.bid), Buy from LBANK (lbank.ask)
            currentBuyPrice = currentPrices.lbank.ask; // Cost to buy back from LBANK
            currentSellPrice = currentPrices.mexc.bid; // Revenue from selling to MEXC
        } else if (position.buyExchangeId === "lbank" && position.sellExchangeId === "mexc") {
            // Original: Buy from LBANK, Sell to MEXC  
            // To close: Sell to LBANK (lbank.bid), Buy from MEXC (mexc.ask)
            currentBuyPrice = currentPrices.mexc.ask; // Cost to buy back from MEXC
            currentSellPrice = currentPrices.lbank.bid; // Revenue from selling to LBANK
        }

        // Calculate current spread (what we can make by closing now)
        const currentSpreadPercent = CalculationUtils.calculatePriceDifference(currentBuyPrice, currentSellPrice);

        // Calculate original spread when position was opened
        const originalSpreadPercent = CalculationUtils.calculatePriceDifference(position.buyPrice, position.sellPrice);

        // Current P&L: difference between current spread and original spread
        const currentProfitPercent = currentSpreadPercent - originalSpreadPercent;

        // Calculate total fees
        const totalFees = config.feesPercent[position.buyExchangeId] + config.feesPercent[position.sellExchangeId];

        // Net profit after fees
        const netProfitPercent = currentProfitPercent - totalFees;

        // Enhanced closing conditions
        if (netProfitPercent <= config.maxLossPercent) {
            // Stop loss triggered
            shouldClose = true;
            closeReason = 'Stop loss triggered';
        } else if (currentSpreadPercent <= config.closeThresholdPercent) {
            // Target profit reached (spread has decreased enough)
            shouldClose = true;
            closeReason = 'Target profit reached';
        } else if (currentSpreadPercent < 0) {
            // Spread has reversed (now profitable to close)
            shouldClose = true;
            closeReason = 'Spread reversed - profitable to close';
        }

        if (shouldClose) {
            const closeTime = new Date().toISOString();

            // Calculate actual profit/loss in USD
            const actualProfitUSD = (netProfitPercent / 100) * config.tradeVolumeUSD * 2;
            tradingState.totalProfit += actualProfitUSD;
            tradingState.lastTradeProfit = actualProfitUSD;
            tradingState.totalTrades++;
            tradingState.totalInvestment -= position.totalInvestmentUSD;

            // Enhanced logging
            await logger.logTrade("ARBITRAGE_CLOSE", symbol, {
                arbitrageId,
                buyExchangeId: position.buyExchangeId,
                sellExchangeId: position.sellExchangeId,
                originalBuyPrice: position.buyPrice,
                originalSellPrice: position.sellPrice,
                currentBuyPrice,
                currentSellPrice,
                volume: position.volume,
                originalSpreadPercent: FormattingUtils.formatPercentage(originalSpreadPercent),
                currentSpreadPercent: FormattingUtils.formatPercentage(currentSpreadPercent),
                currentProfitPercent: FormattingUtils.formatPercentage(currentProfitPercent),
                netProfitPercent: FormattingUtils.formatPercentage(netProfitPercent),
                actualProfitUSD: FormattingUtils.formatCurrency(actualProfitUSD),
                totalFees: FormattingUtils.formatPercentage(totalFees),
                closeReason,
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
                `[ARBITRAGE_CLOSE] ${symbol} | Direction: ${position.buyExchangeId}→${position.sellExchangeId} | ` +
                `Original: ${FormattingUtils.formatPercentage(originalSpreadPercent)} | Current: ${FormattingUtils.formatPercentage(currentSpreadPercent)} | ` +
                `P&L: ${FormattingUtils.formatPercentage(netProfitPercent)} | ${FormattingUtils.formatCurrency(actualProfitUSD)} | ` +
                `Reason: ${closeReason}`
            );

            // Remove the closed position
            openPositions.delete(arbitrageId);

            // Update global state
            if (openPositions.size === 0) {
                tradingState.isAnyPositionOpen = false;
            }

            console.log(`[SUMMARY] Trade #${tradingState.totalTrades} closed | Remaining positions: ${openPositions.size}`);

            break; // Only close one position at a time
        } else {
            // Log why position wasn't closed for debugging
            console.log(
                `[KEEP_OPEN] ${arbitrageId} | Current P&L: ${FormattingUtils.formatPercentage(netProfitPercent)} | ` +
                `Current spread: ${FormattingUtils.formatPercentage(currentSpreadPercent)} | ` +
                `Thresholds: Stop Loss: ${config.maxLossPercent}% | Close: ${config.closeThresholdPercent}%`
            );
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