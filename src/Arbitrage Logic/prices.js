import { tryClosePosition, tryOpenPosition, openPositions, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { ourbitPriceService, kcexPuppeteerService, xtPuppeteerService } from "./services/index.js";
import { CalculationUtils, FormattingUtils, computeSpreads } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";

// Cache for storing last profit calculations to avoid duplicate logging
const lastProfits = new Map();
let lastTickKey = null;
let lastPriceData = null;
// Track last printed values per pair-direction to avoid spam
const lastPairPrint = new Map(); // key: "A->B", value: { left: askPrice, right: bidPrice }

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

    // Get KCEX prices from Puppeteer service
    let kcexPrice = null;
    try {
        kcexPrice = await kcexPuppeteerService.extractPrices();
    } catch (error) {
        console.log(`⚠️ KCEX price fetch failed: ${error.message}`);
        kcexPrice = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'kcex',
            symbol: 'BTC/USDT',
            error: error.message
        };
    }

    // Get XT prices from Puppeteer service (if enabled)
    let xtPrice = { bid: null, ask: null, exchangeId: 'xt', symbol: symbols.xt };
    try {
        if (config.xt.enabled) {
            if (!xtPuppeteerService.browser || !xtPuppeteerService.page) {
                await xtPuppeteerService.initialize();
            }
            xtPrice = await xtPuppeteerService.extractPrices();
        }
    } catch (error) {
        console.log(`⚠️ XT price fetch failed: ${error.message}`);
    }

    const tickKey = `${ourbitPrice && ourbitPrice.bid || 'n'}|${ourbitPrice && ourbitPrice.ask || 'n'}|${mexcPrice && mexcPrice.bid || 'n'}|${mexcPrice && mexcPrice.ask || 'n'}|${kcexPrice && kcexPrice.bid || 'n'}|${kcexPrice && kcexPrice.ask || 'n'}|${xtPrice && xtPrice.bid || 'n'}|${xtPrice && xtPrice.ask || 'n'}`;
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
        mexcBid: mexcPrice.bid,
        mexcAsk: mexcPrice.ask,
        lbankBid: ourbitPrice.bid,
        lbankAsk: ourbitPrice.ask
    });

    if (config.logSettings.enableDetailedLogging) {
        console.log(`${FormattingUtils.label('STATUS')} Open: ${chalk.yellow(status.openPositionsCount)} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)} | Trades: ${chalk.yellow(status.totalTrades)} | Invested: ${chalk.yellow(FormattingUtils.formatCurrency(status.totalInvestment))} | Tokens: ${chalk.yellow(FormattingUtils.formatVolume(status.totalOpenTokens ?? 0))}`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('MEXC')}: Bid=${chalk.white(FormattingUtils.formatPrice(mexcPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(mexcPrice.ask))} | Δ=${mexcBidVsLbankAskAbs != null ? chalk.white(mexcBidVsLbankAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(mexcBidVsLbankAskPct)})`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('OURBIT')}: Bid=${chalk.white(FormattingUtils.formatPrice(ourbitPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(ourbitPrice.ask))} | Δ=${lbankBidVsMexcAskAbs != null ? chalk.white(lbankBidVsMexcAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(lbankBidVsMexcAskPct)})`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('KCEX')}: Bid=${chalk.white(FormattingUtils.formatPrice(kcexPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(kcexPrice.ask))}`);
        if (config.xt.enabled) console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('XT')}: Bid=${chalk.white(FormattingUtils.formatPrice(xtPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(xtPrice.ask))}`);
    }

    // Only show concise pairwise arbitrage outputs for enabled exchanges
    const enabledExchanges = [];
    const mexcEnabled = !(config && config.mexc && config.mexc.enabled === false);
    if (mexcEnabled) enabledExchanges.push({ id: 'mexc', bid: mexcPrice.bid, ask: mexcPrice.ask });
    if (config.ourbit.enabled) enabledExchanges.push({ id: 'ourbit', bid: ourbitPrice.bid, ask: ourbitPrice.ask });
    if (config.kcex.enabled) enabledExchanges.push({ id: 'kcex', bid: kcexPrice.bid, ask: kcexPrice.ask });
    if (config.xt.enabled) enabledExchanges.push({ id: 'xt', bid: xtPrice.bid, ask: xtPrice.ask });

    // Only print a single pair structure: [PAIR] A ask=... | B bid=... => pct
    // And only when BOTH values changed since last print for that direction
    for (let i = 0; i < enabledExchanges.length; i++) {
        for (let j = i + 1; j < enabledExchanges.length; j++) {
            const a = enabledExchanges[i];
            const b = enabledExchanges[j];
            let printedAny = false;
            // A ask -> B bid
            if (a.ask != null && b.bid != null) {
                const keyAB = `${a.id}->${b.id}`;
                const lastAB = lastPairPrint.get(keyAB);
                const bothChangedAB = lastAB ? (lastAB.left !== a.ask && lastAB.right !== b.bid) : true;
                if (bothChangedAB) {
                    const aToB = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                    console.log(`${a.id.toUpperCase()} ask=${FormattingUtils.formatPrice(a.ask)} | ${b.id.toUpperCase()} bid=${FormattingUtils.formatPrice(b.bid)} => ${FormattingUtils.formatPercentageColored(aToB)} ${aToB >= config.profitThresholdPercent ? chalk.green('(OPEN POSITION)') : ''}`);
                    lastPairPrint.set(keyAB, { left: a.ask, right: b.bid });
                    printedAny = true;
                }
            }
            // B ask -> A bid
            if (b.ask != null && a.bid != null) {
                const keyBA = `${b.id}->${a.id}`;
                const lastBA = lastPairPrint.get(keyBA);
                const bothChangedBA = lastBA ? (lastBA.left !== b.ask && lastBA.right !== a.bid) : true;
                if (bothChangedBA) {
                    const bToA = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                    console.log(`${b.id.toUpperCase()} ask=${FormattingUtils.formatPrice(b.ask)} | ${a.id.toUpperCase()} bid=${FormattingUtils.formatPrice(a.bid)} => ${FormattingUtils.formatPercentageColored(bToA)} ${bToA >= config.profitThresholdPercent ? chalk.green('(OPEN POSITION)') : ''}`);
                    lastPairPrint.set(keyBA, { left: b.ask, right: a.bid });
                    printedAny = true;
                }
            }
            if (printedAny && config.display && config.display.conciseOutput) {
                console.log(FormattingUtils.createSeparator());
            }
        }
    }

    if (ourbitOb) {
        const ourbitBestBid = (ourbitOb && Array.isArray(ourbitOb.bids) && ourbitOb.bids[0]) ? { price: ourbitOb.bids[0][0], amount: ourbitOb.bids[0][1] } :
            null;
        const ourbitBestAsk = (ourbitOb && Array.isArray(ourbitOb.asks) && ourbitOb.asks[0]) ? { price: ourbitOb.asks[0][0], amount: ourbitOb.asks[0][1] } :
            null;

        // Print only depth line if conciseOutput is enabled
        console.log(`${FormattingUtils.label('DEPTH')} ${FormattingUtils.colorExchange('OURBIT')}: bestBid=${ourbitBestBid ? `${FormattingUtils.formatPrice(ourbitBestBid.price)} x ${ourbitBestBid.amount}` : chalk.yellow('n/a')} bestAsk=${ourbitBestAsk ? `${FormattingUtils.formatPrice(ourbitBestAsk.price)} x ${ourbitBestAsk.amount}` : chalk.yellow('n/a')}`);
    }

    if (!config.display?.conciseOutput) {
        console.log(FormattingUtils.createSeparator());
    }

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

    if (config.logSettings.printStatusToConsole && !config.display?.conciseOutput) {
        console.log(`${FormattingUtils.label(new Date().toLocaleTimeString())} ${status.openPositionsCount > 0 ? chalk.yellow(`${status.openPositionsCount} open`) : chalk.gray('No Position')} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)}`);
        if (status.openPositionsCount > 0) console.log(FormattingUtils.createSeparator());
    }
}

// Re-export for backward compatibility
export const getPrice = ourbitPriceService.getPrice.bind(ourbitPriceService);