/**
 * Multi-Currency Arbitrage Manager
 * Handles arbitrage calculations for multiple currencies simultaneously
 */

import { getCurrencyConfig, getAvailableCurrencies, getEnabledExchanges } from "../config/multiCurrencyConfig.js";
import { lbankPriceService, kcexPuppeteerService, dexscreenerApiService, xtPuppeteerService } from "../services/index.js";
import ourbitPuppeteerService from "../../puppeteer/index.js";
import { calculationManager, FormattingUtils } from "../utils/index.js";
import chalk from "chalk";
import exchangeManager from "../exchanges/exchangeManager.js";
import dataManager from "./dataManager.js";
import requestManager from "../utils/requestManager.js";
import dataUpdateManager from "../utils/dataUpdateManager.js";

let webInterfaceInstance = null;
let previousData = {};
let errorMessagesShown = {};
let latestArbitrageData = {};

export function setWebInterface(webInterface) {
    webInterfaceInstance = webInterface;
}

export function getLatestArbitrageData() {
    return latestArbitrageData;
}

function initializeErrorTracking(currencyCode) {
    if (!errorMessagesShown[currencyCode]) {
        errorMessagesShown[currencyCode] = {
            mexc: false,
            kcex: false,
            xt: false,
            ourbit: false,
            lbank: false,
            dexscreener: false
        };
    }
}

async function getExchangePrice(currencyCode, exchangeId, config) {
    try {
        switch (exchangeId) {
            case 'lbank':
                if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        return await lbankPriceService.getPrice('lbank', config.symbols.lbank);
                    });
                }
                break;
            case 'mexc':
                if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        const exchanges = exchangeManager.getAllExchanges();
                        const mexcExchange = exchanges.get('mexc');
                        if (mexcExchange) {
                            const ticker = await mexcExchange.fetchTicker(config.symbols.mexc);
                            return { bid: parseFloat(ticker.bid), ask: parseFloat(ticker.ask), isDEX: false };
                        }
                        return null;
                    });
                }
                break;
            case 'kcex':
                if (config.exchanges.kcex && config.exchanges.kcex.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        // Set dynamic config for this currency
                        kcexPuppeteerService.setConfig(config);

                        // Initialize KCEX service if not already initialized
                        if (!kcexPuppeteerService.browser || !kcexPuppeteerService.page) {
                            await kcexPuppeteerService.initialize();
                        }
                        return await kcexPuppeteerService.extractPrices();
                    });
                }
                break;
            case 'xt':
                if (config.exchanges.xt && config.exchanges.xt.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        xtPuppeteerService.setConfig(config);
                        if (!xtPuppeteerService.browser || !xtPuppeteerService.page) {
                            await xtPuppeteerService.initialize();
                        }
                        return await xtPuppeteerService.extractPrices();
                    });
                }
                break;
            case 'ourbit':
                if (config.exchanges.ourbit && config.exchanges.ourbit.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        ourbitPuppeteerService.setConfig(config);
                        if (!ourbitPuppeteerService.browser || !ourbitPuppeteerService.page) {
                            await ourbitPuppeteerService.initialize();
                        }

                        // Try multiple times to get prices (OurBit needs more time)
                        let priceData = null;
                        for (let attempt = 1; attempt <= 5; attempt++) {
                            try {
                                priceData = await ourbitPuppeteerService.extractPrices();
                                if (priceData && priceData.bid && priceData.ask) {
                                    break;
                                }
                            } catch (error) {
                                if (attempt === 5) {
                                    throw error;
                                }
                            }
                        }
                        return priceData;
                    });
                }
                break;
            case 'dexscreener':
                if (config.exchanges.dexscreener && config.exchanges.dexscreener.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        return await dexscreenerApiService.getPrice(config.symbols.dexscreener);
                    });
                }
                break;
        }
        return null;
    } catch (error) {
        console.error(`❌ Error fetching ${exchangeId} price for ${currencyCode}: ${error.message}`);
        return null;
    }
}

// OPTIMIZED: Fetch all exchange prices in parallel for much faster data updates
async function getAllExchangePrices(currencyCode, config) {
    const enabledExchanges = getEnabledExchanges(config);
    const pricePromises = enabledExchanges.map(exchangeId =>
        getExchangePrice(currencyCode, exchangeId, config)
    );

    // Execute all price fetches in parallel
    const results = await Promise.allSettled(pricePromises);

    const prices = {};
    enabledExchanges.forEach((exchangeId, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value) {
            prices[exchangeId] = result.value;
        }
    });

    return prices;
}

