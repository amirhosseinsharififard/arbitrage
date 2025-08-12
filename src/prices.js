import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { priceService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";
import exchangeManager from "./exchanges/exchangeManager.js";

// Cache for storing last profit calculations to avoid duplicate logging
const lastProfits = new Map();

/**
 * Logs profit information when positive arbitrage opportunity is detected
 * @param {string} label - Label for the exchange pair
 * @param {number} bidPrice - Current bid price
 * @param {number} askPrice - Current ask price
 * @param {number} feeBuyPercent - Buy fee percentage
 * @param {number} feeSellPercent - Sell fee percentage
 * @param {number} thresholdPercent - Minimum profit threshold
 */
async function logPositiveProfit(
    label,
    bidPrice,
    askPrice,
    feeBuyPercent,
    feeSellPercent,
    thresholdPercent = config.arbitrage.defaultThresholdPercent
) {
    if (bidPrice == null || askPrice == null) return;

    const grossProfitPercent = CalculationUtils.calculatePriceDifference(bidPrice, askPrice);
    const totalFeesPercent = feeBuyPercent + feeSellPercent;
    const netProfitPercent = grossProfitPercent - totalFeesPercent;

    // Check if threshold filtering is enabled
    if (config.arbitrage.enableThresholdFiltering && netProfitPercent < thresholdPercent) {
        return;
    }

    console.log(
        `${label}: Bid= ${FormattingUtils.formatPrice(bidPrice)}, Ask= ${FormattingUtils.formatPrice(askPrice)}, ` +
        `Gross Profit: ${FormattingUtils.formatPercentage(grossProfitPercent)}, ` +
        `Fees: ${FormattingUtils.formatPercentage(totalFeesPercent)}, ` +
        `Net Profit After Fees: ${FormattingUtils.formatPercentage(netProfitPercent)}`
    );
}

/**
 * Conditionally logs profit information to avoid duplicate output
 * @param {string} buy - Buy exchange name
 * @param {number} buyPrice - Buy price
 * @param {string} sell - Sell exchange name
 * @param {number} sellPrice - Sell price
 */
async function conditionalLogProfit(buy, buyPrice, sell, sellPrice) {
    const key = `${buy}->${sell}`;
    const last = lastProfits.get(key);

    if (!last || last.buyPrice !== buyPrice || last.sellPrice !== sellPrice) {
        await logPositiveProfit(
            `BUY=> ${buy} & SELL=> ${sell}`,
            buyPrice,
            sellPrice,
            config.feesPercent[buy] || 0,
            config.feesPercent[sell] || 0,
            config.profitThresholdPercent
        );
        lastProfits.set(key, { buyPrice, sellPrice });
    }
}

/**
 * Main function to process bid/ask pairs and execute arbitrage logic
 * @param {object} symbols - Object containing symbols for each exchange
 * @param {Map} exchanges - Map containing exchange instances
 */
export async function printBidAskPairs(symbols, exchanges) {
    // Fetch current prices from both exchanges (now derived from latest order book)
    const prices = await priceService.getPricesFromExchanges(exchanges, symbols);
    const mexcPrice = prices.mexc;
    const lbankPrice = prices.lbank;

    // Also fetch raw order books for more accurate depth-aware decisions
    let mexcOb, lbankOb;
    try {
        const mexcEx = exchanges.get("mexc");
        const lbankEx = exchanges.get("lbank");
        [mexcOb, lbankOb] = await Promise.all([
            mexcEx.fetchOrderBook(symbols.mexc),
            lbankEx.fetchOrderBook(symbols.lbank)
        ]);
    } catch {}

    // Display current system status
    const status = getTradingStatus();

    // Calculate current price differences for both directions using correct sides (buy at ASK, sell at BID)
    const mexcToLbankDiff = CalculationUtils.calculatePriceDifference(mexcPrice.ask, lbankPrice.bid);
    const lbankToMexcDiff = CalculationUtils.calculatePriceDifference(lbankPrice.ask, mexcPrice.bid);

    // Calculate lbankBidVsMexcAskPct for closing positions
    const lbankBidVsMexcAskPct = CalculationUtils.calculatePriceDifference(lbankPrice.bid, mexcPrice.ask);

    // Always show basic status and prices for monitoring
    console.log(`[STATUS] Open position: ${status.isAnyPositionOpen ? 'Yes' : 'No'} | Total P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)}`);
    console.log(`[Scenario-Alireza] MEXC(ask)->LBANK(bid): ${FormattingUtils.formatPercentage(mexcToLbankDiff)} | LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentage(lbankToMexcDiff)}`);

    // Log current price differences in paired form for clarity, with absolute differences
    const mexcBidVsLbankAskAbs = (mexcPrice.bid != null && lbankPrice.ask != null) ? (mexcPrice.bid - lbankPrice.ask) : null;
    const lbankBidVsMexcAskAbs = (lbankPrice.bid != null && mexcPrice.ask != null) ? (lbankPrice.bid - mexcPrice.ask) : null;
    const mexcBidVsLbankAskPct = CalculationUtils.calculatePriceDifference(mexcPrice.bid, lbankPrice.ask);
    console.log(`[PRICES] MEXC: Bid=${FormattingUtils.formatPrice(mexcPrice.bid)} | LBANK: Ask=${FormattingUtils.formatPrice(lbankPrice.ask)} | Δ=${mexcBidVsLbankAskAbs != null ? mexcBidVsLbankAskAbs.toFixed(6) : 'n/a'} (${FormattingUtils.formatPercentage(mexcBidVsLbankAskPct)})`);
    console.log(`[PRICES] LBANK: Bid=${FormattingUtils.formatPrice(lbankPrice.bid)} | MEXC: Ask=${FormattingUtils.formatPrice(mexcPrice.ask)} | Δ=${lbankBidVsMexcAskAbs != null ? lbankBidVsMexcAskAbs.toFixed(6) : 'n/a'} (${FormattingUtils.formatPercentage(lbankBidVsMexcAskPct)})`);

    if (mexcOb && lbankOb) {
        const mexcBestBid = mexcOb.bids && mexcOb.bids[0] ? { price: mexcOb.bids[0][0], amount: mexcOb.bids[0][1] } : null;
        const mexcBestAsk = mexcOb.asks && mexcOb.asks[0] ? { price: mexcOb.asks[0][0], amount: mexcOb.asks[0][1] } : null;
        const lbankBestBid = lbankOb.bids && lbankOb.bids[0] ? { price: lbankOb.bids[0][0], amount: lbankOb.bids[0][1] } : null;
        const lbankBestAsk = lbankOb.asks && lbankOb.asks[0] ? { price: lbankOb.asks[0][0], amount: lbankOb.asks[0][1] } : null;
        console.log(`[DEPTH] MEXC: bestBid=${mexcBestBid ? `${FormattingUtils.formatPrice(mexcBestBid.price)} x ${mexcBestBid.amount}` : 'n/a'} bestAsk=${mexcBestAsk ? `${FormattingUtils.formatPrice(mexcBestAsk.price)} x ${mexcBestAsk.amount}` : 'n/a'} | ` +
                    `LBANK: bestBid=${lbankBestBid ? `${FormattingUtils.formatPrice(lbankBestBid.price)} x ${lbankBestBid.amount}` : 'n/a'} bestAsk=${lbankBestAsk ? `${FormattingUtils.formatPrice(lbankBestAsk.price)} x ${lbankBestAsk.amount}` : 'n/a'}`);
    }

    // Show separator for visual clarity
    console.log(FormattingUtils.createSeparator());

    // Only show detailed logs when there's an open position or when opening/closing
    if (status.isAnyPositionOpen) {
        console.log(`[CLOSE_CHECK] lbankBidVsMexcAskPct: ${FormattingUtils.formatPercentage(lbankBidVsMexcAskPct)} | Close Threshold: ${config.scenarios.alireza.closeAtPercent}%`);
    }

    // Check arbitrage opportunities and try to open positions
    if (!status.isAnyPositionOpen) {
        if (config.activeScenario === 'alireza') {
            // Scenario Alireza: Open if either direction meets profit threshold
            if (mexcToLbankDiff >= config.profitThresholdPercent) {
                console.log(`🎯 [Alireza] Open MEXC(ask)->LBANK(bid): ${FormattingUtils.formatPercentage(mexcToLbankDiff)}`);
                await tryOpenPosition(symbols.mexc, "mexc", "lbank", mexcPrice.ask, lbankPrice.bid);
            } else if (lbankToMexcDiff >= config.profitThresholdPercent) {
                console.log(`🎯 [Alireza] Open LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentage(lbankToMexcDiff)}`);
                await tryOpenPosition(symbols.lbank, "lbank", "mexc", lbankPrice.ask, mexcPrice.bid);
            }
        } else {
            // Scenario Amir: Keep current bid/ask arbitrage open logic (both directions allowed)
            // if (mexcToLbankDiff >= config.profitThresholdPercent) {
            //     console.log(`🎯 [Amir] ARBITRAGE: MEXC→LBANK (${FormattingUtils.formatPercentage(mexcToLbankDiff)})`);
            //     await tryOpenPosition(symbols.mexc, "mexc", "lbank", mexcPrice.ask, lbankPrice.bid);
            // } else if (lbankToMexcDiff >= config.profitThresholdPercent) {
            //     console.log(`🎯 [Amir] ARBITRAGE: LBANK→MEXC (${FormattingUtils.formatPercentage(lbankToMexcDiff)})`);
            //     await tryOpenPosition(symbols.lbank, "lbank", "mexc", lbankPrice.ask, mexcPrice.bid);
            // }
        }
    }

    // Try to close open positions based on current market conditions
    if (status.isAnyPositionOpen) {
        if (config.activeScenario === 'alireza') {
            // Close when lbankBidVsMexcAskPct reaches the close threshold
            if (openPositions.has("lbank-mexc") && lbankBidVsMexcAskPct <= config.scenarios.alireza.closeAtPercent) {
                console.log(`🎯 [Alireza] Closing LBANK->MEXC position: lbankBidVsMexcAskPct (${FormattingUtils.formatPercentage(lbankBidVsMexcAskPct)}) <= ${config.scenarios.alireza.closeAtPercent}%`);
                await tryClosePosition(symbols.lbank, lbankPrice.ask, mexcPrice.bid);
            }
        } else {
            // Scenario Amir: normal close logic uses the existing open/close thresholds
            if (openPositions.has("lbank-mexc")) {
                await tryClosePosition(symbols.lbank, lbankPrice.ask, mexcPrice.bid);
            }
        }
    }

    // Always show current status and prices for monitoring
    if (config.logSettings.printStatusToConsole) {
        console.log(`📊 [${new Date().toLocaleTimeString()}] Status: ${status.isAnyPositionOpen ? 'Position Open' : 'No Position'} | P&L: ${FormattingUtils.formatCurrency(status.totalProfit)}`);
        
        // Show separator when there's an open position
        if (status.isAnyPositionOpen) {
            console.log(FormattingUtils.createSeparator());
        }
    }
}

// Re-export the getPrice function for backward compatibility
export const getPrice = priceService.getPrice.bind(priceService);