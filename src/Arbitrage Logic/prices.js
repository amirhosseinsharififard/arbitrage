import { tryClosePosition, tryOpenPosition, getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import config from "./config/config.js";
import { lbankPriceService, kcexPuppeteerService, xtPuppeteerService } from "./services/index.js";
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
    lbank: false
};

// Track previous data to only show new data
let previousData = {
    lbank: null,
    mexc: null,
    kcex: null,
    xt: null
};

// Function to check if data is new (different from previous)
function isNewData(exchangeId, newData) {
    const prev = previousData[exchangeId];
    if (!prev) return true;
    
    // Compare bid and ask prices
    if (newData.bid !== prev.bid || newData.ask !== prev.ask) {
        previousData[exchangeId] = { ...newData };
        return true;
    }
    return false;
}

// Function to log exchange data
function logExchangeData(exchangeId, data, isEnabled = true) {
    if (!isEnabled) return;
    
    // Add divider to separate new data from old data
    console.log("=".repeat(60));
    
    if (data && data.bid !== null && data.ask !== null) {
        console.log(`📊 ${exchangeId.toUpperCase()}: Bid=${chalk.white(FormattingUtils.formatPrice(data.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(data.ask))} | Time=${new Date().toLocaleTimeString()}`);
    } else if (data && data.error) {
        console.log(`❌ ${exchangeId.toUpperCase()}: Error - ${data.error}`);
    } else {
        console.log(`⚠️ ${exchangeId.toUpperCase()}: No data available`);
    }
}

