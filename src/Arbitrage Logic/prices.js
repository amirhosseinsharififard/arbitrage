import config from "./config/config.js";
import { lbankPriceService, kcexPuppeteerService, xtPuppeteerService, dexscreenerPuppeteerService, dexscreenerApiService } from "./services/index.js";
import { CalculationUtils, FormattingUtils } from "./utils/index.js";
import chalk from "chalk";
import exchangeManager from "./exchanges/exchangeManager.js";
import logUpdate from "log-update";

// Global reference to web interface for data broadcasting
let webInterfaceInstance = null;

// Function to set web interface instance
export function setWebInterface(webInterface) {
    webInterfaceInstance = webInterface;
}



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

// Store current log content for real-time updates
let currentLogContent = '';

// Function to check if data is new (different from previous)
function isNewData(exchangeId, newData) {
    const prev = previousData[exchangeId];
    if (!prev) return true;

    // For DEX exchanges, only compare bid prices
    if (newData.isDEX) {
        if (newData.bid !== prev.bid) {
            previousData[exchangeId] = {...newData };
            return true;
        }
    } else {
        // For regular exchanges, compare both bid and ask prices
        if (newData.bid !== prev.bid || newData.ask !== prev.ask) {
            previousData[exchangeId] = {...newData };
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

// Function to log exchange data - DISABLED
function logExchangeData(exchangeId, data, isEnabled = true) {
    // No logging needed - disabled as requested
    return;
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
            // Initialize KCEX service if not already initialized
            if (!kcexPuppeteerService.browser || !kcexPuppeteerService.page) {
                await kcexPuppeteerService.initialize();
            }
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
            symbol: 'BSU/USDT',
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

    // Get DexScreener+ prices (prefer API; fallback to Puppeteer) (DEX - bid only)
    let dexscreenerPrice = { bid: null, ask: null, exchangeId: 'dexscreener', symbol: symbols.dexscreener, isDEX: true };
    try {
        if (config.dexscreener.enabled) {
            if (config.dexscreener.useApi) {
                const options = {};
                if (config.dexscreener.usePairAddress && config.dexscreener.pairAddress) {
                    options.pairAddress = config.dexscreener.pairAddress;
                }
                dexscreenerPrice = await dexscreenerApiService.getBidPriceByToken(config.dexscreener.contractAddress, config.dexscreener.network, options);
            } else {
                if (!dexscreenerPuppeteerService.browser || !dexscreenerPuppeteerService.page) {
                    await dexscreenerPuppeteerService.initialize();
                }
                dexscreenerPrice = await dexscreenerPuppeteerService.extractPrices();
            }

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

    // Build log content for real-time updates
    let logLines = [];

    // Add timestamp
    logLines.push(`🕐 ${new Date().toLocaleTimeString()}`);
    logLines.push('');

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
                    const aBidToBAsk = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                    if (isNewComparison(`${a.id}-bid-${b.id}-ask`, aBidToBAsk)) {
                        logLines.push(`🟢 DEX ${a.id.toUpperCase()}(Bid:$${a.bid}) -> ${b.id.toUpperCase()}(Ask:$${b.ask}) => ${FormattingUtils.formatPercentageColored(aBidToBAsk)}`);
                        hasComparisonChanged = true;
                    }
                }
            } else if (b.isDEX) {
                // B is DEX (bid-only), A is regular exchange
                let dexComparisons = 0;

                // Compare A bid with B bid (buy on A, sell on B)
                if (a.bid != null && b.bid != null) {
                    const aBidToBBid = CalculationUtils.calculatePriceDifference(b.bid, a.bid);
                    if (isNewComparison(`${a.id}-bid-${b.id}-bid`, aBidToBBid)) {
                        logLines.push(`🟢 ${a.id.toUpperCase()}(Bid:$${a.bid}) -> DEX ${b.id.toUpperCase()}(Bid:$${b.bid}) => ${FormattingUtils.formatPercentageColored(aBidToBBid)}`);
                        hasComparisonChanged = true;
                        dexComparisons++;
                    }
                }

                // Compare A ask with B bid (sell on A, buy on B)
                if (a.ask != null && b.bid != null) {
                    const aAskToBBid = CalculationUtils.calculatePriceDifference(b.bid, a.ask);
                    if (isNewComparison(`${a.id}-ask-${b.id}-bid`, aAskToBBid)) {
                        logLines.push(`🟢 ${a.id.toUpperCase()}(Ask:$${a.ask}) -> DEX ${b.id.toUpperCase()}(Bid:$${b.bid}) => ${FormattingUtils.formatPercentageColored(aAskToBBid)}`);
                        hasComparisonChanged = true;
                        dexComparisons++;
                    }
                }

                // Add divider between DEX comparisons if both were shown
                if (dexComparisons >= 2) {
                    logLines.push("=".repeat(60));
                }
            } else {
                // Both are regular exchanges - normal arbitrage comparison
                // A ask -> B bid
                if (a.ask != null && b.bid != null) {
                    const aToB = CalculationUtils.calculatePriceDifference(a.ask, b.bid);
                    if (isNewComparison(`${a.id}-ask-${b.id}-bid`, aToB)) {
                        logLines.push(`📈 ${a.id.toUpperCase()}(Ask:$${a.ask}) -> ${b.id.toUpperCase()}(Bid:$${b.bid}) => ${FormattingUtils.formatPercentageColored(aToB)}`);
                        hasComparisonChanged = true;
                    }
                }

                // B ask -> A bid
                if (b.ask != null && a.bid != null) {
                    const bToA = CalculationUtils.calculatePriceDifference(b.ask, a.bid);
                    if (isNewComparison(`${b.id}-ask-${a.id}-bid`, bToA)) {
                        logLines.push(`📈 ${b.id.toUpperCase()}(Ask:$${b.ask}) -> ${a.id.toUpperCase()}(Bid:$${a.bid}) => ${FormattingUtils.formatPercentageColored(bToA)}`);
                        hasComparisonChanged = true;
                    }
                }
            }
        }
    }

    // Update the log content and display it
    currentLogContent = logLines.join('\n');
    logUpdate(currentLogContent);

    // Prepare exchange data for web interface
    const exchangeDataForWeb = {
        exchanges: {}
    };

    // Add exchange prices
    if (lbankPrice && lbankPrice.bid !== null) {
        exchangeDataForWeb.exchanges.lbank = {
            name: 'LBank',
            bid: lbankPrice.bid,
            ask: lbankPrice.ask,
            symbol: 'DEBT/USDT', // Normalize symbol
            timestamp: lbankPrice.timestamp
        };
    }

    if (mexcPrice && mexcPrice.bid !== null) {
        exchangeDataForWeb.exchanges.mexc = {
            name: 'MEXC',
            bid: mexcPrice.bid,
            ask: mexcPrice.ask,
            symbol: 'DEBT/USDT', // Normalize symbol
            timestamp: mexcPrice.timestamp
        };
    }

    if (kcexPrice && kcexPrice.bid !== null) {
        exchangeDataForWeb.exchanges.kcex = {
            name: 'KCEX',
            bid: kcexPrice.bid,
            ask: kcexPrice.ask,
            symbol: 'DEBT/USDT', // Normalize symbol
            timestamp: kcexPrice.timestamp
        };
    }



    if (dexscreenerPrice && dexscreenerPrice.bid !== null) {
        exchangeDataForWeb.exchanges.dexscreener = {
            name: 'DexScreener',
            bid: dexscreenerPrice.bid,
            ask: dexscreenerPrice.ask,
            symbol: 'DEBT/USDT', // Normalize symbol
            isDEX: true,
            timestamp: dexscreenerPrice.timestamp
        };
    }



    // Broadcast data update to web interface if available
    if (webInterfaceInstance) {
        webInterfaceInstance.updateExchangeData(exchangeDataForWeb);
        webInterfaceInstance.broadcastDataUpdate();
    }


}

// Re-export for backward compatibility
export const getPrice = lbankPriceService.getPrice.bind(lbankPriceService);