function calculateArbitrageOpportunities(currencyCode, prices, config) {
    const opportunities = [];
    const allCalculations = []; // Store all calculations for web interface
    const exchanges = Object.keys(prices).filter(id => prices[id] !== null);

    // Separate DEX and CEX exchanges dynamically
    const dexExchanges = exchanges.filter(ex => prices[ex].isDEX);
    const cexExchanges = exchanges.filter(ex => !(prices[ex].isDEX));

    // Log exchange discovery for debugging
    if (cexExchanges.length > 0) {
        console.log(`🔍 ${currencyCode}: Found ${cexExchanges.length} CEX exchanges: ${cexExchanges.join(', ')}`);
    }
    if (dexExchanges.length > 0) {
        console.log(`🔍 ${currencyCode}: Found ${dexExchanges.length} DEX exchanges: ${dexExchanges.join(', ')}`);
    }

    // Calculate CEX vs CEX opportunities - Fully dynamic for any number of exchanges
    if (cexExchanges.length >= 2) {
        console.log(`🔄 ${currencyCode}: Calculating ${cexExchanges.length * (cexExchanges.length - 1)} CEX arbitrage combinations...`);

        // Generate all possible CEX exchange pairs dynamically
        for (let i = 0; i < cexExchanges.length; i++) {
            for (let j = 0; j < cexExchanges.length; j++) {
                if (i === j) continue; // Skip self-comparison

                const exI = cexExchanges[i];
                const exJ = cexExchanges[j];
                const pI = prices[exI];
                const pJ = prices[exJ];

                // Validate price data before calculation
                if (!pI || !pJ) {
                    console.log(`⚠️ ${currencyCode}: Missing price data for ${exI} or ${exJ}`);
                    continue;
                }

                // I(BID) -> J(ASK) - Buy at J ask, sell at I bid
                if (pI.bid && pJ.ask && pI.bid > 0 && pJ.ask > 0) {
                    const profit = calculationManager.calculateProfitPercentage(pJ.ask, pI.bid);
                    const calc = {
                        currency: currencyCode,
                        direction: `${exI}(BID)->${exJ}(ASK)`,
                        buyExchange: exJ,
                        sellExchange: exI,
                        buyPrice: pJ.ask,
                        sellPrice: pI.bid,
                        profitPercent: profit,
                        isDEXInvolved: false,
                        isProfitable: profit >= config.profitThresholdPercent,
                        buyExchangeType: 'CEX',
                        sellExchangeType: 'CEX',
                        buyType: 'ASK',
                        sellType: 'BID',
                        exchangeCount: cexExchanges.length,
                        totalCombinations: cexExchanges.length * (cexExchanges.length - 1)
                    };
                    allCalculations.push(calc);
                    if (calc.isProfitable) opportunities.push(calc);
                }
            }
        }

        console.log(`✅ ${currencyCode}: Completed CEX arbitrage calculations`);
    } else if (cexExchanges.length === 1) {
        console.log(`⚠️ ${currencyCode}: Only 1 CEX exchange found (${cexExchanges[0]}), skipping CEX arbitrage`);
    } else {
        console.log(`⚠️ ${currencyCode}: No CEX exchanges found, skipping CEX arbitrage`);
    }

    // Calculate CEX <-> DEX opportunities - Fully dynamic for any number of exchanges
    if (dexExchanges.length > 0 && cexExchanges.length > 0) {
        const totalDexCombinations = dexExchanges.length * cexExchanges.length * 2; // 2 types per pair
        console.log(`🔄 ${currencyCode}: Calculating ${totalDexCombinations} DEX arbitrage combinations...`);

        for (const dexExchange of dexExchanges) {
            for (const cexExchange of cexExchanges) {
                const dexPrice = prices[dexExchange];
                const cexPrice = prices[cexExchange];

                // Validate price data
                if (!dexPrice || !cexPrice) {
                    console.log(`⚠️ ${currencyCode}: Missing price data for DEX ${dexExchange} or CEX ${cexExchange}`);
                    continue;
                }

                // Exchange(BID) vs DEX(BID): sell = CEX BID, buy = DEX BID → (CEX - DEX) / CEX
                if (dexPrice.bid && cexPrice.bid && dexPrice.bid > 0 && cexPrice.bid > 0) {
                    const profit = calculationManager.calculateProfitPercentage(dexPrice.bid, cexPrice.bid);
                    const calc = {
                        currency: currencyCode,
                        direction: `${cexExchange}(BID)->${dexExchange}(BID)`,
                        buyExchange: dexExchange,
                        sellExchange: cexExchange,
                        buyPrice: dexPrice.bid,
                        sellPrice: cexPrice.bid,
                        profitPercent: profit,
                        isDEXInvolved: true,
                        isProfitable: profit >= config.profitThresholdPercent,
                        buyExchangeType: 'DEX',
                        sellExchangeType: 'CEX',
                        buyType: 'BID',
                        sellType: 'BID',
                        dexExchangeCount: dexExchanges.length,
                        cexExchangeCount: cexExchanges.length
                    };
                    allCalculations.push(calc);
                    if (calc.isProfitable) opportunities.push(calc);
                }

                // Exchange(ASK) vs DEX(BID): sell = CEX ASK, buy = DEX BID → (CEX - DEX) / CEX
                if (cexPrice.ask && dexPrice.bid && cexPrice.ask > 0 && dexPrice.bid > 0) {
                    const profit = calculationManager.calculateProfitPercentage(dexPrice.bid, cexPrice.ask);
                    const calc = {
                        currency: currencyCode,
                        direction: `${cexExchange}(ASK)->${dexExchange}(BID)`,
                        buyExchange: dexExchange,
                        sellExchange: cexExchange,
                        buyPrice: dexPrice.bid,
                        sellPrice: cexPrice.ask,
                        profitPercent: profit,
                        isDEXInvolved: true,
                        isProfitable: profit >= config.profitThresholdPercent,
                        buyExchangeType: 'DEX',
                        sellExchangeType: 'CEX',
                        buyType: 'BID',
                        sellType: 'ASK',
                        dexExchangeCount: dexExchanges.length,
                        cexExchangeCount: cexExchanges.length
                    };
                    allCalculations.push(calc);
                    if (calc.isProfitable) opportunities.push(calc);
                }
            }
        }

        console.log(`✅ ${currencyCode}: Completed DEX arbitrage calculations`);
    } else {
        if (dexExchanges.length === 0) {
            console.log(`⚠️ ${currencyCode}: No DEX exchanges found, skipping DEX arbitrage`);
        }
        if (cexExchanges.length === 0) {
            console.log(`⚠️ ${currencyCode}: No CEX exchanges found, skipping DEX arbitrage`);
        }
    }

    // Store all calculations in data manager for web interface
    dataManager.storeArbitrageCalculations(currencyCode, allCalculations);

    // Log summary of calculations
    const totalCalculations = allCalculations.length;
    const profitableOpportunities = opportunities.length;
    const cexCalculations = allCalculations.filter(calc => !calc.isDEXInvolved).length;
    const dexCalculations = allCalculations.filter(calc => calc.isDEXInvolved).length;

    console.log(`📊 ${currencyCode}: Summary - Total: ${totalCalculations} (CEX: ${cexCalculations}, DEX: ${dexCalculations}), Profitable: ${profitableOpportunities}`);

    if (profitableOpportunities > 0) {
        console.log(`🎯 ${currencyCode}: Profitable opportunities found:`);
        opportunities.forEach(opp => {
            const profitColor = opp.profitPercent >= config.profitThresholdPercent ? '🟢' : '🟡';
            console.log(`   ${profitColor} ${opp.direction}: ${opp.profitPercent.toFixed(3)}%`);
        });
    }

    return opportunities;
}

