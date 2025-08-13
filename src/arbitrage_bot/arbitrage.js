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
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return `${buyExchangeId}-${sellExchangeId}-${uniqueSuffix}`;
}

/**
 * Calculates the total token quantity across all open positions
 * Used to enforce global maxTokenQuantity cap
 *
 * @returns {number} Sum of volumes (tokens) across all open positions
 */
function getTotalOpenTokenQuantity() {
    let total = 0;
    for (const [, position] of openPositions.entries()) {
        total += Number(position.volume) || 0;
    }
    return total;
}

/**
 * Attempts to open a new arbitrage position when profitable conditions are met
 * 
 * Trading Strategy:
 * - Buy at LBANK ask price (lower price)
 * - Sell at MEXC bid price (higher price)
 * - Only open if profit threshold is met
 * - Calculate optimal volume based on available liquidity
 * - Support both USD-based and token quantity-based trading modes
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

    // Calculate price difference percentage between the two exchanges
    // Positive value means profitable opportunity (sell price > buy price)
    const diffPercent = CalculationUtils.calculatePriceDifference(buyPrice, sellPrice);

    // Only proceed if profit threshold is met
    if (diffPercent >= config.profitThresholdPercent) {
        let volume, investmentPerSide, totalInvestmentUSD;

        // Determine trading mode and calculate volume accordingly
        if (config.tradingMode === "TOKEN") {
            // Token quantity-based trading
            volume = config.targetTokenQuantity; // Use specified token quantity
            investmentPerSide = volume * buyPrice; // Calculate USD needed for this token quantity
            totalInvestmentUSD = investmentPerSide * 2; // Total across both sides
        } else {
            // USD-based trading (default)
            investmentPerSide = config.tradeVolumeUSD / 2; // We invest $100 on each side
            volume = investmentPerSide / buyPrice; // Volume based on buy price
            totalInvestmentUSD = config.tradeVolumeUSD; // Total investment amount
        }

        // Enforce per-trade token limits based on configuration (preliminary)
        // Initial volume determination will be further capped by liquidity and global cap later
        if (config.tradingMode !== "TOKEN") {
            // For USD mode, we'll validate after liquidity adjustments
        } else {
            // For TOKEN mode, ensure preliminary volume obeys per-trade max
            volume = Math.min(volume, config.maxTokenQuantity);
        }

        // Enforce global max token quantity across all open positions
        const currentOpenTokens = getTotalOpenTokenQuantity();
        const remainingAllowedTokens = Math.max(0, config.maxTokenQuantity - currentOpenTokens);
        if (remainingAllowedTokens <= 0) {
            console.log(`⛔ [OPEN_BLOCKED] Global token cap reached (${currentOpenTokens}/${config.maxTokenQuantity}). Skipping open.`);
            return;
        }

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
                    if (config.tradingMode === "TOKEN") {
                        // For token-based trading, ensure we don't exceed available liquidity
                        const maxVolumeFromLiquidity = Math.min(buyBestAsk.amount, sellBestBid.amount);
                        volume = Math.min(volume, maxVolumeFromLiquidity);
                        // Recalculate investment based on actual volume
                        investmentPerSide = volume * buyPrice;
                        totalInvestmentUSD = investmentPerSide * 2;
                    } else {
                        // USD-based trading: calculate volume based on $100 investment on buy side
                        const buyVolume = investmentPerSide / buyBestAsk.price;
                        // Calculate volume based on $100 investment on sell side  
                        const sellVolume = investmentPerSide / sellBestBid.price;
                        // Use the smaller volume to ensure both sides can be executed
                        volume = Math.min(buyVolume, sellVolume, buyBestAsk.amount, sellBestBid.amount);
                    }
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

        // Apply per-trade and global caps post-liquidity
        const perTradeMax = Math.min(config.maxTokenQuantity, remainingAllowedTokens);
        volume = Math.min(volume, perTradeMax);

        // Enforce minimum token quantity per trade
        if (volume < config.minTokenQuantity) {
            console.log(`⛔ [OPEN_BLOCKED] Volume ${FormattingUtils.formatVolume(volume)} below minimum per-trade quantity ${config.minTokenQuantity}. Skipping open.`);
            return;
        }

        // Calculate financial metrics for the position
        const buyCostUSD = volume * buyPrice; // Total cost to buy the asset
        const sellProceedsUSD = volume * sellPrice; // Total proceeds from selling
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
            volume, // Trade volume in asset units (actual token count)
            openTime: new Date().toISOString(), // Timestamp when position was opened
            totalInvestmentUSD, // Total notional value of the position
            expectedProfitUSD, // Expected profit based on price difference
            buyOrderId: null, // Will be filled when buy order is placed
            sellOrderId: null, // Will be filled when sell order is placed
            status: 'OPENING', // Current position status
            tradingMode: config.tradingMode, // USD or TOKEN based trading
            targetTokenQuantity: config.tradingMode === "TOKEN" ? config.targetTokenQuantity : null // Target tokens if applicable
        };

        // Store the position and update global state
        openPositions.set(arbitrageId, position);
        tradingState.isAnyPositionOpen = openPositions.size > 0;
        tradingState.totalInvestment += totalInvestmentUSD;

        // Log the arbitrage position opening with comprehensive details
        await logger.logTrade("ARBITRAGE_OPEN", symbol, {
            arbitrageId,
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume, // Actual token count (not scaled)
            buyAmount: volume, // Amount to buy
            sellAmount: volume, // Amount to sell
            buyCostUSD: FormattingUtils.formatCurrency(buyCostUSD), // Cost to buy
            sellProceedsUSD: FormattingUtils.formatCurrency(sellProceedsUSD), // Proceeds from sell
            diffPercent: FormattingUtils.formatPercentage(diffPercent),
            totalInvestmentUSD: FormattingUtils.formatCurrency(totalInvestmentUSD),
            expectedProfitUSD: FormattingUtils.formatCurrency(expectedProfitUSD),
            tradingMode: config.tradingMode, // Log the trading mode used
            targetTokenQuantity: config.tradingMode === "TOKEN" ? config.targetTokenQuantity : null,
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
        const modeIndicator = config.tradingMode === "TOKEN" ? `[TOKEN:${config.targetTokenQuantity}]` : `[USD:${config.tradeVolumeUSD}]`;
        console.log(
            `🎯 [ARBITRAGE_OPEN] ${symbol} ${modeIndicator} | Buy@${FormattingUtils.formatPrice(buyPrice)} from ${buyExchangeId} | Sell@${FormattingUtils.formatPrice(sellPrice)} to ${sellExchangeId} | ` +
            `Vol:${FormattingUtils.formatVolume(volume)} | Diff:${FormattingUtils.formatPercentage(diffPercent)} | Investment:${FormattingUtils.formatCurrency(totalInvestmentUSD)} | ` +
            `Expected Profit:${FormattingUtils.formatCurrency(expectedProfitUSD)}`
        );

        // Display detailed position information for monitoring
        console.log(`📊 [POSITION_DETAILS] Arbitrage ID: ${arbitrageId}`);
        console.log(`   - Trading Mode: ${config.tradingMode}${config.tradingMode === "TOKEN" ? ` (Target: ${config.targetTokenQuantity} tokens)` : ''}`);
        console.log(`   - Buy Exchange: ${buyExchangeId} @ ${FormattingUtils.formatPrice(buyPrice)}`);
        console.log(`   - Sell Exchange: ${sellExchangeId} @ ${FormattingUtils.formatPrice(sellPrice)}`);
        console.log(`   - Volume: ${FormattingUtils.formatVolume(volume)} tokens (actual count, not scaled)`);
        console.log(`   - Buy Amount: ${FormattingUtils.formatVolume(volume)} | Sell Amount: ${FormattingUtils.formatVolume(volume)}`);
        console.log(`   - Price Difference: ${FormattingUtils.formatPercentage(diffPercent)}`);
        console.log(`   - Buy Cost: ${FormattingUtils.formatCurrency(buyCostUSD)} | Sell Proceeds: ${FormattingUtils.formatCurrency(sellProceedsUSD)}`);
        console.log(`   - Total Investment: ${FormattingUtils.formatCurrency(totalInvestmentUSD)} | Est. Fees: ${FormattingUtils.formatCurrency(estimatedFeesUSD)}`);
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
        openPositionsCount: openPositions.size,
        totalOpenTokens: (() => {
            let total = 0;
            for (const [, p] of openPositions.entries()) total += Number(p.volume) || 0;
            return total;
        })()
    };
}

/**
 * Handles token quantity-based trading continuation
 * 
 * This function allows the system to continue buying/selling if the total quantity
 * doesn't match the target quantity, based on available account balance and
 * existing trading conditions and percentages.
 * 
 * @param {string} symbol - Trading symbol to check for continuation opportunities
 * @param {string} buyExchangeId - Exchange to buy from
 * @param {string} sellExchangeId - Exchange to sell to
 * @param {number} buyPrice - Current buy price
 * @param {number} sellPrice - Current sell price
 * @param {number} currentQuantity - Current quantity already acquired
 * @param {number} targetQuantity - Target quantity to achieve
 * @param {number} availableBalance - Available balance in the account
 */
