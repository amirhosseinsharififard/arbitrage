/**
 * Price monitoring and arbitrage opportunity detection
 * 
 * This module continuously monitors prices from multiple exchanges and:
 * 1. Fetches real-time bid/ask prices and order book data
 * 2. Calculates profit opportunities between exchanges
 * 3. Triggers position opening when profitable conditions are met
 * 4. Monitors open positions for closing opportunities
 * 5. Provides comprehensive market data display
 * 
 * Trading Strategy: Single-direction arbitrage (LBANK->MEXC only)
 * - Buy at LBANK ask price (lower price)
 * - Sell at MEXC bid price (higher price)
 * - Close when profit target is reached
 */

import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { priceService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";
import exchangeManager from "./exchanges/exchangeManager.js";

/**
 * Cache for storing last profit calculations to avoid duplicate logging
 * Prevents spam in console output when prices haven't changed
 */
const lastProfits = new Map();

/**
 * Logs profit information when positive arbitrage opportunity is detected
 * 
 * This function analyzes the profit potential between two exchanges and displays
 * detailed breakdown including gross profit, fees, and net profit after fees.
 * 
 * @param {string} label - Descriptive label for the exchange pair (e.g., "BUY=> LBANK & SELL=> MEXC")
 * @param {number} bidPrice - Current bid price at the sell exchange
 * @param {number} askPrice - Current ask price at the buy exchange
 * @param {number} feeBuyPercent - Trading fee percentage at buy exchange
 * @param {number} feeSellPercent - Trading fee percentage at sell exchange
 * @param {number} thresholdPercent - Minimum profit threshold to display (default from config)
 */
async function logPositiveProfit(
    label,
    bidPrice,
    askPrice,
    feeBuyPercent,
    feeSellPercent,
    thresholdPercent = config.arbitrage.defaultThresholdPercent
) {
    // Skip if prices are not available
    if (bidPrice == null || askPrice == null) return;

    // Calculate profit metrics
    const grossProfitPercent = CalculationUtils.calculatePriceDifference(bidPrice, askPrice);
    const totalFeesPercent = feeBuyPercent + feeSellPercent;
    const netProfitPercent = grossProfitPercent - totalFeesPercent;

    // Check if threshold filtering is enabled and skip if profit is below threshold
    if (config.arbitrage.enableThresholdFiltering && (-netProfitPercent) < thresholdPercent) {
        return;
    }

    // Display profit analysis in console
    console.log(
        `${label}: Bid= ${FormattingUtils.formatPrice(bidPrice)}, Ask= ${FormattingUtils.formatPrice(askPrice)}, ` +
        `Gross Profit: ${FormattingUtils.formatPercentage(grossProfitPercent)}, ` +
        `Fees: ${FormattingUtils.formatPercentage(totalFeesPercent)}, ` +
        `Net Profit After Fees: ${FormattingUtils.formatPercentage(netProfitPercent)}`
    );
}

/**
 * Conditionally logs profit information to avoid duplicate output
 * 
 * Only logs when prices have changed since last check to prevent console spam.
 * This improves readability during continuous price monitoring.
 * 
 * @param {string} buy - Buy exchange name (e.g., "lbank")
 * @param {number} buyPrice - Current ask price at buy exchange
 * @param {string} sell - Sell exchange name (e.g., "mexc")
 * @param {number} sellPrice - Current bid price at sell exchange
 */
async function conditionalLogProfit(buy, buyPrice, sell, sellPrice) {
    const key = `${buy}->${sell}`;
    const last = lastProfits.get(key);

    // Only log if prices have changed since last check
    if (!last || last.buyPrice !== buyPrice || last.sellPrice !== sellPrice) {
        await logPositiveProfit(
            `BUY=> ${buy} & SELL=> ${sell}`,
            buyPrice,
            sellPrice,
            config.feesPercent[buy] || 0,
            config.feesPercent[sell] || 0,
            config.profitThresholdPercent
        );
        // Update cache with current prices
        lastProfits.set(key, { buyPrice, sellPrice });
    }
}

/**
 * Main function to process bid/ask pairs and execute arbitrage logic
 * 
 * This is the core function that runs continuously to:
 * 1. Fetch current prices from all exchanges
 * 2. Calculate arbitrage opportunities
 * 3. Open new positions when profitable
 * 4. Monitor and close existing positions
 * 5. Display comprehensive market information
 * 
 * @param {object} symbols - Object containing trading symbols for each exchange
 * @param {Map} exchanges - Map containing initialized exchange instances
 */
export async function printBidAskPairs(symbols, exchanges) {
    // Fetch current prices from both exchanges using the price service
    // Prices are derived from the latest order book data for accuracy
    const prices = await priceService.getPricesFromExchanges(exchanges, symbols);
    const mexcPrice = prices.mexc; // MEXC exchange price data
    const lbankPrice = prices.lbank; // LBank exchange price data

    // Fetch raw order books for more accurate depth-aware decisions
    // Order books provide volume information and better price accuracy
    let mexcOb, lbankOb;
    try {
        const mexcEx = exchanges.get("mexc");
        const lbankEx = exchanges.get("lbank");

        // Fetch order books from both exchanges simultaneously for efficiency
        [mexcOb, lbankOb] = await Promise.all([
            mexcEx.fetchOrderBook(symbols.mexc),
            lbankEx.fetchOrderBook(symbols.lbank)
        ]);
    } catch (error) {
        // If order book fetch fails, continue with basic price data
        console.log(`⚠️ Order book fetch failed, using basic price data`);
    }

    // Get current system status for monitoring
    const status = getTradingStatus();

    // Calculate current price differences for both trading directions
    // IMPORTANT: We use correct sides for arbitrage calculations
    // - For LBANK(ask)->MEXC(bid): We buy at LBANK ask, sell at MEXC bid
    // - For MEXC(ask)->LBANK(bid): We buy at MEXC ask, sell at LBANK bid (NOT USED)

    // How percentages work:
    // - POSITIVE percentage = PROFITABLE opportunity (we can make money)
    // - NEGATIVE percentage = LOSS opportunity (we would lose money)
    // - LBANK(ask)->MEXC(bid): Positive when MEXC bid > LBANK ask (buy low, sell high) - THIS IS WHAT WE WANT
    // - MEXC(ask)->LBANK(bid): Positive when LBANK bid > MEXC ask (buy low, sell high) - NOT USED

    // Calculate profit percentages for each trading direction
    const lbankToMexcProfit = CalculationUtils.calculatePriceDifference(lbankPrice.ask, mexcPrice.bid);
    const mexcToLbankProfit = CalculationUtils.calculatePriceDifference(mexcPrice.ask, lbankPrice.bid);

    // Calculate percentages used for paired PRICES lines and close checks
    // These are the same as above but used for different display purposes
    const mexcBidVsLbankAskPct = CalculationUtils.calculatePriceDifference(lbankPrice.ask, mexcPrice.bid);
    const lbankBidVsMexcAskPct = CalculationUtils.calculatePriceDifference(mexcPrice.ask, lbankPrice.bid);

    // Display current system status and basic information
    console.log(`[STATUS] Open positions: ${status.openPositionsCount} | Total P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)} | Total tokens: ${FormattingUtils.formatVolume(status.totalOpenTokens ?? 0)}`);
    console.log(`[Arbitrage] LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentage(lbankToMexcProfit)} | MEXC(ask)->LBANK(bid): ${FormattingUtils.formatPercentage(mexcToLbankProfit)}`);

    // Log current price differences in paired form for clarity
    // Display both percentage and absolute price differences
    const mexcBidVsLbankAskAbs = (mexcPrice.bid != null && lbankPrice.ask != null) ? (mexcPrice.bid - lbankPrice.ask) : null;
    const lbankBidVsMexcAskAbs = (lbankPrice.bid != null && mexcPrice.ask != null) ? (lbankPrice.bid - mexcPrice.ask) : null;

    console.log(`[PRICES] MEXC: Bid=${FormattingUtils.formatPrice(mexcPrice.bid)} | LBANK: Ask=${FormattingUtils.formatPrice(lbankPrice.ask)} | Δ=${mexcBidVsLbankAskAbs != null ? mexcBidVsLbankAskAbs.toFixed(6) : 'n/a'} (${FormattingUtils.formatPercentage(mexcBidVsLbankAskPct)})`);
    console.log(`[PRICES] LBANK: Bid=${FormattingUtils.formatPrice(lbankPrice.bid)} | MEXC: Ask=${FormattingUtils.formatPrice(mexcPrice.ask)} | Δ=${lbankBidVsMexcAskAbs != null ? lbankBidVsMexcAskAbs.toFixed(6) : 'n/a'} (${FormattingUtils.formatPercentage(lbankBidVsMexcAskPct)})`);

    // Display order book depth information if available
    if (mexcOb && lbankOb) {
        const mexcBestBid = mexcOb.bids && mexcOb.bids[0] ? { price: mexcOb.bids[0][0], amount: mexcOb.bids[0][1] } : null;
        const mexcBestAsk = mexcOb.asks && mexcOb.asks[0] ? { price: mexcOb.asks[0][0], amount: mexcOb.asks[0][1] } : null;
        const lbankBestBid = lbankOb.bids && lbankOb.bids[0] ? { price: lbankOb.bids[0][0], amount: lbankOb.bids[0][1] } : null;
        const lbankBestAsk = lbankOb.asks && lbankOb.asks[0] ? { price: lbankOb.asks[0][0], amount: lbankOb.asks[0][1] } : null;

        console.log(`[DEPTH] MEXC: bestBid=${mexcBestBid ? `${FormattingUtils.formatPrice(mexcBestBid.price)} x ${mexcBestBid.amount}` : 'n/a'} bestAsk=${mexcBestAsk ? `${FormattingUtils.formatPrice(mexcBestAsk.price)} x ${mexcBestAsk.amount}` : 'n/a'} | ` +
                    `LBANK: bestBid=${lbankBestBid ? `${FormattingUtils.formatPrice(lbankBestBid.price)} x ${lbankBestBid.amount}` : 'n/a'} bestAsk=${lbankBestAsk ? `${FormattingUtils.formatPrice(lbankBestAsk.price)} x ${lbankBestAsk.amount}` : 'n/a'}`);
    }

    // Show visual separator for better readability
    console.log(FormattingUtils.createSeparator());

    // Position monitoring and closing logic
    // Only show detailed logs when there's an open position or when opening/closing
    if (status.openPositionsCount > 0) {
        console.log(`[CLOSE_CHECK] mexcBidVsLbankAskPct: ${FormattingUtils.formatPercentage(mexcBidVsLbankAskPct)} | Close Threshold: ${config.scenarios.alireza.closeAtPercent}%`);
    }

    // Check arbitrage opportunities and try to open new positions
    // Opening logic: allow multiple positions; rely on internal caps and validations
    if (lbankToMexcProfit >= config.profitThresholdPercent) {
        console.log(`🎯 Opening LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentage(lbankToMexcProfit)} (Profitable!)`);
        await tryOpenPosition(symbols.lbank, "lbank", "mexc", lbankPrice.ask, mexcPrice.bid);
    } else {
        console.log(`⏳ No profitable LBANK->MEXC opportunity: ${FormattingUtils.formatPercentage(lbankToMexcProfit)} (Threshold: ${config.profitThresholdPercent}%)`);
        console.log(`ℹ️  MEXC->LBANK direction: ${FormattingUtils.formatPercentage(mexcToLbankProfit)} (Not used for opening)`);
    }

    // Position closing logic
    // Try to close open positions based on current market conditions
    if (status.openPositionsCount > 0) {
        if (mexcBidVsLbankAskPct <= config.scenarios.alireza.closeAtPercent) {
            console.log(`🎯 Closing eligible positions: mexcBidVsLbankAskPct (${FormattingUtils.formatPercentage(mexcBidVsLbankAskPct)}) <= ${config.scenarios.alireza.closeAtPercent}%`);
            await tryClosePosition(symbols.mexc, mexcPrice.ask, lbankPrice.bid);
        } else {
            console.log(`📊 Positions open: Current P&L estimate: ${FormattingUtils.formatPercentage(mexcBidVsLbankAskPct)} (Close threshold: ${config.scenarios.alireza.closeAtPercent}%)`);
        }
    }

    // Display current status and monitoring information
    if (config.logSettings.printStatusToConsole) {
        console.log(`📊 [${new Date().toLocaleTimeString()}] Status: ${status.openPositionsCount > 0 ? `${status.openPositionsCount} Positions Open` : 'No Position'} | P&L: ${FormattingUtils.formatCurrency(status.totalProfit)}`);
        
        // Show separator when there's an open position for better visual organization
        if (status.openPositionsCount > 0) {
            console.log(FormattingUtils.createSeparator());
        }
    }
}

// Re-export the getPrice function for backward compatibility
// This allows other modules to access the price service functionality
export const getPrice = priceService.getPrice.bind(priceService);