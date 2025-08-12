/**
 * Core arbitrage trading logic and position management
 * 
 * This module implements the main arbitrage strategy:
 * 1. Buy at LBANK ask price (lower price)
 * 2. Sell at MEXC bid price (higher price)
 * 3. Profit from the price difference between exchanges
 * 
 * The system maintains only one open position at a time for risk management.
 */

import config from "../config/config.js";
import logger from "../logging/logger.js";
import statistics from "../monitoring/statistics.js";
import { CalculationUtils, FormattingUtils } from "../utils/index.js";
import { priceService } from "../services/index.js";
import exchangeManager from "../exchanges/exchangeManager.js";

/**
 * Global storage for open arbitrage positions
 * Key: arbitrageId (e.g., "lbank-mexc" for LBANK->MEXC arbitrage)
 * Value: Complete position object with all trade details
 */
export const openPositions = new Map();

/**
 * Global trading state to maintain overall system status
 * Tracks profit/loss, trade counts, and investment across all positions
 */
export const tradingState = {
    isAnyPositionOpen: false, // Flag indicating if any position is currently open
    totalProfit: 0, // Cumulative profit/loss across all completed trades
    totalTrades: 0, // Total number of completed trades
    lastTradeProfit: 0, // Profit/loss from the most recent completed trade
    totalInvestment: 0 // Total amount currently invested in open positions
};

/**
 * Generates a unique identifier for arbitrage positions
 * Format: "buyExchange-sellExchange" (e.g., "lbank-mexc")
 * 
 * @param {string} buyExchangeId - Exchange where we buy the asset
 * @param {string} sellExchangeId - Exchange where we sell the asset
 * @returns {string} Unique arbitrage position identifier
 */
function generateArbitrageId(buyExchangeId, sellExchangeId) {
    return `${buyExchangeId}-${sellExchangeId}`;
}

/**
 * Attempts to open a new arbitrage position when profitable conditions are met
 * 
 * Trading Strategy:
 * - Buy at LBANK ask price (lower price)
 * - Sell at MEXC bid price (higher price)
 * - Only open if profit threshold is met
 * - Calculate optimal volume based on available liquidity
 * 
 * @param {string} symbol - Trading symbol (e.g., "DEBT/USDT:USDT")
 * @param {string} buyExchangeId - Exchange to buy from (e.g., "lbank")
 * @param {string} sellExchangeId - Exchange to sell to (e.g., "mexc")
 * @param {number} buyPrice - Current ask price at buy exchange
 * @param {number} sellPrice - Current bid price at sell exchange
 */
