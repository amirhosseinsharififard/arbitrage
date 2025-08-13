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
        // Collect arbitrageIds to close in this pass to allow simultaneous closures
        const positionsToClose = [];
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

            // Close based on current spread vs configured threshold
            // currentDiffPercent here corresponds to lbankBidVsMexcAskPct
            const shouldClose = currentDiffPercent >= config.scenarios.alireza.closeAtPercent;

            if (shouldClose) {
                console.log(`🔍 [CLOSE_ANALYSIS] Position ${arbitrageId}:`);
                console.log(`   - Current Diff (lbankBidVsMexcAskPct): ${FormattingUtils.formatPercentage(currentDiffPercent)}`);
                console.log(`   - Threshold: ${config.scenarios.alireza.closeAtPercent}%`);
                positionsToClose.push({ arbitrageId, position });
            }
        }

        // Log if no positions are being closed
        if (positionsToClose.length === 0 && openPositions.size > 0) {
            console.log(`⏳ [CLOSE_CHECK] No positions meet closing criteria. Continuing to monitor...`);
        }

        // Process closures (can be multiple) after iteration to avoid mutating the map during iteration
        if (positionsToClose.length > 0) {
            console.log(`🎯 [CLOSE_ACTION] Closing ${positionsToClose.length} position(s) based on market conditions`);
        }
        
        for (const { arbitrageId, position } of positionsToClose) {
            const closeTime = new Date().toISOString();

            // Recompute for this position using current prices
            const originalDiffPercent = CalculationUtils.calculatePriceDifference(position.buyPrice, position.sellPrice);
            const currentDiffPercent = CalculationUtils.calculatePriceDifference(buyPriceNow, sellPriceNow);
            const currentProfitPercent = originalDiffPercent - currentDiffPercent;
            const totalFees = config.feesPercent[position.buyExchangeId] + config.feesPercent[position.sellExchangeId];
            const netProfitPercent = currentProfitPercent - totalFees;
            const actualProfitUSD = (netProfitPercent / 100) * position.totalInvestmentUSD;

            // Update trading state with actual profit/loss
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
                    console.log(`⚠️ Failed to fetch order book at closing`);
                }
            }

            await logger.logTrade("ARBITRAGE_CLOSE", symbol, {
                arbitrageId,
                buyExchangeId: position.buyExchangeId,
                sellExchangeId: position.sellExchangeId,
                originalBuyPrice: position.buyPrice,
                originalSellPrice: position.sellPrice,
                currentBuyPrice: buyPriceNow,
                currentSellPrice: sellPriceNow,
                volume: position.volume,
                buyAmount: position.volume,
                sellAmount: position.volume,
                originalDiffPercent: FormattingUtils.formatPercentage(originalDiffPercent),
                currentDiffPercent: FormattingUtils.formatPercentage(currentDiffPercent),
                netProfitPercent: FormattingUtils.formatPercentage(netProfitPercent),
                actualProfitUSD: FormattingUtils.formatCurrency(actualProfitUSD),
                totalInvestmentUSD: FormattingUtils.formatCurrency(position.totalInvestmentUSD),
                totalFees: FormattingUtils.formatPercentage(totalFees),
                durationMs: new Date(closeTime).getTime() - new Date(position.openTime).getTime(),
                closeReason: 'Target profit reached',
                tradeNumber: tradingState.totalTrades,
                tradingMode: position.tradingMode,
                targetTokenQuantity: position.targetTokenQuantity,
                details: {
                    closeTime,
                    orderbookAtClose: orderbookSnapshotAtClose,
                    profitCalculation: {
                        formula: "actualProfitUSD = TotalInvestmentUSD * (netProfitPercent / 100)",
                        totalInvestmentUSD: position.totalInvestmentUSD,
                        netProfitPercent: netProfitPercent,
                        calculatedProfit: actualProfitUSD
                    }
                }
            });

            const modeIndicator = position.tradingMode === "TOKEN" ? `[TOKEN:${position.targetTokenQuantity}]` : `[USD:${config.tradeVolumeUSD}]`;
            console.log(
                `📉 [ARBITRAGE_CLOSE] ${symbol} ${modeIndicator} | Original Diff:${FormattingUtils.formatPercentage(originalDiffPercent)} | Current Diff:${FormattingUtils.formatPercentage(currentDiffPercent)} | ` +
                `Net Profit:${FormattingUtils.formatPercentage(netProfitPercent)} | P&L:${FormattingUtils.formatCurrency(actualProfitUSD)} | ` +
                `Reason: Target profit reached`
            );

            console.log(`📊 [CLOSE_DETAILS] Arbitrage ID: ${arbitrageId}`);
            console.log(`   - Trading Mode: ${position.tradingMode}${position.tradingMode === "TOKEN" ? ` (Target: ${position.targetTokenQuantity} tokens)` : ''}`);
            console.log(`   - Original Buy Price: ${FormattingUtils.formatPrice(position.buyPrice)} from ${position.buyExchangeId}`);
            console.log(`   - Original Sell Price: ${FormattingUtils.formatPrice(position.sellPrice)} to ${position.sellExchangeId}`);
            console.log(`   - Current Buy Price: ${FormattingUtils.formatPrice(buyPriceNow)}`);
            console.log(`   - Current Sell Price: ${FormattingUtils.formatPrice(sellPriceNow)}`);
            console.log(`   - Volume: ${FormattingUtils.formatVolume(position.volume)} tokens (actual count, not scaled)`);
            console.log(`   - Original Price Difference: ${FormattingUtils.formatPercentage(originalDiffPercent)}`);
            console.log(`   - Current Price Difference: ${FormattingUtils.formatPercentage(currentDiffPercent)}`);
            console.log(`   - Gross Profit Percent: ${FormattingUtils.formatPercentage(currentProfitPercent)}`);
            console.log(`   - Total Fees: ${FormattingUtils.formatPercentage(totalFees)}`);
            console.log(`   - Net Profit Percent: ${FormattingUtils.formatPercentage(netProfitPercent)}`);
            console.log(`   - Total Investment: ${FormattingUtils.formatCurrency(position.totalInvestmentUSD)}`);
            console.log(`   - Actual Profit USD: ${FormattingUtils.formatCurrency(actualProfitUSD)} (calculated correctly)`);
            console.log(`   - Close Reason: Target profit reached`);
            console.log(`   - Close Time: ${closeTime}`);

            // Remove the closed position and update global state
            openPositions.delete(arbitrageId);
            tradingState.isAnyPositionOpen = openPositions.size > 0;

            console.log(`📈 [SUMMARY] Arbitrage Trade #${tradingState.totalTrades} closed:`);
            console.log(`   - This trade P&L: ${FormattingUtils.formatCurrency(actualProfitUSD)} (calculated correctly)`);
            console.log(`   - Total P&L so far: ${FormattingUtils.formatCurrency(tradingState.totalProfit)}`);
            console.log(`   - Total trades: ${tradingState.totalTrades}`);
            console.log(`   - Close reason: Target profit reached`);
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