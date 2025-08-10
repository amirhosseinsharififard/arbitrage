import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { retryWrapper } from "./error/errorBoundory.js";

// Cache for storing last profit calculations to avoid duplicate logging
const lastProfits = new Map();

/**
 * Logs profit information when positive arbitrage opportunity is detected
 * @param {string} label - Label for the exchange pair
 * @param {number} bidPrice - Current bid price
 * @param {number} askPrice - Current ask price
 * @param {number} feeBuyPercent - Buy fee percentage
 * @param {number} feeSellPercent - Sell fee percentage
 * @param {number} thresholdPercent - Minimum profit threshold (default: 0.5%)
 */
async function logPositiveProfit(
    label,
    bidPrice,
    askPrice,
    feeBuyPercent,
    feeSellPercent,
    thresholdPercent = 0.5
) {
    if (bidPrice == null || askPrice == null) return;

    const grossProfitPercent = ((bidPrice - askPrice) / askPrice) * 100;
    const totalFeesPercent = feeBuyPercent + feeSellPercent;
    const netProfitPercent = grossProfitPercent - totalFeesPercent;

    // Uncomment this section if you want to enable threshold filtering
    // if (netProfitPercent < thresholdPercent) {
    //   return;
    // }

    console.log(
        `${label}: Bid= ${bidPrice}, Ask= ${askPrice}, ` +
        `Gross Profit: ${grossProfitPercent.toFixed(2)}%, ` +
        `Fees: ${totalFeesPercent.toFixed(2)}%, ` +
        `Net Profit After Fees: ${netProfitPercent.toFixed(2)}%`
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
            config.profitThresholdPercent
        );
        lastProfits.set(key, { buyPrice, sellPrice });
    }
}

/**
 * Fetches current bid/ask prices for a symbol from an exchange
 * @param {object} exchange - Exchange instance
 * @param {string} symbol - Trading symbol
 * @returns {object} Object containing bid and ask prices
 */
export async function getPrice(exchange, symbol) {
    try {
        // First try to get price from ticker
        const ticker = await retryWrapper(exchange.fetchTicker.bind(exchange), [symbol], 3, 1000);
        if (ticker.bid != null && ticker.ask != null) {
            return { bid: ticker.bid, ask: ticker.ask };
        }

        // Fallback to orderbook if ticker doesn't have bid/ask
        const orderbook = await retryWrapper(exchange.fetchOrderBook.bind(exchange), [symbol], 3, 1000);
        const bestAsk = orderbook.asks.length ? orderbook.asks[0][0] : null;
        const bestBid = orderbook.bids.length ? orderbook.bids[0][0] : null;
        return { bid: bestBid, ask: bestAsk };
    } catch (error) {
        console.error(
            `[${exchange.id}] Failed to fetch price for ${symbol} after retries: ${error.message || error}`
        );
        return { bid: null, ask: null };
    }
}

/**
 * Handles different types of errors and determines if retry is appropriate
 * @param {Error} error - Error object
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum number of retries
 * @param {string} exchangeId - Exchange identifier
 * @param {string} symbol - Trading symbol
 * @returns {boolean} Whether retry should be attempted
 */
