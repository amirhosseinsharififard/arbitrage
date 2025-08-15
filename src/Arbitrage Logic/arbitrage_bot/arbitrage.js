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
import { CalculationUtils, FormattingUtils, computeSpreads } from "../utils/index.js";
import chalk from "chalk";
import { ourbitPriceService } from "../services/index.js";
import exchangeManager from "../exchanges/exchangeManager.js";

/**
 * Global storage for open arbitrage positions
 * Key: arbitrageId (e.g., "lbank-mexc" for LBANK->MEXC arbitrage)
 * Value: Complete position object with all trade details
 */
export const openPositions = new Map();
// Track last observed lbankBidVsMexcAskPct per position to close only on crossing
const lastCloseDiffByPosition = new Map();

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
            // Start from requested per-trade chunk; final volume will be capped by remaining global allowance and liquidity
            volume = config.targetTokenQuantity;
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
        // In TOKEN mode, further cap this trade's volume by remaining allowance
        if (config.tradingMode === "TOKEN") {
            volume = Math.min(volume, remainingAllowedTokens);
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
                        // For token-based trading, ensure we don't exceed available liquidity and remaining allowance
                        const maxVolumeFromLiquidity = Math.min(buyBestAsk.amount, sellBestBid.amount);
                        volume = Math.min(volume, maxVolumeFromLiquidity, remainingAllowedTokens);
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

        // No minimum token quantity enforcement; proceed with any positive volume allowed by liquidity and caps

        // Calculate financial metrics for the position
        const buyCostUSD = volume * buyPrice; // Notional on buy leg
        const sellProceedsUSD = volume * sellPrice; // Notional on sell leg
        // Investment base for P&L percent: use buy notional to avoid double counting
        totalInvestmentUSD = buyCostUSD;

        // Fees and expected profits
        const feeBuyPercent = config.feesPercent[buyExchangeId] || 0;
        const feeSellPercent = config.feesPercent[sellExchangeId] || 0;
        const feesPercentTotal = feeBuyPercent + feeSellPercent;
        const estimatedFeesUSD = (feeBuyPercent / 100) * buyCostUSD + (feeSellPercent / 100) * sellProceedsUSD;
        const expectedGrossProfitUSD = sellProceedsUSD - buyCostUSD;
        const expectedProfitUSD = expectedGrossProfitUSD - estimatedFeesUSD; // net expected profit

        // feesPercentTotal already computed above

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
            buyCostUSD: buyCostUSD, // raw number for analytics
            sellProceedsUSD: sellProceedsUSD, // raw number for analytics
            diffPercent: FormattingUtils.formatPercentage(diffPercent),
            totalInvestmentUSD: totalInvestmentUSD,
            expectedProfitUSD: expectedProfitUSD,
            tradingMode: config.tradingMode, // Log the trading mode used
            targetTokenQuantity: config.tradingMode === "TOKEN" ? config.targetTokenQuantity : null,
            details: {
                openTime: new Date().toISOString(),
                orderbookAtOpen: orderbookSnapshot, // Order book snapshot at opening
                profitBreakdown: {
                    grossDiffPercent: diffPercent,
                    feesPercentTotal: feesPercentTotal,
                    netExpectedDiffPercent: (diffPercent - feesPercentTotal),
                    estimatedFeesUSD: estimatedFeesUSD,
                    expectedGrossProfitUSD: expectedGrossProfitUSD,
                    expectedNetProfitUSD: expectedProfitUSD,
                    buyNotionalUSD: buyCostUSD,
                    sellNotionalUSD: sellProceedsUSD,
                    totalNotionalUSD: (buyCostUSD + sellProceedsUSD)
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
            console.log(`     * ${sellExchangeId} Best Bid: ${FormattingUtils.formatPrice(orderbookSnapshot.sellBestBid.price)} x ${FormattingUtils.formatVolume(orderbookSnapshot.sellBestBid.amount)}`);
        }
        console.log(`   - Open Time: ${new Date().toISOString()}`);
    }
}

