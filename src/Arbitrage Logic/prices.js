import config from "./config/config.js";
import { lbankPriceService, kcexPuppeteerService, xtPuppeteerService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";



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

// Track previous comparison results to avoid duplicate logs
let previousComparisons = new Map();

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

    // Check if any exchange data has changed
    let hasDataChanged = false;
    for (const exchange of enabledExchanges) {
        if (isNewData(exchange.id, { bid: exchange.bid, ask: exchange.ask })) {
            hasDataChanged = true;
            break;
        }
    }

    // Only proceed if data has changed
    if (!hasDataChanged) return;

    // Compare all exchange pairs and show percentages
    for (let i = 0; i < enabledExchanges.length; i++) {
        for (let j = i + 1; j < enabledExchanges.length; j++) {
            const a = enabledExchanges[i];
            const b = enabledExchanges[j];
            
            let hasComparisonChanged = false;
            
            // A ask -> B bid
            if (a.ask != null && b.bid != null) {
                const aToB = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                if (isNewComparison(`${a.id}-ask-${b.id}-bid`, aToB)) {
                    console.log(`Bid ${a.id.toUpperCase()} and Ask ${b.id.toUpperCase()} => ${FormattingUtils.formatPercentageColored(aToB)}`);
                    hasComparisonChanged = true;
                }
            }
            
            // B ask -> A bid
            if (b.ask != null && a.bid != null) {
                const bToA = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                if (isNewComparison(`${b.id}-ask-${a.id}-bid`, bToA)) {
                    console.log(`Bid ${b.id.toUpperCase()} and Ask ${a.id.toUpperCase()} => ${FormattingUtils.formatPercentageColored(bToA)}`);
                    hasComparisonChanged = true;
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