export async function tryOpenPosition(
    symbol,
    buyExchangeId,
    sellExchangeId,
    buyPrice,
    sellPrice
) {
    // Generate unique identifier for this arbitrage position
    const arbitrageId = generateArbitrageId(buyExchangeId, sellExchangeId);

    // Risk management: Only one position open at a time
    if (tradingState.isAnyPositionOpen) {
        console.log(`[SKIP] Position already open. Waiting for previous position to close...`);
        return;
    }

    // Calculate price difference percentage between the two exchanges
    // Positive value means profitable opportunity (sell price > buy price)
    const diffPercent = CalculationUtils.calculatePriceDifference(buyPrice, sellPrice);

    // Only proceed if profit threshold is met
    if (diffPercent >= config.profitThresholdPercent) {
        // Calculate trade volume based on configured investment amount
        // We invest $100 on each side (buy and sell) for a total of $200
        const investmentPerSide = config.tradeVolumeUSD / 2;
        let volume = investmentPerSide / buyPrice; // Volume based on buy price

        // Fetch order book data to validate liquidity and calculate optimal volume
        let orderbookSnapshot = null;
        if (config.arbitrage.useOrderBookVolume && exchangeManager.isInitialized()) {
            try {
                // Get exchange instances for order book access
                const buyEx = exchangeManager.getExchange(buyExchangeId);
                const sellEx = exchangeManager.getExchange(sellExchangeId);

                // Fetch order books from both exchanges simultaneously
                const [buyOb, sellOb] = await Promise.all([
                    buyEx.fetchOrderBook(symbol),
                    sellEx.fetchOrderBook(symbol)
                ]);

                // Extract best ask (buy) and best bid (sell) prices and volumes
                // For opening: we BUY at buy exchange best ASK, and SELL at sell exchange best BID
                const buyBestAsk = buyOb.asks && buyOb.asks[0] ? {
                    price: buyOb.asks[0][0],
                    amount: buyOb.asks[0][1]
                } : null;
                const sellBestBid = sellOb.bids && sellOb.bids[0] ? {
                    price: sellOb.bids[0][0],
                    amount: sellOb.bids[0][1]
                } : null;

                // Calculate optimal volume based on available liquidity and desired investment
                if (buyBestAsk && sellBestBid) {
                    // Calculate volume based on $100 investment on buy side
                    const buyVolume = investmentPerSide / buyBestAsk.price;
                    // Calculate volume based on $100 investment on sell side  
                    const sellVolume = investmentPerSide / sellBestBid.price;
                    // Use the smaller volume to ensure both sides can be executed
                    volume = Math.min(buyVolume, sellVolume, buyBestAsk.amount, sellBestBid.amount);
                }

                // Store order book snapshot for logging and analysis
                const sellBestAsk = sellOb.asks && sellOb.asks[0] ? {
                    price: sellOb.asks[0][0],
                    amount: sellOb.asks[0][1]
                } : null;
                const buyBestBid = buyOb.bids && buyOb.bids[0] ? {
                    price: buyOb.bids[0][0],
                    amount: buyOb.bids[0][1]
                } : null;

                orderbookSnapshot = {
                    buyExchange: buyExchangeId,
                    sellExchange: sellExchangeId,
                    buyBestAsk,
                    buyBestBid,
                    sellBestBid,
                    sellBestAsk
                };
            } catch (error) {
                // If order book fetch fails, continue with basic volume calculation
                console.log(`⚠️ Order book fetch failed, using basic volume calculation`);
            }
        }

        // Calculate financial metrics for the position
        const buyCostUSD = volume * buyPrice; // Total cost to buy the asset
        const sellProceedsUSD = volume * sellPrice; // Total proceeds from selling
        const totalInvestmentUSD = buyCostUSD + sellProceedsUSD; // Total notional value
        const expectedProfitUSD = (diffPercent / 100) * totalInvestmentUSD; // Expected profit

        // Calculate total fees for both exchanges
        const feesPercentTotal = (config.feesPercent[buyExchangeId] || 0) + (config.feesPercent[sellExchangeId] || 0);
        const estimatedFeesUSD = ((feesPercentTotal / 100) * (buyCostUSD + sellProceedsUSD));

        // Calculate price differences for different trading directions
        const openDirectionDiffPercent = (orderbookSnapshot && orderbookSnapshot.buyBestAsk && orderbookSnapshot.sellBestBid) ?
            CalculationUtils.calculatePriceDifference(orderbookSnapshot.buyBestAsk.price, orderbookSnapshot.sellBestBid.price) :
            diffPercent;
        const oppositeDirectionDiffPercent = (orderbookSnapshot && orderbookSnapshot.sellBestAsk && orderbookSnapshot.buyBestBid) ?
            CalculationUtils.calculatePriceDifference(orderbookSnapshot.sellBestAsk.price, orderbookSnapshot.buyBestBid.price) :
            null;

        // Create position object with all trade details
        const position = {
            arbitrageId, // Unique position identifier
            symbol, // Trading symbol
            buyExchangeId, // Exchange to buy from
            sellExchangeId, // Exchange to sell to
            buyPrice, // Price at which we buy
            sellPrice, // Price at which we sell
            volume, // Trade volume in asset units
            openTime: new Date().toISOString(), // Timestamp when position was opened
            totalInvestmentUSD, // Total notional value of the position
            expectedProfitUSD, // Expected profit based on price difference
            buyOrderId: null, // Will be filled when buy order is placed
            sellOrderId: null, // Will be filled when sell order is placed
            status: 'OPENING' // Current position status
        };

        // Store the position and update global state
        openPositions.set(arbitrageId, position);
        tradingState.isAnyPositionOpen = true;
        tradingState.totalInvestment += totalInvestmentUSD;

        // Log the arbitrage position opening with comprehensive details
        await logger.logTrade("ARBITRAGE_OPEN", symbol, {
            arbitrageId,
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume,
            buyAmount: volume, // Amount to buy
            sellAmount: volume, // Amount to sell
            buyCostUSD: FormattingUtils.formatCurrency(buyCostUSD), // Cost to buy
            sellProceedsUSD: FormattingUtils.formatCurrency(sellProceedsUSD), // Proceeds from sell
            diffPercent: FormattingUtils.formatPercentage(diffPercent),
            totalInvestmentUSD: FormattingUtils.formatCurrency(totalInvestmentUSD),
            expectedProfitUSD: FormattingUtils.formatCurrency(expectedProfitUSD),
            details: {
                openTime: new Date().toISOString(),
                orderbookAtOpen: orderbookSnapshot, // Order book snapshot at opening
                profitBreakdown: {
                    grossDiffPercent: FormattingUtils.formatPercentage(diffPercent),
                    feesPercentTotal: FormattingUtils.formatPercentage(feesPercentTotal),
                    netExpectedDiffPercent: FormattingUtils.formatPercentage(diffPercent - feesPercentTotal),
                    estimatedFeesUSD: FormattingUtils.formatCurrency(estimatedFeesUSD)
                },
                spreads: {
                    openDirection: FormattingUtils.formatPercentage(openDirectionDiffPercent),
                    oppositeDirection: oppositeDirectionDiffPercent != null ? FormattingUtils.formatPercentage(oppositeDirectionDiffPercent) : null
                }
            }
        });

        // Record trade opening in statistics for monitoring
        statistics.recordTradeOpen({
            volume,
            buyPrice
        });

        // Display trade opening information in console
        console.log(
            `🎯 [ARBITRAGE_OPEN] ${symbol} | Buy@${FormattingUtils.formatPrice(buyPrice)} from ${buyExchangeId} | Sell@${FormattingUtils.formatPrice(sellPrice)} to ${sellExchangeId} | ` +
            `Vol:${FormattingUtils.formatVolume(volume)} | Diff:${FormattingUtils.formatPercentage(diffPercent)} | Investment:${FormattingUtils.formatCurrency(totalInvestmentUSD)} | ` +
            `Expected Profit:${FormattingUtils.formatCurrency(expectedProfitUSD)}`
        );

        // Display detailed position information for monitoring
        console.log(`📊 [POSITION_DETAILS] Arbitrage ID: ${arbitrageId}`);
        console.log(`   - Buy Exchange: ${buyExchangeId} @ ${FormattingUtils.formatPrice(buyPrice)}`);
        console.log(`   - Sell Exchange: ${sellExchangeId} @ ${FormattingUtils.formatPrice(sellPrice)}`);
        console.log(`   - Volume: ${FormattingUtils.formatVolume(volume)} (buyAmount=${FormattingUtils.formatVolume(volume)}, sellAmount=${FormattingUtils.formatVolume(volume)})`);
        console.log(`   - Price Difference: ${FormattingUtils.formatPercentage(diffPercent)}`);
        console.log(`   - Buy Cost: ${FormattingUtils.formatCurrency(buyCostUSD)} | Sell Proceeds: ${FormattingUtils.formatCurrency(sellProceedsUSD)}`);
        console.log(`   - Total Notional: ${FormattingUtils.formatCurrency(totalInvestmentUSD)} | Est. Fees: ${FormattingUtils.formatCurrency(estimatedFeesUSD)}`);
        console.log(`   - Expected Profit: ${FormattingUtils.formatCurrency(expectedProfitUSD)}`);
        console.log(`   - Fees Total: ${FormattingUtils.formatPercentage(feesPercentTotal)}`);
        console.log(`   - Net Expected Profit: ${FormattingUtils.formatPercentage(diffPercent - feesPercentTotal)}`);

        // Display order book information if available
        if (orderbookSnapshot) {
            console.log(`   - Orderbook at Open:`);
            console.log(`     * ${buyExchangeId} Best Ask: ${FormattingUtils.formatPrice(orderbookSnapshot.buyBestAsk.price)} x ${FormattingUtils.formatVolume(orderbookSnapshot.buyBestAsk.amount)}`);
            console.log(`     * ${sellExchangeId} Best Bid: ${FormattingUtils.formatPrice(orderbookSnapshot.sellBestBid.price)} x ${FormattingUtils.formatVolume(orderbookSnapshot.sellBestBid.price)}`);
        }
        console.log(`   - Open Time: ${new Date().toISOString()}`);
    }
}

