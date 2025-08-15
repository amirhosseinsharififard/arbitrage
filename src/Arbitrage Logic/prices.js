import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { ourbitPriceService } from "./services/index.js";
import { CalculationUtils, FormattingUtils, computeSpreads } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";

// Cache for storing last profit calculations to avoid duplicate logging
const lastProfits = new Map();
let lastTickKey = null;
let lastPriceData = null;

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

    if (config.arbitrage.enableThresholdFiltering && (-netProfitPercent) < thresholdPercent) return;

    console.log(
        `${label}: Bid= ${FormattingUtils.formatPrice(bidPrice)}, Ask= ${FormattingUtils.formatPrice(askPrice)}, ` +
        `Gross Profit: ${FormattingUtils.formatPercentage(grossProfitPercent)}, ` +
        `Fees: ${FormattingUtils.formatPercentage(totalFeesPercent)}, ` +
        `Net Profit After Fees: ${FormattingUtils.formatPercentage(netProfitPercent)}`
    );
}

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

export async function printBidAskPairs(symbols, exchanges) {
    const prices = await ourbitPriceService.getPricesFromExchanges(exchanges, symbols);
    const ourbitPrice = prices.ourbit;

    // Get MEXC prices from exchange manager (futures)
    let mexcPrice = null;
    try {
        mexcPrice = await exchangeManager.getMexcPrice('GAIA/USDT:USDT');
    } catch (error) {
        console.log(`⚠️ MEXC futures price fetch failed: ${error.message}`);
        mexcPrice = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'mexc',
            symbol: 'GAIA/USDT:USDT',
            error: error.message
        };
    }

    const tickKey = `${ourbitPrice && ourbitPrice.bid || 'n'}|${ourbitPrice && ourbitPrice.ask || 'n'}|${mexcPrice && mexcPrice.bid || 'n'}|${mexcPrice && mexcPrice.ask || 'n'}`;
    if (tickKey === lastTickKey) return;
    lastTickKey = tickKey;

    // Check if prices have actually changed significantly
    const priceChanged = !lastPriceData ||
        Math.abs((ourbitPrice && ourbitPrice.bid || 0) - (lastPriceData && lastPriceData.bid || 0)) > 0.000001 ||
        Math.abs((ourbitPrice && ourbitPrice.ask || 0) - (lastPriceData && lastPriceData.ask || 0)) > 0.000001;

    if (!priceChanged) return;

    lastPriceData = { bid: ourbitPrice && ourbitPrice.bid, ask: ourbitPrice && ourbitPrice.ask };

    let ourbitOb;
    try {
        ourbitOb = await ourbitPriceService.getOrderBook('ourbit', 'GAIA/USDT');
    } catch (error) {
        console.log(`⚠️ Ourbit order book fetch failed, using basic price data`);
    }

    const status = getTradingStatus();

    const {
        lbankToMexcProfit,
        mexcToLbankProfit,
        mexcBidVsLbankAskPct,
        lbankBidVsMexcAskPct,
        mexcAskVsLbankBidPct,
        mexcBidVsLbankAskAbs,
        lbankBidVsMexcAskAbs
    } = computeSpreads({
        mexcBid: mexcPrice.bid, // MEXC bid from exchange manager
        mexcAsk: mexcPrice.ask, // MEXC ask from exchange manager
        lbankBid: ourbitPrice.bid, // Using Ourbit bid as LBank replacement
        lbankAsk: ourbitPrice.ask // Using Ourbit ask as LBank replacement
    });

    console.log(`${FormattingUtils.label('STATUS')} Open: ${chalk.yellow(status.openPositionsCount)} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)} | Trades: ${chalk.yellow(status.totalTrades)} | Invested: ${chalk.yellow(FormattingUtils.formatCurrency(status.totalInvestment))} | Tokens: ${chalk.yellow(FormattingUtils.formatVolume(status.totalOpenTokens ?? 0))}`);
    console.log(`${FormattingUtils.label('Arbitrage')} OURBIT(ask)->MEXC(bid): ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} | MEXC(ask)->OURBIT(bid): ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)}`);

    console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('MEXC')}: Bid=${chalk.white(FormattingUtils.formatPrice(mexcPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(mexcPrice.ask))} | Δ=${mexcBidVsLbankAskAbs != null ? chalk.white(mexcBidVsLbankAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(mexcBidVsLbankAskPct)})`);
    console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('OURBIT')}: Bid=${chalk.white(FormattingUtils.formatPrice(ourbitPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(ourbitPrice.ask))} | Δ=${lbankBidVsMexcAskAbs != null ? chalk.white(lbankBidVsMexcAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(lbankBidVsMexcAskPct)})`);

    if (ourbitOb) {
        const ourbitBestBid = (ourbitOb && Array.isArray(ourbitOb.bids) && ourbitOb.bids[0]) ? { price: ourbitOb.bids[0][0], amount: ourbitOb.bids[0][1] } :
            null;
        const ourbitBestAsk = (ourbitOb && Array.isArray(ourbitOb.asks) && ourbitOb.asks[0]) ? { price: ourbitOb.asks[0][0], amount: ourbitOb.asks[0][1] } :
            null;

        console.log(`${FormattingUtils.label('DEPTH')} ${FormattingUtils.colorExchange('OURBIT')}: bestBid=${ourbitBestBid ? `${FormattingUtils.formatPrice(ourbitBestBid.price)} x ${ourbitBestBid.amount}` : chalk.yellow('n/a')} bestAsk=${ourbitBestAsk ? `${FormattingUtils.formatPrice(ourbitBestAsk.price)} x ${ourbitBestAsk.amount}` : chalk.yellow('n/a')}`);
    }

    console.log(FormattingUtils.createSeparator());

    // Position opening logic (using Ourbit and MEXC data)
    if (lbankToMexcProfit >= config.profitThresholdPercent) {
        console.log(`${chalk.green('🎯')} Opening OURBIT(ask)->MEXC(bid): ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.green('(Profitable!)')}`);
        await tryOpenPosition('GAIA/USDT', "ourbit", "mexc", ourbitPrice.ask, mexcPrice.bid);
    } else {
        console.log(`${chalk.yellow('⏳')} No OURBIT->MEXC opp: ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.gray(`(Threshold: ${config.profitThresholdPercent}%)`)}`);
        console.log(`${chalk.blue('ℹ️ ')} MEXC->OURBIT: ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)} ${chalk.gray('(not used)')}`);
    }

    // Position closing logic (using Ourbit and MEXC data)
    if (status.openPositionsCount > 0) {
        const closeThreshold = Math.abs(Number(config.scenarios.alireza.closeAtPercent));
        if (mexcAskVsLbankBidPct != null && mexcAskVsLbankBidPct <= closeThreshold) {
            console.log(`🎯 Closing eligible positions: mexcAskVsOurbitBidPct (${FormattingUtils.formatPercentage(mexcAskVsLbankBidPct)}) >= ${FormattingUtils.formatPercentage(closeThreshold)}`);
            await tryClosePosition('GAIA/USDT', ourbitPrice.bid, mexcPrice.ask);
        } else {
            console.log(`📊 Positions open: Current P&L estimate: ${FormattingUtils.formatPercentage(mexcAskVsLbankBidPct)} (Close threshold: ${FormattingUtils.formatPercentage(closeThreshold)})`);
        }
    }

    if (config.logSettings.printStatusToConsole) {
        console.log(`${FormattingUtils.label(new Date().toLocaleTimeString())} ${status.openPositionsCount > 0 ? chalk.yellow(`${status.openPositionsCount} open`) : chalk.gray('No Position')} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)}`);
        if (status.openPositionsCount > 0) console.log(FormattingUtils.createSeparator());
    }
}

// Re-export for backward compatibility
export const getPrice = ourbitPriceService.getPrice.bind(ourbitPriceService);