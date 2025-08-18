import config from "./config/config.js";
import { lbankPriceService, kcexPuppeteerService, xtPuppeteerService, dexscreenerPuppeteerService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";



// Track if error messages have been shown to avoid repetition
let errorMessagesShown = {
    mexc: false,
    kcex: false,
    xt: false,
    lbank: false,
    dexscreener: false
};

// Track previous data to only show new data
let previousData = {
    lbank: null,
    mexc: null,
    kcex: null,
    xt: null,
    dexscreener: null
};

// Track previous comparison results to avoid duplicate logs
let previousComparisons = new Map();

// Function to check if data is new (different from previous)
function isNewData(exchangeId, newData) {
    const prev = previousData[exchangeId];
    if (!prev) return true;
    
    // For DEX exchanges, only compare bid prices
    if (newData.isDEX) {
        if (newData.bid !== prev.bid) {
            previousData[exchangeId] = { ...newData };
            return true;
        }
    } else {
        // For regular exchanges, compare both bid and ask prices
        if (newData.bid !== prev.bid || newData.ask !== prev.ask) {
            previousData[exchangeId] = { ...newData };
            return true;
        }
    }
    return false;
}

// Function to check if comparison result is new
function isNewComparison(exchangeA, exchangeB, result) {
    const key = `${exchangeA}-${exchangeB}`;
    const prev = previousComparisons.get(key);
    
    if (!prev || Math.abs(prev - result) > 0.001) {
        previousComparisons.set(key, result);
        return true;
    }
    return false;
}

// Function to log exchange data
function logExchangeData(exchangeId, data, isEnabled = true) {
    if (!isEnabled) return;
    
    // Add divider to separate new data from old data
    console.log("=".repeat(60));
    
    if (data && data.isDEX) {
        // DEX exchange - only bid price available
        if (data.bid !== null) {
            console.log(`🟢 ${exchangeId.toUpperCase()} (DEX): Bid=${chalk.white(FormattingUtils.formatPrice(data.bid))} | Ask=N/A (DEX) | Time=${new Date().toLocaleTimeString()}`);
        } else if (data.error) {
            console.log(`❌ ${exchangeId.toUpperCase()} (DEX): Error - ${data.error}`);
        } else {
            console.log(`⚠️ ${exchangeId.toUpperCase()} (DEX): No bid data available`);
        }
    } else if (data && data.bid !== null && data.ask !== null) {
        // Regular exchange - both bid and ask prices
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

    // Get DexScreener+ prices from Puppeteer service (DEX - bid only)
    let dexscreenerPrice = { bid: null, ask: null, exchangeId: 'dexscreener', symbol: symbols.dexscreener, isDEX: true };
    try {
        if (config.dexscreener.enabled) {
            if (!dexscreenerPuppeteerService.browser || !dexscreenerPuppeteerService.page) {
                await dexscreenerPuppeteerService.initialize();
            }
            dexscreenerPrice = await dexscreenerPuppeteerService.extractPrices();
            
            // Log DexScreener+ data if enabled and new
            if (isNewData('dexscreener', dexscreenerPrice)) {
                logExchangeData('dexscreener', dexscreenerPrice, config.dexscreener.enabled);
            }
        }
    } catch (error) {
        if (!errorMessagesShown.dexscreener) {
            console.log(`⚠️ DexScreener+ price fetch failed: ${error.message}`);
            errorMessagesShown.dexscreener = true;
        }
    }





    // Only show concise pairwise arbitrage outputs for enabled exchanges
    const enabledExchanges = [];
    if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
        enabledExchanges.push({ id: 'mexc', bid: mexcPrice.bid, ask: mexcPrice.ask, symbol: mexcPrice.symbol });
    }
    if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
        enabledExchanges.push({ id: 'lbank', bid: lbankPrice.bid, ask: lbankPrice.ask, symbol: lbankPrice.symbol });
    }
    if (config.kcex.enabled) enabledExchanges.push({ id: 'kcex', bid: kcexPrice.bid, ask: kcexPrice.ask, symbol: kcexPrice.symbol });
    if (config.xt.enabled) enabledExchanges.push({ id: 'xt', bid: xtPrice.bid, ask: xtPrice.ask, symbol: xtPrice.symbol });
    if (config.dexscreener.enabled) enabledExchanges.push({ id: 'dexscreener', bid: dexscreenerPrice.bid, ask: dexscreenerPrice.ask, symbol: dexscreenerPrice.symbol, isDEX: true });

    // Check if any exchange data has changed
    let hasDataChanged = false;
    for (const exchange of enabledExchanges) {
        if (isNewData(exchange.id, { bid: exchange.bid, ask: exchange.ask, isDEX: exchange.isDEX })) {
            hasDataChanged = true;
            break;
        }
    }

    // Only proceed if data has changed
    if (!hasDataChanged) return;

    // Show symbols for all exchanges (except DEX)
    console.log("📋 Exchange Symbols:");
    for (const exchange of enabledExchanges) {
        if (!exchange.isDEX) {
            console.log(`   ${exchange.id.toUpperCase()}: ${exchange.symbol || 'N/A'}`);
        }
    }
    console.log("=".repeat(60));

    // Compare all exchange pairs and show percentages
    for (let i = 0; i < enabledExchanges.length; i++) {
        for (let j = i + 1; j < enabledExchanges.length; j++) {
            const a = enabledExchanges[i];
            const b = enabledExchanges[j];
            
            let hasComparisonChanged = false;
            
            // Handle DEX exchanges (bid-only)
            if (a.isDEX && b.isDEX) {
                // Both are DEX - skip comparison as they only have bid prices
                continue;
            } else if (a.isDEX) {
                // A is DEX (bid-only), B is regular exchange
                // Compare A bid with B ask (sell on A, buy on B)
                if (a.bid != null && b.ask != null) {
                    const aBidToBAsk = CalculationUtils.calculatePriceDifference(a.bid, b.ask);
                    if (isNewComparison(`${a.id}-bid-${b.id}-ask`, aBidToBAsk)) {
                        console.log(`🟢 DEX ${a.id.toUpperCase()}(Bid) -> ${b.id.toUpperCase()}(Ask) => ${FormattingUtils.formatPercentageColored(aBidToBAsk)}`);
                        hasComparisonChanged = true;
                    }
                }
            } else if (b.isDEX) {
                // B is DEX (bid-only), A is regular exchange
                // Compare A ask with B bid (sell on A, buy on B)
                if (a.ask != null && b.bid != null) {
                    const aAskToBBid = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                    if (isNewComparison(`${a.id}-ask-${b.id}-bid`, aAskToBBid)) {
                        console.log(`🟢 ${a.id.toUpperCase()}(Ask) -> DEX ${b.id.toUpperCase()}(Bid) => ${FormattingUtils.formatPercentageColored(aAskToBBid)}`);
                        hasComparisonChanged = true;
                    }
                }
            } else {
                // Both are regular exchanges - normal arbitrage comparison
                // A ask -> B bid
                if (a.ask != null && b.bid != null) {
                    const aToB = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                    if (isNewComparison(`${a.id}-ask-${b.id}-bid`, aToB)) {
                        console.log(`📈 ${a.id.toUpperCase()}(Ask) -> ${b.id.toUpperCase()}(Bid) => ${FormattingUtils.formatPercentageColored(aToB)}`);
                        hasComparisonChanged = true;
                    }
                }
                
                // B ask -> A bid
                if (b.ask != null && a.bid != null) {
                    const bToA = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                    if (isNewComparison(`${b.id}-ask-${a.id}-bid`, bToA)) {
                        console.log(`📈 ${b.id.toUpperCase()}(Ask) -> ${a.id.toUpperCase()}(Bid) => ${FormattingUtils.formatPercentageColored(bToA)}`);
                        hasComparisonChanged = true;
                    }
                }
            }
            
            // Add divider if any comparison changed for this pair
            if (hasComparisonChanged) {
                console.log("=".repeat(60));
            }
        }
    }


}

// Re-export for backward compatibility
export const getPrice = lbankPriceService.getPrice.bind(lbankPriceService);