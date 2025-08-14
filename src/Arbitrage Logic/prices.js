import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { priceService } from "./services/index.js";
import { CalculationUtils, FormattingUtils, computeSpreads } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";

// Cache for storing last profit calculations to avoid duplicate logging
const lastProfits = new Map();
let lastTickKey = null;

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
    const prices = await priceService.getPricesFromExchanges(exchanges, symbols);
    const mexcPrice = prices.mexc;
    const lbankPrice = prices.lbank;

    const tickKey = `${mexcPrice?.bid ?? 'n'}|${mexcPrice?.ask ?? 'n'}|${lbankPrice?.bid ?? 'n'}|${lbankPrice?.ask ?? 'n'}`;
    if (tickKey === lastTickKey) return;
    lastTickKey = tickKey;

    let mexcOb, lbankOb;
    try {
        const mexcEx = exchanges.get("mexc");
        const lbankEx = exchanges.get("lbank");
        [mexcOb, lbankOb] = await Promise.all([
            mexcEx.fetchOrderBook(symbols.mexc),
            lbankEx.fetchOrderBook(symbols.lbank)
        ]);
    } catch (error) {
        console.log(`⚠️ Order book fetch failed, using basic price data`);
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
        mexcBid: mexcPrice.bid,
        mexcAsk: mexcPrice.ask,
        lbankBid: lbankPrice.bid,
        lbankAsk: lbankPrice.ask
    });

    console.log(`${FormattingUtils.label('STATUS')} Open: ${chalk.yellow(status.openPositionsCount)} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)} | Trades: ${chalk.yellow(status.totalTrades)} | Invested: ${chalk.yellow(FormattingUtils.formatCurrency(status.totalInvestment))} | Tokens: ${chalk.yellow(FormattingUtils.formatVolume(status.totalOpenTokens ?? 0))}`);
    console.log(`${FormattingUtils.label('Arbitrage')} LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} | MEXC(ask)->LBANK(bid): ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)}`);

    console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('MEXC')}: Bid=${chalk.white(FormattingUtils.formatPrice(mexcPrice.bid))} | ${FormattingUtils.colorExchange('LBANK')}: Ask=${chalk.white(FormattingUtils.formatPrice(lbankPrice.ask))} | Δ=${mexcBidVsLbankAskAbs != null ? chalk.white(mexcBidVsLbankAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(mexcBidVsLbankAskPct)})`);
    console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('LBANK')}: Bid=${chalk.white(FormattingUtils.formatPrice(lbankPrice.bid))} | ${FormattingUtils.colorExchange('MEXC')}: Ask=${chalk.white(FormattingUtils.formatPrice(mexcPrice.ask))} | Δ=${lbankBidVsMexcAskAbs != null ? chalk.white(lbankBidVsMexcAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(lbankBidVsMexcAskPct)})`);

    if (mexcOb && lbankOb) {
        const mexcBestBid = (mexcOb && Array.isArray(mexcOb.bids) && mexcOb.bids[0]) ? { price: mexcOb.bids[0][0], amount: mexcOb.bids[0][1] } :
            null;
        const mexcBestAsk = (mexcOb && Array.isArray(mexcOb.asks) && mexcOb.asks[0]) ? { price: mexcOb.asks[0][0], amount: mexcOb.asks[0][1] } :
            null;
        const lbankBestBid = (lbankOb && Array.isArray(lbankOb.bids) && lbankOb.bids[0]) ? { price: lbankOb.bids[0][0], amount: lbankOb.bids[0][1] } :
            null;
        const lbankBestAsk = (lbankOb && Array.isArray(lbankOb.asks) && lbankOb.asks[0]) ? { price: lbankOb.asks[0][0], amount: lbankOb.asks[0][1] } :
            null;

        console.log(`${FormattingUtils.label('DEPTH')} ${FormattingUtils.colorExchange('MEXC')}: bestBid=${mexcBestBid ? `${FormattingUtils.formatPrice(mexcBestBid.price)} x ${mexcBestBid.amount}` : chalk.yellow('n/a')} bestAsk=${mexcBestAsk ? `${FormattingUtils.formatPrice(mexcBestAsk.price)} x ${mexcBestAsk.amount}` : chalk.yellow('n/a')} | ` +
                    `${FormattingUtils.colorExchange('LBANK')}: bestBid=${lbankBestBid ? `${FormattingUtils.formatPrice(lbankBestBid.price)} x ${lbankBestBid.amount}` : chalk.yellow('n/a')} bestAsk=${lbankBestAsk ? `${FormattingUtils.formatPrice(lbankBestAsk.price)} x ${lbankBestAsk.amount}` : chalk.yellow('n/a')}`);
    }

    console.log(FormattingUtils.createSeparator());

    // Position opening logic
    if (lbankToMexcProfit >= config.profitThresholdPercent) {
        console.log(`${chalk.green('🎯')} Opening LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.green('(Profitable!)')}`);
        await tryOpenPosition(symbols.lbank, "lbank", "mexc", lbankPrice.ask, mexcPrice.bid);
    } else {
        console.log(`${chalk.yellow('⏳')} No LBANK->MEXC opp: ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.gray(`(Threshold: ${config.profitThresholdPercent}%)`)}`);
        console.log(`${chalk.blue('ℹ️ ')} MEXC->LBANK: ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)} ${chalk.gray('(not used)')}`);
    }

    // Position closing logic
    if (status.openPositionsCount > 0) {
        const closeThreshold = Math.abs(Number(config.scenarios.alireza.closeAtPercent));
        if (mexcAskVsLbankBidPct != null && mexcAskVsLbankBidPct <= closeThreshold) {
            console.log(`🎯 Closing eligible positions: mexcAskVsLbankBidPct (${FormattingUtils.formatPercentage(mexcAskVsLbankBidPct)}) >= ${FormattingUtils.formatPercentage(closeThreshold)}`);
            await tryClosePosition(symbols.lbank, lbankPrice.bid, mexcPrice.ask);
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
export const getPrice = priceService.getPrice.bind(priceService);