function displayCurrencyData(currencyCode, prices, opportunities, config) {
    const timestamp = new Date().toLocaleTimeString();
    let display = `\n${chalk.yellow('💰')} ${chalk.bold(currencyCode)} ${chalk.gray(`[${timestamp}]`)}\n`;
    display += '-'.repeat(50) + '\n';
    
    // Display prices
    Object.entries(prices).forEach(([exchangeId, price]) => {
        if (price) {
            if (price.isDEX) {
                display += `${chalk.cyan(exchangeId.padEnd(12))} ${chalk.gray('BID:')} ${chalk.white(FormattingUtils.formatPrice(price.bid))} ${chalk.gray('(DEX)')}\n`;
            } else {
                display += `${chalk.cyan(exchangeId.padEnd(12))} ${chalk.gray('BID:')} ${chalk.white(FormattingUtils.formatPrice(price.bid))} ${chalk.gray('ASK:')} ${chalk.white(FormattingUtils.formatPrice(price.ask))}\n`;
            }
        }
    });
    
    // Display opportunities
    if (opportunities.length > 0) {
        display += `\n${chalk.cyan('🔄')} ${chalk.bold('OPPORTUNITIES:')}\n`;
        opportunities.forEach(opp => {
            const profitColor = opp.profitPercent >= config.profitThresholdPercent ? chalk.green : chalk.yellow;
            const dexIndicator = opp.isDEXInvolved ? chalk.magenta(' [DEX]') : '';
            const typeIndicator = opp.buyType || opp.sellType ? chalk.gray(` (${opp.buyType || ''}${opp.buyType && opp.sellType ? '/' : ''}${opp.sellType || ''})`) : '';
            display += `${chalk.bold(opp.currency)} ${chalk.blue(opp.direction)} ${profitColor(`+${opp.profitPercent.toFixed(2)}%`)}${dexIndicator}${typeIndicator}\n`;
        });
    }
    
    console.log(display);
}