/**
 * Attempts to close an open arbitrage position when closing conditions are met
 * 
 * Closing Strategy:
 * - Monitor current market conditions
 * - Close when profit target is reached or stop-loss is triggered
 * - Calculate actual profit/loss including fees
 * - Update statistics and clean up position data
 * 
 * @param {string} symbol - Trading symbol to check for positions
 * @param {number} buyPriceNow - Current buy price in the market
 * @param {number} sellPriceNow - Current sell price in the market
 */
export async function tryClosePosition(symbol, buyPriceNow, sellPriceNow) {
    // Check all open arbitrage positions for the given symbol
    for (const [arbitrageId, position] of openPositions.entries()) {
        if (position.symbol !== symbol) continue;

        // Calculate current price difference in the market
        const currentDiffPercent = CalculationUtils.calculatePriceDifference(buyPriceNow, sellPriceNow);

        // Calculate current profit/loss based on original arbitrage opportunity
        const originalDiffPercent = CalculationUtils.calculatePriceDifference(position.buyPrice, position.sellPrice);
        const currentProfitPercent = originalDiffPercent - currentDiffPercent;

        // Calculate total fees for both exchanges
        const totalFees =
            config.feesPercent[position.buyExchangeId] +
            config.feesPercent[position.sellExchangeId];

        // Calculate net profit after deducting fees
        const netProfitPercent = currentProfitPercent - totalFees;

        // Determine if position should be closed based on profit threshold
        const shouldClose = currentDiffPercent <= config.closeThresholdPercent;

        if (shouldClose) {
            const closeTime = new Date().toISOString();

            // Calculate actual profit/loss in USD
            const actualProfitUSD = (netProfitPercent / 100) * config.tradeVolumeUSD * 2; // Both sides
            tradingState.totalProfit += actualProfitUSD;
            tradingState.lastTradeProfit = actualProfitUSD;
            tradingState.totalTrades++;
            tradingState.totalInvestment -= position.totalInvestmentUSD;

            // Fetch latest order books to capture closing market conditions
            let orderbookSnapshotAtClose = null;
            if (exchangeManager.isInitialized()) {
                try {
                    const buyEx = exchangeManager.getExchange(position.buyExchangeId);
                    const sellEx = exchangeManager.getExchange(position.sellExchangeId);
                    const [buyOb, sellOb] = await Promise.all([
                        buyEx.fetchOrderBook(symbol),
                        sellEx.fetchOrderBook(symbol)
                    ]);

                    // Extract current best prices at closing
                    const buyBestAskNow = buyOb.asks && buyOb.asks[0] ? {
                        price: buyOb.asks[0][0],
                        amount: buyOb.asks[0][1]
                    } : null;
                    const sellBestBidNow = sellOb.bids && sellOb.bids[0] ? {
                        price: sellOb.bids[0][0],
                        amount: sellOb.bids[0][1]
                    } : null;

                    orderbookSnapshotAtClose = {
                        buyExchange: position.buyExchangeId,
                        sellExchange: position.sellExchangeId,
                        buyBestAskNow,
                        sellBestBidNow
                    };
                } catch (error) {
                    // If order book fetch fails, continue without snapshot
                    console.log(`⚠️ Failed to fetch order book at closing`);
                }
            }

            // Log the arbitrage position closing with comprehensive details
            await logger.logTrade("ARBITRAGE_CLOSE", symbol, {
                arbitrageId,
                buyExchangeId: position.buyExchangeId,
                sellExchangeId: position.sellExchangeId,
                originalBuyPrice: position.buyPrice, // Price when position was opened
                originalSellPrice: position.sellPrice, // Price when position was opened
                currentBuyPrice: buyPriceNow, // Current market price
                currentSellPrice: sellPriceNow, // Current market price
                volume: position.volume,
                buyAmount: position.volume, // Amount that was bought
                sellAmount: position.volume, // Amount that was sold
                originalDiffPercent: FormattingUtils.formatPercentage(originalDiffPercent),
                currentDiffPercent: FormattingUtils.formatPercentage(currentDiffPercent),
                netProfitPercent: FormattingUtils.formatPercentage(netProfitPercent),
                actualProfitUSD: FormattingUtils.formatCurrency(actualProfitUSD),
                totalFees: FormattingUtils.formatPercentage(totalFees),
                durationMs: new Date(closeTime).getTime() - new Date(position.openTime).getTime(), // Position duration
                closeReason: currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered',
                tradeNumber: tradingState.totalTrades,
                details: {
                    closeTime,
                    orderbookAtClose: orderbookSnapshotAtClose // Order book snapshot at closing
                }
            });

            // Record trade closing in statistics for monitoring
            statistics.recordTradeClose({
                actualProfitUSD: actualProfitUSD,
                volume: position.volume,
                buyPriceOpen: position.buyPrice,
                feesPercent: totalFees
            });

            // Display trade closing information in console
            console.log(
                `📉 [ARBITRAGE_CLOSE] ${symbol} | Original Diff:${FormattingUtils.formatPercentage(originalDiffPercent)} | Current Diff:${FormattingUtils.formatPercentage(currentDiffPercent)} | ` +
                `Net Profit:${FormattingUtils.formatPercentage(netProfitPercent)} | P&L:${FormattingUtils.formatCurrency(actualProfitUSD)} | ` +
                `Reason: ${currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered'}`
            );

            // Display detailed closing information for monitoring
            console.log(`📊 [CLOSE_DETAILS] Arbitrage ID: ${arbitrageId}`);
            console.log(`   - Original Buy Price: ${FormattingUtils.formatPrice(position.buyPrice)} from ${position.buyExchangeId}`);
            console.log(`   - Original Sell Price: ${FormattingUtils.formatPrice(position.sellPrice)} to ${position.sellExchangeId}`);
            console.log(`   - Current Buy Price: ${FormattingUtils.formatPrice(buyPriceNow)}`);
            console.log(`   - Current Sell Price: ${FormattingUtils.formatPrice(sellPriceNow)}`);
            console.log(`   - Volume: ${FormattingUtils.formatVolume(position.volume)}`);
            console.log(`   - Original Price Difference: ${FormattingUtils.formatPercentage(originalDiffPercent)}`);
            console.log(`   - Current Price Difference: ${FormattingUtils.formatPercentage(currentDiffPercent)}`);
            console.log(`   - Gross Profit Percent: ${FormattingUtils.formatPercentage(currentProfitPercent)}`);
            console.log(`   - Total Fees: ${FormattingUtils.formatPercentage(totalFees)}`);
            console.log(`   - Net Profit Percent: ${FormattingUtils.formatPercentage(netProfitPercent)}`);
            console.log(`   - Actual Profit USD: ${FormattingUtils.formatCurrency(actualProfitUSD)}`);
            console.log(`   - Close Reason: ${currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered'}`);
            console.log(`   - Close Time: ${closeTime}`);

            // Display order book information at closing if available
            if (orderbookSnapshotAtClose) {
                console.log(`   - Orderbook at Close:`);
                console.log(`     * ${position.buyExchangeId} Best Ask: ${FormattingUtils.formatPrice(orderbookSnapshotAtClose.buyBestAskNow.price)} x ${FormattingUtils.formatVolume(orderbookSnapshotAtClose.buyBestAskNow.amount)}`);
                console.log(`     * ${position.sellExchangeId} Best Bid: ${FormattingUtils.formatPrice(orderbookSnapshotAtClose.sellBestBidNow.price)} x ${FormattingUtils.formatVolume(orderbookSnapshotAtClose.sellBestBidNow.amount)}`);
            }

            // Remove the closed position and update global state
            openPositions.delete(arbitrageId);
            tradingState.isAnyPositionOpen = false;

            // Display trade summary for monitoring
            console.log(`📈 [SUMMARY] Arbitrage Trade #${tradingState.totalTrades} closed:`);
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
 * Get current trading status for monitoring and display
 * 
 * @returns {object} Current trading status including:
 *   - isAnyPositionOpen: Whether any position is currently open
 *   - totalProfit: Cumulative profit/loss across all trades
 *   - totalTrades: Total number of completed trades
 *   - lastTradeProfit: Profit/loss from most recent trade
 *   - totalInvestment: Total amount currently invested
 *   - openPositionsCount: Number of open positions
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