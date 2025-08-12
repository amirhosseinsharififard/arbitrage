import config from "../config/config.js";
import logger from "../logging/logger.js";
import statistics from "../monitoring/statistics.js";
import { CalculationUtils, FormattingUtils } from "../utils/index.js";
import { priceService } from "../services/index.js";
import exchangeManager from "../exchanges/exchangeManager.js";

// Map to store open arbitrage positions
export const openPositions = new Map();
// Key: arbitrageId (e.g., "lbank-mexc" for LBANK->MEXC arbitrage)
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

    // No trade limit (maxTrades=0 means unlimited)

    // Calculate price difference percentage between two exchanges
    const diffPercent = CalculationUtils.calculatePriceDifference(buyPrice, sellPrice);

    // Only open position if profit threshold is met
    if (diffPercent >= config.profitThresholdPercent) {
        // Calculate volume based on total investment amount ($200)
        // We want to invest $100 on each side (buy and sell)
        const investmentPerSide = config.tradeVolumeUSD / 2; // $100 per side
        let volume = investmentPerSide / buyPrice; // Volume based on buy price

        let orderbookSnapshot = null;
        if (config.arbitrage.useOrderBookVolume && exchangeManager.isInitialized()) {
            try {
                const buyEx = exchangeManager.getExchange(buyExchangeId);
                const sellEx = exchangeManager.getExchange(sellExchangeId);
                const [buyOb, sellOb] = await Promise.all([
                    buyEx.fetchOrderBook(symbol),
                    sellEx.fetchOrderBook(symbol)
                ]);

                // For opening: we BUY at buy exchange best ASK, and SELL at sell exchange best BID
                const buyBestAsk = buyOb.asks && buyOb.asks[0] ? { price: buyOb.asks[0][0], amount: buyOb.asks[0][1] } : null;
                const sellBestBid = sellOb.bids && sellOb.bids[0] ? { price: sellOb.bids[0][0], amount: sellOb.bids[0][1] } : null;

                // Calculate volume based on available liquidity and desired investment
                if (buyBestAsk && sellBestBid) {
                    // Calculate volume based on $100 investment on buy side
                    const buyVolume = investmentPerSide / buyBestAsk.price;
                    // Calculate volume based on $100 investment on sell side  
                    const sellVolume = investmentPerSide / sellBestBid.price;
                    // Use the smaller volume to ensure both sides can be executed
                    volume = Math.min(buyVolume, sellVolume, buyBestAsk.amount, sellBestBid.amount);
                }

                const sellBestAsk = sellOb.asks && sellOb.asks[0] ? { price: sellOb.asks[0][0], amount: sellOb.asks[0][1] } : null;
                const buyBestBid = buyOb.bids && buyOb.bids[0] ? { price: buyOb.bids[0][0], amount: buyOb.bids[0][1] } : null;
                orderbookSnapshot = {
                    buyExchange: buyExchangeId,
                    sellExchange: sellExchangeId,
                    buyBestAsk,
                    buyBestBid,
                    sellBestBid,
                    sellBestAsk
                };
            } catch {}
        }

        // Calculate total investment based on actual volume and prices
        const totalInvestmentUSD = (volume * buyPrice) + (volume * sellPrice);
        // Calculate expected profit based on price difference and actual investment
        const expectedProfitUSD = (diffPercent / 100) * totalInvestmentUSD;
        const feesPercentTotal = (config.feesPercent[buyExchangeId] || 0) + (config.feesPercent[sellExchangeId] || 0);
        const openDirectionDiffPercent = (orderbookSnapshot && orderbookSnapshot.buyBestAsk && orderbookSnapshot.sellBestBid) ?
            CalculationUtils.calculatePriceDifference(orderbookSnapshot.buyBestAsk.price, orderbookSnapshot.sellBestBid.price) :
            diffPercent;
        const oppositeDirectionDiffPercent = (orderbookSnapshot && orderbookSnapshot.sellBestAsk && orderbookSnapshot.buyBestBid) ?
            CalculationUtils.calculatePriceDifference(orderbookSnapshot.sellBestAsk.price, orderbookSnapshot.buyBestBid.price) :
            null;

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
            expectedProfitUSD: FormattingUtils.formatCurrency(expectedProfitUSD),
            details: {
                openTime: new Date().toISOString(),
                orderbookAtOpen: orderbookSnapshot,
                profitBreakdown: {
                    grossDiffPercent: FormattingUtils.formatPercentage(diffPercent),
                    feesPercentTotal: FormattingUtils.formatPercentage(feesPercentTotal),
                    netExpectedDiffPercent: FormattingUtils.formatPercentage(diffPercent - feesPercentTotal)
                },
                spreads: {
                    openDirection: FormattingUtils.formatPercentage(openDirectionDiffPercent),
                    oppositeDirection: oppositeDirectionDiffPercent != null ? FormattingUtils.formatPercentage(oppositeDirectionDiffPercent) : null
                }
            }
        });

        // Record trade opening in statistics
        statistics.recordTradeOpen({
            volume,
            buyPrice
        });

        console.log(
            `🎯 [ARBITRAGE_OPEN] ${symbol} | Buy@${FormattingUtils.formatPrice(buyPrice)} from ${buyExchangeId} | Sell@${FormattingUtils.formatPrice(sellPrice)} to ${sellExchangeId} | ` +
            `Vol:${FormattingUtils.formatVolume(volume)} | Diff:${FormattingUtils.formatPercentage(diffPercent)} | Investment:${FormattingUtils.formatCurrency(totalInvestmentUSD)} | ` +
            `Expected Profit:${FormattingUtils.formatCurrency(expectedProfitUSD)}`
        );

        // Display detailed position information
        console.log(`📊 [POSITION_DETAILS] Arbitrage ID: ${arbitrageId}`);
        console.log(`   - Buy Exchange: ${buyExchangeId} @ ${FormattingUtils.formatPrice(buyPrice)}`);
        console.log(`   - Sell Exchange: ${sellExchangeId} @ ${FormattingUtils.formatPrice(sellPrice)}`);
        console.log(`   - Volume: ${FormattingUtils.formatVolume(volume)}`);
        console.log(`   - Price Difference: ${FormattingUtils.formatPercentage(diffPercent)}`);
        console.log(`   - Total Investment: ${FormattingUtils.formatCurrency(totalInvestmentUSD)}`);
        console.log(`   - Expected Profit: ${FormattingUtils.formatCurrency(expectedProfitUSD)}`);
        console.log(`   - Fees Total: ${FormattingUtils.formatPercentage(feesPercentTotal)}`);
        console.log(`   - Net Expected Profit: ${FormattingUtils.formatPercentage(diffPercent - feesPercentTotal)}`);
        if (orderbookSnapshot) {
            console.log(`   - Orderbook at Open:`);
            console.log(`     * ${buyExchangeId} Best Ask: ${FormattingUtils.formatPrice(orderbookSnapshot.buyBestAsk.price)} x ${FormattingUtils.formatVolume(orderbookSnapshot.buyBestAsk.amount)}`);
            console.log(`     * ${sellExchangeId} Best Bid: ${FormattingUtils.formatPrice(orderbookSnapshot.sellBestBid.price)} x ${FormattingUtils.formatVolume(orderbookSnapshot.sellBestBid.price)}`);
        }
        console.log(`   - Open Time: ${new Date().toISOString()}`);
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

        // Position closing conditions for default scenario (Amir)
        const shouldClose = currentDiffPercent <= config.closeThresholdPercent;

        if (shouldClose) {
            const closeTime = new Date().toISOString();

            // Calculate actual profit/loss in USD
            const actualProfitUSD = (netProfitPercent / 100) * config.tradeVolumeUSD * 2; // Both sides
            tradingState.totalProfit += actualProfitUSD;
            tradingState.lastTradeProfit = actualProfitUSD;
            tradingState.totalTrades++;
            tradingState.totalInvestment -= position.totalInvestmentUSD;

            // Fetch latest order books to capture closing snapshot
            let orderbookSnapshotAtClose = null;
            if (exchangeManager.isInitialized()) {
                try {
                    const buyEx = exchangeManager.getExchange(position.buyExchangeId);
                    const sellEx = exchangeManager.getExchange(position.sellExchangeId);
                    const [buyOb, sellOb] = await Promise.all([
                        buyEx.fetchOrderBook(symbol),
                        sellEx.fetchOrderBook(symbol)
                    ]);
                    const buyBestAskNow = buyOb.asks && buyOb.asks[0] ? { price: buyOb.asks[0][0], amount: buyOb.asks[0][1] } : null;
                    const sellBestBidNow = sellOb.bids && sellOb.bids[0] ? { price: sellOb.bids[0][0], amount: sellOb.bids[0][1] } : null;
                    orderbookSnapshotAtClose = {
                        buyExchange: position.buyExchangeId,
                        sellExchange: position.sellExchangeId,
                        buyBestAskNow,
                        sellBestBidNow
                    };
                } catch {}
            }

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
                tradeNumber: tradingState.totalTrades,
                details: {
                    closeTime,
                    orderbookAtClose: orderbookSnapshotAtClose
                }
            });

            // Record trade closing in statistics
            statistics.recordTradeClose({
                actualProfitUSD: actualProfitUSD,
                volume: position.volume,
                buyPriceOpen: position.buyPrice,
                feesPercent: totalFees
            });

            console.log(
                `📉 [ARBITRAGE_CLOSE] ${symbol} | Original Diff:${FormattingUtils.formatPercentage(originalDiffPercent)} | Current Diff:${FormattingUtils.formatPercentage(currentDiffPercent)} | ` +
                `Net Profit:${FormattingUtils.formatPercentage(netProfitPercent)} | P&L:${FormattingUtils.formatCurrency(actualProfitUSD)} | ` +
                `Reason: ${currentDiffPercent <= config.closeThresholdPercent ? 'Target profit reached' : 'Stop loss triggered'}`
            );

            // Display detailed closing information
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
            if (orderbookSnapshotAtClose) {
                console.log(`   - Orderbook at Close:`);
                console.log(`     * ${position.buyExchangeId} Best Ask: ${FormattingUtils.formatPrice(orderbookSnapshotAtClose.buyBestAskNow.price)} x ${FormattingUtils.formatVolume(orderbookSnapshotAtClose.buyBestAskNow.amount)}`);
                console.log(`     * ${position.sellExchangeId} Best Bid: ${FormattingUtils.formatPrice(orderbookSnapshotAtClose.sellBestBidNow.price)} x ${FormattingUtils.formatVolume(orderbookSnapshotAtClose.sellBestBidNow.amount)}`);
            }

            // Remove the closed position
            openPositions.delete(arbitrageId);
            tradingState.isAnyPositionOpen = false;

            // Display trade summary
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