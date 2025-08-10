import config from "../config/config.js";
import fs from "fs/promises";

// Map to store open positions
export const openPositions = new Map();
// Key: symbol
// Value: { buyExchange, sellExchange, buyPrice, sellPrice, volume, openTime }

// Global trading state to maintain overall system status
export const tradingState = {
    isAnyPositionOpen: false,
    totalProfit: 0,
    totalTrades: 0,
    lastTradeProfit: 0
};

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
    const diffPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

    // Only open position if profit threshold is met
    if (diffPercent >= config.profitThresholdPercent) {
        const volume = config.tradeVolumeUSD / buyPrice; // Convert USD to coin volume

        const position = {
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume,
            openTime: new Date().toISOString(),
        };

        openPositions.set(symbol, position);
        tradingState.isAnyPositionOpen = true;

        // Log the trade opening
        await logTrade("OPEN", symbol, {
            buyExchangeId,
            sellExchangeId,
            buyPrice,
            sellPrice,
            volume,
            diffPercent: diffPercent.toFixed(3),
        });

        console.log(
            `[OPEN] ${symbol} | Buy@${buyPrice} from ${buyExchangeId} | Sell@${sellPrice} to ${sellExchangeId} | Vol:${volume.toFixed(
        6
      )} | Diff:${diffPercent.toFixed(3)}%`
        );
    }
}

/**
 * Attempts to close an open arbitrage position
 * @param {string} symbol - Trading symbol
 * @param {number} buyPriceNow - Current buy price
 * @param {number} sellPriceNow - Current sell price
 */
export async function tryClosePosition(symbol, buyPriceNow, sellPriceNow) {
    if (!openPositions.has(symbol)) return;

    const position = openPositions.get(symbol);

    // Calculate current gross profit (without fees)
    const grossProfitPercentNow =
        ((sellPriceNow - position.buyPrice) / position.buyPrice) * 100;

    // Calculate total fees for both exchanges
    const totalFees =
        config.feesPercent[position.buyExchangeId] +
        config.feesPercent[position.sellExchangeId];

    // Calculate current net profit (after fees)
    const netProfitPercentNow = grossProfitPercentNow - totalFees;

    // Position closing conditions:
    // 1. Net profit has reached close threshold
    // 2. Or loss is too high (to prevent further losses)
    // 3. Or maximum allowed loss has been reached
    const shouldClose =
        netProfitPercentNow >= config.closeThresholdPercent ||
        netProfitPercentNow <= -config.profitThresholdPercent || // Close on high loss
        netProfitPercentNow <= config.maxLossPercent; // Close on maximum loss

    if (shouldClose) {
        const closeTime = new Date().toISOString();

        // Calculate actual profit/loss in USD
        const actualProfitUSD = (netProfitPercentNow / 100) * config.tradeVolumeUSD;
        tradingState.totalProfit += actualProfitUSD;
        tradingState.lastTradeProfit = actualProfitUSD;
        tradingState.totalTrades++;

        // Prepare trade information for logging
        const tradeInfo = {
            buyExchangeId: position.buyExchangeId,
            sellExchangeId: position.sellExchangeId,
            openTime: position.openTime,
            closeTime,
            buyPriceOpen: position.buyPrice,
            sellPriceOpen: position.sellPrice,
            buyPriceClose: buyPriceNow,
            sellPriceClose: sellPriceNow,
            volume: position.volume,
            grossProfitPercent: grossProfitPercentNow.toFixed(3),
            netProfitPercent: netProfitPercentNow.toFixed(3),
            feesPercent: totalFees.toFixed(3),
            netProfitPercentNow: netProfitPercentNow.toFixed(3),
            actualProfitUSD: actualProfitUSD.toFixed(2),
            totalProfitUSD: tradingState.totalProfit.toFixed(2),
            tradeNumber: tradingState.totalTrades
        };

        // Log the trade closing
        await logTrade("CLOSE", symbol, tradeInfo);

        // Remove position and update state
        openPositions.delete(symbol);
        tradingState.isAnyPositionOpen = false;

        const action = netProfitPercentNow >= 0 ? "PROFIT" : "LOSS";
        const closeReason = netProfitPercentNow >= config.closeThresholdPercent ? "Target profit reached" :
            netProfitPercentNow <= config.maxLossPercent ? "Maximum loss reached" : "High loss";

        console.log(
            `[CLOSE] ${symbol} | BuyNow@${buyPriceNow} | SellNow@${sellPriceNow} | Vol:${position.volume.toFixed(
                6
            )} | NetProfit:${netProfitPercentNow.toFixed(3)}% | ${action} | Reason: ${closeReason} | Actual P&L: $${actualProfitUSD.toFixed(2)} | Total P&L: $${tradingState.totalProfit.toFixed(2)}`
        );

        // Display comprehensive trade summary
        console.log(`[SUMMARY] Trade #${tradingState.totalTrades} closed:`);
        console.log(`   - This trade P&L: $${actualProfitUSD.toFixed(2)}`);
        console.log(`   - Total P&L so far: $${tradingState.totalProfit.toFixed(2)}`);
        console.log(`   - Total trades: ${tradingState.totalTrades}`);
        console.log(`   - Close reason: ${closeReason}`);
        console.log(`   - Ready for next trade...`);
        console.log("--------------------------------------------------");
    }
}

/**
 * Logs trade information to file
 * @param {string} action - "OPEN" or "CLOSE"
 * @param {string} symbol - Trading symbol
 * @param {object} data - Trade data to log
 */
export async function logTrade(action, symbol, data) {
    const logEntry = {
        action, // "OPEN" or "CLOSE"
        symbol,
        timestamp: new Date().toISOString(),
        ...data, // Other information like price, volume, profit, etc.
    };

    const logLine = JSON.stringify(logEntry) + "\n";

    await fs.appendFile("trades.log", logLine);
}

/**
 * Returns the current trading system status
 * @returns {object} Current trading state
 */
export function getTradingStatus() {
    return {
        isAnyPositionOpen: tradingState.isAnyPositionOpen,
        totalProfit: tradingState.totalProfit,
        totalTrades: tradingState.totalTrades,
        lastTradeProfit: tradingState.lastTradeProfit,
        openPositionsCount: openPositions.size
    };
}