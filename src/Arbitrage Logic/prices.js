import { tryClosePosition, tryOpenPosition, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { ourbitPriceService, kcexPuppeteerService, xtPuppeteerService } from "./services/index.js";
import { CalculationUtils, FormattingUtils, computeSpreads } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";

// Deduplication caches for prints to reduce console noise
let lastTickKey = null;
let lastPriceData = null;
const lastPairPrint = new Map(); // key: "A->B", value: { left: askPrice, right: bidPrice }

// Track if error messages have been shown to avoid repetition
let errorMessagesShown = {
    mexc: false,
    kcex: false,
    xt: false,
    ourbit: false
};

// Removed unused profit logging helpers to simplify output

export async function printBidAskPairs(symbols, exchanges) {
    const prices = await ourbitPriceService.getPricesFromExchanges(exchanges, symbols);
    const ourbitPrice = prices.ourbit;

    // Get MEXC prices from exchange manager (futures) - dynamic symbol
    let mexcPrice = null;
    try {
        const mexcSymbol = (symbols && symbols.mexc) || (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT';
        mexcPrice = await exchangeManager.getMexcPrice(mexcSymbol);
    } catch (error) {
        if (!errorMessagesShown.mexc) {
            console.log(`⚠️ MEXC futures price fetch failed: ${error.message}`);
            errorMessagesShown.mexc = true;
        }
        mexcPrice = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'mexc',
            symbol: (symbols && symbols.mexc) || (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT',
            error: error.message
        };
    }

    // Get KCEX prices from Puppeteer service
    let kcexPrice = null;
    try {
        kcexPrice = await kcexPuppeteerService.extractPrices();
    } catch (error) {
        if (!errorMessagesShown.kcex) {
            console.log(`⚠️ KCEX price fetch failed: ${error.message}`);
            errorMessagesShown.kcex = true;
        }
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
        if (!errorMessagesShown.xt) {
            console.log(`⚠️ XT price fetch failed: ${error.message}`);
            errorMessagesShown.xt = true;
        }
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
        const ourbitSymbol = symbols.ourbit || (config.symbols && config.symbols.ourbit);
        ourbitOb = await ourbitPriceService.getOrderBook('ourbit', ourbitSymbol);
    } catch (error) {
        if (!errorMessagesShown.ourbit) {
            console.log(`⚠️ Ourbit order book fetch failed, using basic price data`);
            errorMessagesShown.ourbit = true;
        }
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

    // Only print arbitrage opportunities when they meet the threshold and are profitable
    for (let i = 0; i < enabledExchanges.length; i++) {
        for (let j = i + 1; j < enabledExchanges.length; j++) {
            const a = enabledExchanges[i];
            const b = enabledExchanges[j];
            
            // A ask -> B bid
            if (a.ask != null && b.bid != null) {
                const aToB = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                if (aToB >= config.profitThresholdPercent) {
                    console.log(`${a.id.toUpperCase()} ask=${FormattingUtils.formatPrice(a.ask)} | ${b.id.toUpperCase()} bid=${FormattingUtils.formatPrice(b.bid)} => ${FormattingUtils.formatPercentageColored(aToB)} ${chalk.green('(PROFITABLE!)')}`);
                }
            }
            
            // B ask -> A bid
            if (b.ask != null && a.bid != null) {
                const bToA = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                if (bToA >= config.profitThresholdPercent) {
                    console.log(`${b.id.toUpperCase()} ask=${FormattingUtils.formatPrice(b.ask)} | ${a.id.toUpperCase()} bid=${FormattingUtils.formatPrice(a.bid)} => ${FormattingUtils.formatPercentageColored(bToA)} ${chalk.green('(PROFITABLE!)')}`);
                }
            }
        }
    }

    if (ourbitOb && config.display.conciseOutput) {
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
        const openSymbol = symbols?.ourbit || (config.symbols && config.symbols.ourbit);
        await tryOpenPosition(openSymbol, "ourbit", "mexc", ourbitPrice.ask, mexcPrice.bid);
    } else {
        console.log(`${chalk.yellow('⏳')} No OURBIT->MEXC opp: ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.gray(`(Threshold: ${config.profitThresholdPercent}%)`)}`);
        console.log(`${chalk.blue('ℹ️ ')} MEXC->OURBIT: ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)} ${chalk.gray('(not used)')}`);
    }

    // Position closing logic (using Ourbit and MEXC data)
    if (status.openPositionsCount > 0) {
        const closeThreshold = Math.abs(Number(config.scenarios.alireza.closeAtPercent));
        if (mexcAskVsLbankBidPct != null && mexcAskVsLbankBidPct <= closeThreshold) {
            console.log(`🎯 Closing eligible positions: mexcAskVsOurbitBidPct (${FormattingUtils.formatPercentage(mexcAskVsLbankBidPct)}) >= ${FormattingUtils.formatPercentage(closeThreshold)}`);
            const closeSymbol = symbols?.ourbit || (config.symbols && config.symbols.ourbit);
            await tryClosePosition(closeSymbol, ourbitPrice.bid, mexcPrice.ask);
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