/**
 * Attempts to close an open arbitrage position when closing conditions are met
 * 
 * Closing Strategy:
 * - Monitor current market conditions
 * - Close when profit target is reached
 * - Calculate actual profit/loss including fees
 * - Update statistics and clean up position data
 * 
 * @param {string} symbol - Trading symbol to check for positions
 * @param {number} buyPriceNow - Current buy price in the market
 * @param {number} sellPriceNow - Current sell price in the market
 */
    export async function tryClosePosition(symbol, buyPriceNow, sellPriceNow) {
        const { mexcAskVsLbankBidPct } = computeSpreads({ lbankBid: buyPriceNow, mexcAsk: sellPriceNow });
        const closeThreshold = -Math.abs(Number(config.scenarios.alireza.closeAtPercent));
        const currentDiffPercent = Number(CalculationUtils.calculatePriceDifference(buyPriceNow, sellPriceNow));
        const positionsToClose = [];
        for (const [arbitrageId, position] of openPositions.entries()) {
            if (position.symbol !== symbol) continue;
            const originalDiffPercent = CalculationUtils.calculatePriceDifference(position.buyPrice, position.sellPrice);
            const currentProfitPercent = originalDiffPercent - currentDiffPercent;
            const totalFees = (config.feesPercent[position.buyExchangeId] || 0) + (config.feesPercent[position.sellExchangeId] || 0);
            const netProfitPercent = currentProfitPercent - totalFees;
            const shouldClose = mexcAskVsLbankBidPct != null && mexcAskVsLbankBidPct >= closeThreshold;
            if (shouldClose) positionsToClose.push({ arbitrageId, position, originalDiffPercent, totalFees, netProfitPercent });
        }
        if (positionsToClose.length === 0 && openPositions.size > 0) {
            console.log(`${chalk.yellow('⏳')} ${FormattingUtils.label('CLOSE_CHECK')} No positions meet closing criteria. ${chalk.gray('Monitoring...')}`);
            return;
        }
        if (positionsToClose.length > 0) {
            console.log(`🎯 [CLOSE_READY] Found ${positionsToClose.length} positions to close`);
        }
        if (positionsToClose.length > 0) {
            const closeTime = new Date().toISOString();
            const results = positionsToClose.map(({ arbitrageId, position, originalDiffPercent, totalFees, netProfitPercent }) => {
                const currentProfitPercent = originalDiffPercent - currentDiffPercent;
                const finalNetProfitPercent = currentProfitPercent - totalFees;
                const actualProfitUSD = (finalNetProfitPercent / 100) * position.totalInvestmentUSD;
                return { arbitrageId, position, originalDiffPercent, currentDiffPercent, currentProfitPercent, totalFees, netProfitPercent: finalNetProfitPercent, actualProfitUSD };
            });
            const batchProfit = results.reduce((a, r) => a + r.actualProfitUSD, 0);
            const batchInvestment = results.reduce((a, r) => a + r.position.totalInvestmentUSD, 0);
            tradingState.totalProfit += batchProfit;
            tradingState.lastTradeProfit = results[results.length - 1].actualProfitUSD;
            tradingState.totalTrades += results.length;
            tradingState.totalInvestment -= batchInvestment;
            for (const r of results) {
                openPositions.delete(r.arbitrageId);
                lastCloseDiffByPosition.delete(r.arbitrageId);
            }
            tradingState.isAnyPositionOpen = openPositions.size > 0;
            await Promise.all(results.map(r => logger.logTrade("ARBITRAGE_CLOSE", symbol, {
                arbitrageId: r.arbitrageId,
                buyExchangeId: r.position.buyExchangeId,
                sellExchangeId: r.position.sellExchangeId,
                originalBuyPrice: r.position.buyPrice,
                originalSellPrice: r.position.sellPrice,
                currentBuyPrice: buyPriceNow,
                currentSellPrice: sellPriceNow,
                volume: r.position.volume,
                buyAmount: r.position.volume,
                sellAmount: r.position.volume,
                originalDiffPercent: r.originalDiffPercent,
                currentDiffPercent: r.currentDiffPercent,
                netProfitPercent: r.netProfitPercent,
                actualProfitUSD: r.actualProfitUSD,
                totalInvestmentUSD: r.position.totalInvestmentUSD,
                totalFees: r.totalFees,
                durationMs: new Date(closeTime).getTime() - new Date(r.position.openTime).getTime(),
                closeReason: 'Target profit reached',
                tradeNumber: tradingState.totalTrades,
                tradingMode: r.position.tradingMode,
                targetTokenQuantity: r.position.targetTokenQuantity,
                details: { closeTime, orderbookAtClose: null }
            })));
            console.log(`📉 [ARBITRAGE_CLOSE_BATCH] Closed ${results.length} positions | Diff: ${FormattingUtils.formatPercentageColored(currentDiffPercent)} | Total P&L: ${FormattingUtils.formatCurrencyColored(batchProfit)}`);
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

/**
 * Restore open positions from trades.log file
 * This function reads the log file and restores any positions that were opened but not closed
 */
export function restoreOpenPositionsFromLog() {
    try {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(process.cwd(), 'trades.log');
        
        if (!fs.existsSync(logFile)) {
            console.log('📄 No trades.log file found, starting with empty positions');
            return;
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        
        let restoredCount = 0;
        const openedPositions = new Map();
        const closedPositions = new Set();

        // Parse all log entries
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                
                if (entry.action === 'ARBITRAGE_OPEN') {
                    openedPositions.set(entry.arbitrageId, {
                        arbitrageId: entry.arbitrageId,
                        symbol: entry.symbol,
                        buyExchangeId: entry.buyExchangeId,
                        sellExchangeId: entry.sellExchangeId,
                        buyPrice: entry.buyPrice,
                        sellPrice: entry.sellPrice,
                        volume: entry.volume,
                        buyAmount: entry.buyAmount,
                        sellAmount: entry.sellAmount,
                        buyCostUSD: entry.buyCostUSD,
                        sellProceedsUSD: entry.sellProceedsUSD,
                        diffPercent: entry.diffPercent,
                        totalInvestmentUSD: entry.totalInvestmentUSD,
                        expectedProfitUSD: entry.expectedProfitUSD,
                        tradingMode: entry.tradingMode,
                        targetTokenQuantity: entry.targetTokenQuantity,
                        openTime: entry.timestamp,
                        details: entry.details
                    });
                } else if (entry.action === 'ARBITRAGE_CLOSE') {
                    closedPositions.add(entry.arbitrageId);
                }
            } catch (parseError) {
                // Skip invalid JSON lines
                continue;
            }
        }

        // Restore positions that were opened but not closed
        for (const [arbitrageId, position] of openedPositions.entries()) {
            if (!closedPositions.has(arbitrageId)) {
                openPositions.set(arbitrageId, position);
                restoredCount++;
                
                // Update trading state
                tradingState.isAnyPositionOpen = true;
                tradingState.totalInvestment += position.totalInvestmentUSD;
                
                console.log(`🔄 Restored position: ${arbitrageId} | Volume: ${position.volume} | Investment: $${position.totalInvestmentUSD}`);
            }
        }

        if (restoredCount > 0) {
            console.log(`✅ Restored ${restoredCount} open positions from trades.log`);
        } else {
            console.log('📄 No open positions found in trades.log');
        }
        
    } catch (error) {
        console.log(`⚠️ Error restoring positions from log: ${error.message}`);
    }
}