export async function tryContinueTokenQuantityTrading(
    symbol,
    buyExchangeId,
    sellExchangeId,
    buyPrice,
    sellPrice,
    currentQuantity,
    targetQuantity,
    availableBalance
) {
    // Only proceed if we're in token quantity mode and have a shortfall
    if (config.tradingMode !== "TOKEN" || currentQuantity >= targetQuantity) {
        return;
    }

    // Calculate remaining quantity needed
    const remainingQuantity = targetQuantity - currentQuantity;
    
    // Calculate required investment for remaining quantity
    const requiredInvestment = remainingQuantity * buyPrice;
    
    // Check if we have sufficient balance
    if (requiredInvestment > availableBalance) {
        console.log(`⚠️ [TOKEN_CONTINUATION] Insufficient balance for remaining ${remainingQuantity} tokens. Required: ${FormattingUtils.formatCurrency(requiredInvestment)}, Available: ${FormattingUtils.formatCurrency(availableBalance)}`);
        return;
    }

    // Check if profit conditions are still met
    const diffPercent = CalculationUtils.calculatePriceDifference(buyPrice, sellPrice);
    if (diffPercent < config.profitThresholdPercent) {
        console.log(`⚠️ [TOKEN_CONTINUATION] Profit threshold not met for continuation. Current diff: ${FormattingUtils.formatPercentage(diffPercent)}, Required: ${FormattingUtils.formatPercentage(config.profitThresholdPercent)}`);
        return;
    }

    // Calculate optimal volume for continuation (respect liquidity constraints)
    let continuationVolume = remainingQuantity;
    
    // Fetch order book to validate liquidity
    if (exchangeManager.isInitialized()) {
        try {
            const buyEx = exchangeManager.getExchange(buyExchangeId);
            const sellEx = exchangeManager.getExchange(sellExchangeId);
            
            const [buyOb, sellOb] = await Promise.all([
                buyEx.fetchOrderBook(symbol),
                sellEx.fetchOrderBook(symbol)
            ]);

            const buyBestAsk = buyOb.asks && buyOb.asks[0] ? buyOb.asks[0] : null;
            const sellBestBid = sellOb.bids && sellOb.bids[0] ? sellOb.bids[0] : null;

            if (buyBestAsk && sellBestBid) {
                // Limit continuation volume by available liquidity
                const maxVolumeFromLiquidity = Math.min(buyBestAsk[1], sellBestBid[1]);
                continuationVolume = Math.min(remainingQuantity, maxVolumeFromLiquidity);
                
                if (continuationVolume < remainingQuantity) {
                    console.log(`⚠️ [TOKEN_CONTINUATION] Limited by liquidity. Requested: ${remainingQuantity}, Available: ${continuationVolume}`);
                }
            }
        } catch (error) {
            console.log(`⚠️ [TOKEN_CONTINUATION] Failed to fetch order book, using requested volume`);
        }
    }

    // Calculate continuation investment
    const continuationInvestment = continuationVolume * buyPrice;
    
    // Log continuation attempt
    console.log(`🔄 [TOKEN_CONTINUATION] Continuing token quantity trading:`);
    console.log(`   - Symbol: ${symbol}`);
    console.log(`   - Current Quantity: ${FormattingUtils.formatVolume(currentQuantity)}`);
    console.log(`   - Target Quantity: ${FormattingUtils.formatVolume(targetQuantity)}`);
    console.log(`   - Remaining Needed: ${FormattingUtils.formatVolume(remainingQuantity)}`);
    console.log(`   - Continuation Volume: ${FormattingUtils.formatVolume(continuationVolume)}`);
    console.log(`   - Continuation Investment: ${FormattingUtils.formatCurrency(continuationInvestment)}`);
    console.log(`   - Buy Price: ${FormattingUtils.formatPrice(buyPrice)} | Sell Price: ${FormattingUtils.formatPrice(sellPrice)}`);
    console.log(`   - Price Difference: ${FormattingUtils.formatPercentage(diffPercent)}`);

    // Create continuation position
    const continuationPosition = {
        arbitrageId: `${generateArbitrageId(buyExchangeId, sellExchangeId)}-continuation-${Date.now()}`,
        symbol,
        buyExchangeId,
        sellExchangeId,
        buyPrice,
        sellPrice,
        volume: continuationVolume,
        openTime: new Date().toISOString(),
        totalInvestmentUSD: continuationInvestment * 2, // Both buy and sell sides
        expectedProfitUSD: (diffPercent / 100) * continuationInvestment * 2,
        buyOrderId: null,
        sellOrderId: null,
        status: 'CONTINUATION',
        tradingMode: 'TOKEN',
        targetTokenQuantity: continuationVolume,
        isContinuation: true,
        originalTargetQuantity: targetQuantity,
        accumulatedQuantity: currentQuantity + continuationVolume
    };

    // Store continuation position
    openPositions.set(continuationPosition.arbitrageId, continuationPosition);
    
    // Log continuation position opening
    await logger.logTrade("ARBITRAGE_OPEN", symbol, {
        arbitrageId: continuationPosition.arbitrageId,
        buyExchangeId,
        sellExchangeId,
        buyPrice,
        sellPrice,
        volume: continuationVolume,
        buyAmount: continuationVolume,
        sellAmount: continuationVolume,
        buyCostUSD: FormattingUtils.formatCurrency(continuationInvestment),
        sellProceedsUSD: FormattingUtils.formatCurrency(continuationVolume * sellPrice),
        diffPercent: FormattingUtils.formatPercentage(diffPercent),
        totalInvestmentUSD: FormattingUtils.formatCurrency(continuationPosition.totalInvestmentUSD),
        expectedProfitUSD: FormattingUtils.formatCurrency(continuationPosition.expectedProfitUSD),
        tradingMode: 'TOKEN',
        targetTokenQuantity: continuationVolume,
        isContinuation: true,
        originalTargetQuantity: targetQuantity,
        accumulatedQuantity: currentQuantity + continuationVolume,
        details: {
            openTime: new Date().toISOString(),
            continuationDetails: {
                reason: 'Token quantity continuation',
                currentQuantity,
                targetQuantity,
                remainingQuantity,
                continuationVolume
            }
        }
    });

    // Update trading state
    tradingState.totalInvestment += continuationPosition.totalInvestmentUSD;
    
    // Record in statistics
    statistics.recordTradeOpen({
        volume: continuationVolume,
        buyPrice
    });

    console.log(`✅ [TOKEN_CONTINUATION] Continuation position opened successfully`);
    console.log(`   - New Position ID: ${continuationPosition.arbitrageId}`);
    console.log(`   - Accumulated Quantity: ${FormattingUtils.formatVolume(currentQuantity + continuationVolume)} / ${FormattingUtils.formatVolume(targetQuantity)}`);
    console.log(`   - Ready for execution...`);
}