async function processCurrency(currencyCode, exchanges) {
    try {
        initializeErrorTracking(currencyCode);
        const config = getCurrencyConfig(currencyCode);
        const enabledExchanges = getEnabledExchanges(currencyCode);
        
        // Fetch prices
        const prices = await getAllExchangePrices(currencyCode, config);
        
        // Calculate opportunities
        const opportunities = calculateArbitrageOpportunities(currencyCode, prices, config);
        
        // Store data in centralized data manager
        dataManager.storeCurrencyData(currencyCode, {
            prices,
            opportunities,
            enabledExchanges,
            config: {
                profitThreshold: config.profitThresholdPercent,
                closeThreshold: config.closeThresholdPercent,
                tradeVolume: config.tradeVolumeUSD
            }
        });

        // Also store opportunities separately for web interface
        if (opportunities && opportunities.length > 0) {
            console.log(`🌐 Web Interface: Storing ${opportunities.length} opportunities for ${currencyCode}`);
            latestArbitrageData[currencyCode] = opportunities;
        }
        
        // Display data
        if (Object.keys(prices).length > 0) {
            displayCurrencyData(currencyCode, prices, opportunities, config);
        }
        
        return { currency: currencyCode, prices, opportunities, enabledExchanges };
        
    } catch (error) {
        console.error(`❌ Error processing ${currencyCode}: ${error.message}`);
        return { currency: currencyCode, error: error.message, prices: {}, opportunities: [] };
    }
}

export async function processAllCurrencies(exchanges) {
    try {
        const currencies = getAvailableCurrencies();
        const results = await Promise.all(
            currencies.map(currencyCode => processCurrency(currencyCode, exchanges))
        );
        
        // Display summary
        const timestamp = new Date().toLocaleTimeString();
        let summary = `\n${chalk.magenta('📊')} ${chalk.bold('MULTI-CURRENCY SUMMARY')} ${chalk.gray(`[${timestamp}]`)}\n`;
        summary += '='.repeat(60) + '\n';
        
        results.forEach(result => {
            if (result.error) {
                summary += `${chalk.red('❌')} ${chalk.bold(result.currency)}: ${chalk.red(result.error)}\n`;
            } else {
                const exchangeCount = result.enabledExchanges.length;
                const opportunityCount = result.opportunities.length;
                const statusColor = opportunityCount > 0 ? chalk.green : chalk.gray;
                summary += `${statusColor('✅')} ${chalk.bold(result.currency)}: ${chalk.cyan(exchangeCount)} exchanges, ${statusColor(opportunityCount)} opportunities\n`;
            }
        });
        
        console.log(summary);
        
        // Update web interface with multi-currency data
        if (webInterfaceInstance) {
            const multiCurrencyData = {
                currencies: dataManager.getAllCurrencyData()
            };
            
            webInterfaceInstance.updateExchangeData(multiCurrencyData);
            webInterfaceInstance.broadcastDataUpdate();
        }
        
        return results;
        
    } catch (error) {
        console.error(`❌ Multi-currency processing error: ${error.message}`);
        return [];
    }
}

export function getCurrencies() {
    return getAvailableCurrencies();
}

export function getCurrencyConfiguration(currencyCode) {
    return getCurrencyConfig(currencyCode);
}

export default {
    processAllCurrencies,
    getCurrencies,
    getCurrencyConfiguration,
    setWebInterface
};