function handleError(error, attempt, maxRetries, exchangeId, symbol) {
    if (!error) {
        console.error(`[${exchangeId}] Unknown error for symbol ${symbol}.`);
        return false;
    }

    const statusCode = error.httpStatusCode || error.statusCode || null;

    if (statusCode) {
        switch (statusCode) {
            case 403:
                console.error(
                    `[${exchangeId}] Access forbidden (403) for symbol ${symbol}. Check API keys or permissions.`
                );
                return false;
            case 429:
                console.warn(
                    `[${exchangeId}] Rate limit exceeded (429) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
                );
                return attempt < maxRetries;
            case 500:
            case 502:
            case 503:
            case 504:
                console.warn(
                    `[${exchangeId}] Server error (${statusCode}) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
                );
                return attempt < maxRetries;
            default:
                console.error(
                    `[${exchangeId}] HTTP error (${statusCode}) for symbol ${symbol}: ${
            error.message || error
          }`
                );
                return false;
        }
    }

    if (error.message && error.message.toLowerCase().includes("timeout")) {
        console.warn(
            `[${exchangeId}] Timeout error for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
        );
        return attempt < maxRetries;
    }

    console.error(
        `[${exchangeId}] Unexpected error for symbol ${symbol}: ${
      error.message || error
    }`
    );
    return false;
}

/**
 * Main function to process bid/ask pairs and execute arbitrage logic
 * @param {object} symbols - Object containing symbols for each exchange
 * @param {object} exchanges - Object containing exchange instances
 */
export async function printBidAskPairs(symbols, exchanges) {
    // Fetch current prices from both exchanges
    const mexcPrice = await getPrice(exchanges.mexc, symbols.mexc);
    const lbankPrice = await getPrice(exchanges.lbank, symbols.lbank);

    // Display current system status
    const status = getTradingStatus();
    console.log(`[STATUS] Open position: ${status.isAnyPositionOpen ? 'Yes' : 'No'} | Total P&L: $${status.totalProfit.toFixed(2)} | Total trades: ${status.totalTrades}`);

    // Log profit opportunities for both directions
    await logPositiveProfit(
        "BUY=> MEXC & SELL=> LBank",
        mexcPrice.bid,
        lbankPrice.ask,
        config.feesPercent.mexc,
        config.feesPercent.lbank,
        config.profitThresholdPercent
    );

    await logPositiveProfit(
        "BUY=> LBank & SELL=> MEXC",
        lbankPrice.bid,
        mexcPrice.ask,
        config.feesPercent.lbank,
        config.feesPercent.mexc,
        config.profitThresholdPercent
    );

    // Check arbitrage opportunity: MEXC -> LBank
    // If selling price in LBank is higher than buying price in MEXC
    if (lbankPrice.ask > mexcPrice.bid) {
        await tryOpenPosition(
            symbols.mexc,
            "mexc", // Buy from MEXC
            "lbank", // Sell to LBank
            mexcPrice.bid, // Buying price in MEXC
            lbankPrice.ask // Selling price in LBank
        );
    }

    // Check arbitrage opportunity: LBank -> MEXC
    // If selling price in MEXC is higher than buying price in LBank
    if (mexcPrice.ask > lbankPrice.bid) {
        await tryOpenPosition(
            symbols.lbank,
            "lbank", // Buy from LBank
            "mexc", // Sell to MEXC
            lbankPrice.bid, // Buying price in LBank
            mexcPrice.ask // Selling price in MEXC
        );
    }

    // Try to close open positions based on current market conditions
    // For MEXC -> LBank position
    if (openPositions.has(symbols.mexc)) {
        await tryClosePosition(
            symbols.mexc,
            mexcPrice.bid, // Current buying price in MEXC
            lbankPrice.ask // Current selling price in LBank
        );
    }

    // For LBank -> MEXC position
    if (openPositions.has(symbols.lbank)) {
        await tryClosePosition(
            symbols.lbank,
            lbankPrice.bid, // Current buying price in LBank
            mexcPrice.ask // Current selling price in MEXC
        );
    }

    console.log("--------------------------------------------------");
}

/**
 * Calculates net profit percentage after fees
 * @param {number} bidPrice - Bid price
 * @param {number} askPrice - Ask price
 * @param {number} feeBuyPercent - Buy fee percentage
 * @param {number} feeSellPercent - Sell fee percentage
 * @returns {number} Net profit percentage
 */
function calculateNetProfitPercent(bidPrice, askPrice, feeBuyPercent, feeSellPercent) {
    const grossProfitPercent = ((bidPrice - askPrice) / askPrice) * 100;
    const totalFeesPercent = feeBuyPercent + feeSellPercent;
    return grossProfitPercent - totalFeesPercent;
}