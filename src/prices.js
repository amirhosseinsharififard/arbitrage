import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { priceService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";

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
    // Fetch current prices from both exchanges
    const prices = await priceService.getPricesFromExchanges(exchanges, symbols);
    const mexcPrice = prices.mexc;
    const lbankPrice = prices.lbank;

    // Display current system status
    const status = getTradingStatus();
    console.log(`[STATUS] Open position: ${status.isAnyPositionOpen ? 'Yes' : 'No'} | Total P&L: ${FormattingUtils.formatCurrency(status.totalProfit)} | Total trades: ${status.totalTrades} | Investment: ${FormattingUtils.formatCurrency(status.totalInvestment)}`);

    // Calculate current price differences for both directions
    const mexcToLbankDiff = CalculationUtils.calculatePriceDifference(mexcPrice.bid, lbankPrice.ask);
    const lbankToMexcDiff = CalculationUtils.calculatePriceDifference(lbankPrice.bid, mexcPrice.ask);

    // Log current price differences

    console.log(`[PRICES]  MEXC-Bid=${FormattingUtils.formatPrice(mexcPrice.bid)} LBANK-Ask=${FormattingUtils.formatPrice(lbankPrice.ask)} => ${FormattingUtils.formatPercentage(mexcToLbankDiff)}`);
    console.log(`[PRICES]  LBAK-Bid=${FormattingUtils.formatPrice(lbankPrice.bid)} MEXC-Ask=${FormattingUtils.formatPrice(mexcPrice.ask)} => ${FormattingUtils.formatPercentage(lbankToMexcDiff)}`);
    
    // console.log(`[DIFF] MEXC→LBANK: ${FormattingUtils.formatPercentage(mexcToLbankDiff)} | LBANK→MEXC: ${FormattingUtils.formatPercentage(lbankToMexcDiff)}`);

    // Check arbitrage opportunities and try to open positions
    if (!status.isAnyPositionOpen) {
        // Check MEXC -> LBANK arbitrage opportunity
        if (mexcToLbankDiff >= config.profitThresholdPercent) {
            console.log(`🎯 ARBITRAGE OPPORTUNITY: MEXC→LBANK (${FormattingUtils.formatPercentage(mexcToLbankDiff)} >= ${FormattingUtils.formatPercentage(config.profitThresholdPercent)})`);
            await tryOpenPosition(
                symbols.mexc,
                "mexc", // Buy from MEXC
                "lbank", // Sell to LBANK
                mexcPrice.bid, // Buying price in MEXC
                lbankPrice.ask // Selling price in LBANK
            );
        }
        // Check LBANK -> MEXC arbitrage opportunity
        else if (lbankToMexcDiff >= config.profitThresholdPercent) {
            console.log(`🎯 ARBITRAGE OPPORTUNITY: LBANK→MEXC (${FormattingUtils.formatPercentage(lbankToMexcDiff)} >= ${FormattingUtils.formatPercentage(config.profitThresholdPercent)})`);
            await tryOpenPosition(
                symbols.lbank,
                "lbank", // Buy from LBANK
                "mexc", // Sell to MEXC
                lbankPrice.bid, // Buying price in LBANK
                mexcPrice.ask // Selling price in MEXC
            );
        }
    }

    // Try to close open positions based on current market conditions
    if (status.isAnyPositionOpen) {
        // For MEXC -> LBANK position
        if (openPositions.has("mexc-lbank")) {
            await tryClosePosition(
                symbols.mexc,
                mexcPrice.bid, // Current buying price in MEXC
                lbankPrice.ask // Current selling price in LBANK
            );
        }
        // For LBANK -> MEXC position
        else if (openPositions.has("lbank-mexc")) {
            await tryClosePosition(
                symbols.lbank,
                lbankPrice.bid, // Current buying price in LBANK
                mexcPrice.ask // Current selling price in MEXC
            );
        }
    }

    console.log(FormattingUtils.createSeparator());
}

// Re-export the getPrice function for backward compatibility
export const getPrice = priceService.getPrice.bind(priceService);