export async function printBidAskPairs(symbols, exchanges) {
    // Get LBank prices from LBank price service (only if enabled)
    let lbankPrice = null;
    if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
        try {
            const lbankSymbol = (symbols && symbols.lbank) || (config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT';
            lbankPrice = await lbankPriceService.getPrice('lbank', lbankSymbol);
            
            // Log LBank data if new
            if (isNewData('lbank', lbankPrice)) {
                logExchangeData('lbank', lbankPrice, true);
            }
        } catch (error) {
            if (!errorMessagesShown.lbank) {
                console.log(`⚠️ LBank price fetch failed: ${error.message}`);
                errorMessagesShown.lbank = true;
            }
            lbankPrice = {
                bid: null,
                ask: null,
                timestamp: Date.now(),
                exchangeId: 'lbank',
                symbol: (symbols && symbols.lbank) || (config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT',
                error: error.message
            };
        }
    } else {
        lbankPrice = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'lbank',
            symbol: (symbols && symbols.lbank) || (config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT',
            error: 'LBank exchange disabled'
        };
    }

    // Get MEXC prices from exchange manager (futures) - only if enabled
    let mexcPrice = null;
    if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
        try {
            const mexcSymbol = (symbols && symbols.mexc) || (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT';
            mexcPrice = await exchangeManager.getMexcPrice(mexcSymbol);
            
            // Log MEXC data if new
            if (isNewData('mexc', mexcPrice)) {
                logExchangeData('mexc', mexcPrice, true);
            }
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
    } else {
        mexcPrice = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'mexc',
            symbol: (symbols && symbols.mexc) || (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT',
            error: 'MEXC exchange disabled'
        };
    }

    // Get KCEX prices from Puppeteer service
    let kcexPrice = null;
    try {
        if (config.kcex.enabled) {
            kcexPrice = await kcexPuppeteerService.extractPrices();
            
            // Log KCEX data if enabled and new
            if (isNewData('kcex', kcexPrice)) {
                logExchangeData('kcex', kcexPrice, config.kcex.enabled);
            }
        }
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
            
            // Log XT data if enabled and new
            if (isNewData('xt', xtPrice)) {
                logExchangeData('xt', xtPrice, config.xt.enabled);
            }
        }
    } catch (error) {
        if (!errorMessagesShown.xt) {
            console.log(`⚠️ XT price fetch failed: ${error.message}`);
            errorMessagesShown.xt = true;
        }
    }

    const tickKey = `${lbankPrice && lbankPrice.bid || 'n'}|${lbankPrice && lbankPrice.ask || 'n'}|${mexcPrice && mexcPrice.bid || 'n'}|${mexcPrice && mexcPrice.ask || 'n'}|${kcexPrice && kcexPrice.bid || 'n'}|${kcexPrice && kcexPrice.ask || 'n'}|${xtPrice && xtPrice.bid || 'n'}|${xtPrice && xtPrice.ask || 'n'}`;
    if (tickKey === lastTickKey) return;
    lastTickKey = tickKey;

    // Check if prices have actually changed significantly
    const priceChanged = !lastPriceData ||
        Math.abs((lbankPrice && lbankPrice.bid || 0) - (lastPriceData && lastPriceData.bid || 0)) > 0.000001 ||
        Math.abs((lbankPrice && lbankPrice.ask || 0) - (lastPriceData && lastPriceData.ask || 0)) > 0.000001;

    if (!priceChanged) return;

    lastPriceData = { bid: lbankPrice && lbankPrice.bid, ask: lbankPrice && lbankPrice.ask };

    let lbankOb;
    try {
        const lbankSymbol = symbols.lbank || (config.symbols && config.symbols.lbank);
        const lbankExchange = exchangeManager.getExchange('lbank');
        lbankOb = await lbankExchange.fetchOrderBook(lbankSymbol);
    } catch (error) {
        if (!errorMessagesShown.lbank) {
            console.log(`⚠️ LBank order book fetch failed, using basic price data`);
            errorMessagesShown.lbank = true;
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
        lbankBid: lbankPrice.bid,
        lbankAsk: lbankPrice.ask
    });

    if (config.logSettings.enableDetailedLogging) {
        console.log(`${FormattingUtils.label('STATUS')} Open: ${chalk.yellow(status.openPositionsCount)} | P&L: ${FormattingUtils.formatCurrencyColored(status.totalProfit)} | Trades: ${chalk.yellow(status.totalTrades)} | Invested: ${chalk.yellow(FormattingUtils.formatCurrency(status.totalInvestment))} | Tokens: ${chalk.yellow(FormattingUtils.formatVolume(status.totalOpenTokens ?? 0))}`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('MEXC')}: Bid=${chalk.white(FormattingUtils.formatPrice(mexcPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(mexcPrice.ask))} | Δ=${mexcBidVsLbankAskAbs != null ? chalk.white(mexcBidVsLbankAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(mexcBidVsLbankAskPct)})`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('LBANK')}: Bid=${chalk.white(FormattingUtils.formatPrice(lbankPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(lbankPrice.ask))} | Δ=${lbankBidVsMexcAskAbs != null ? chalk.white(lbankBidVsMexcAskAbs.toFixed(6)) : chalk.yellow('n/a')} (${FormattingUtils.formatPercentageColored(lbankBidVsMexcAskPct)})`);
        console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('KCEX')}: Bid=${chalk.white(FormattingUtils.formatPrice(kcexPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(kcexPrice.ask))}`);
        if (config.xt.enabled) console.log(`${FormattingUtils.label('PRICES')} ${FormattingUtils.colorExchange('XT')}: Bid=${chalk.white(FormattingUtils.formatPrice(xtPrice.bid))} | Ask=${chalk.white(FormattingUtils.formatPrice(xtPrice.ask))}`);
    }

    // Only show concise pairwise arbitrage outputs for enabled exchanges
    const enabledExchanges = [];
    if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
        enabledExchanges.push({ id: 'mexc', bid: mexcPrice.bid, ask: mexcPrice.ask });
    }
    if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
        enabledExchanges.push({ id: 'lbank', bid: lbankPrice.bid, ask: lbankPrice.ask });
    }
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

    if (lbankOb && config.display.conciseOutput) {
        const lbankBestBid = (lbankOb && Array.isArray(lbankOb.bids) && lbankOb.bids[0]) ? { price: lbankOb.bids[0][0], amount: lbankOb.bids[0][1] } :
            null;
        const lbankBestAsk = (lbankOb && Array.isArray(lbankOb.asks) && lbankOb.asks[0]) ? { price: lbankOb.asks[0][0], amount: lbankOb.asks[0][1] } :
            null;

        // Print only depth line if conciseOutput is enabled
        console.log(`${FormattingUtils.label('DEPTH')} ${FormattingUtils.colorExchange('LBANK')}: bestBid=${lbankBestBid ? `${FormattingUtils.formatPrice(lbankBestBid.price)} x ${lbankBestBid.amount}` : chalk.yellow('n/a')} bestAsk=${lbankBestAsk ? `${FormattingUtils.formatPrice(lbankBestAsk.price)} x ${lbankBestAsk.amount}` : chalk.yellow('n/a')}`);
    }

    if (!config.display?.conciseOutput) {
        console.log(FormattingUtils.createSeparator());
    }

    // Position opening logic (using LBank and MEXC data)
    if (lbankToMexcProfit >= config.profitThresholdPercent) {
        console.log(`${chalk.green('🎯')} Opening LBANK(ask)->MEXC(bid): ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.green('(Profitable!)')}`);
        const openSymbol = symbols?.lbank || (config.symbols && config.symbols.lbank);
        await tryOpenPosition(openSymbol, "lbank", "mexc", lbankPrice.ask, mexcPrice.bid);
    } else {
        console.log(`${chalk.yellow('⏳')} No LBANK->MEXC opp: ${FormattingUtils.formatPercentageColored(lbankToMexcProfit)} ${chalk.gray(`(Threshold: ${config.profitThresholdPercent}%)`)}`);
        console.log(`${chalk.blue('ℹ️ ')} MEXC->LBANK: ${FormattingUtils.formatPercentageColored(mexcToLbankProfit)} ${chalk.gray('(not used)')}`);
    }

    // Position closing logic (using LBank and MEXC data)
    if (status.openPositionsCount > 0) {
        const closeThreshold = Math.abs(Number(config.scenarios.alireza.closeAtPercent));
        if (mexcAskVsLbankBidPct != null && mexcAskVsLbankBidPct <= closeThreshold) {
            console.log(`🎯 Closing eligible positions: mexcAskVsLbankBidPct (${FormattingUtils.formatPercentage(mexcAskVsLbankBidPct)}) >= ${FormattingUtils.formatPercentage(closeThreshold)}`);
            const closeSymbol = symbols?.lbank || (config.symbols && config.symbols.lbank);
            await tryClosePosition(closeSymbol, lbankPrice.bid, mexcPrice.ask);
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
export const getPrice = lbankPriceService.getPrice.bind(lbankPriceService);