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

export function setWebInterface(webInterface) {
    webInterfaceInstance = webInterface;
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
                            priceData = await ourbitPuppeteerService.extractPrices();
                            if (priceData && (priceData.bid || priceData.ask)) {
                                break; // Success, exit loop
                            }
                            if (attempt < 5) {
                                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                            }
                        }
                        return priceData;
                    });
                }
                break;
            case 'dexscreener':
                if (config.dex && config.dex.dexscreener && config.dex.dexscreener.enabled !== false) {
                    return await dataUpdateManager.getData(exchangeId, currencyCode, async() => {
                        return await dexscreenerApiService.getBidPriceByToken(
                            config.dex.dexscreener.contractAddress,
                            config.dex.dexscreener.network
                        );
                    });
                }
                break;
        }
        return null;
    } catch (error) {
        const hasEntry = errorMessagesShown[currencyCode] && errorMessagesShown[currencyCode][exchangeId];
        if (!hasEntry) {
            console.log(`⚠️ ${currencyCode} ${exchangeId}: ${error.message}`);
            if (!errorMessagesShown[currencyCode]) errorMessagesShown[currencyCode] = {};
            errorMessagesShown[currencyCode][exchangeId] = true;
        }
        return null;
    }
}

function calculateArbitrageOpportunities(currencyCode, prices, config) {
    const opportunities = [];
    const allCalculations = []; // Store all calculations for web interface
    const exchanges = Object.keys(prices).filter(id => prices[id] !== null);

    // Separate DEX and CEX exchanges
    const dexExchanges = exchanges.filter(ex => prices[ex].isDEX);
    const cexExchanges = exchanges.filter(ex => !(prices[ex].isDEX));

    // Calculate CEX vs CEX opportunities in requested order
    if (cexExchanges.length >= 2) {
        const [ex1, ex2, ex3] = cexExchanges;
        const p1 = prices[ex1];
        const p2 = prices[ex2];
        const p3 = ex3 ? prices[ex3] : null;

        // 1) ex1(BID) -> ex2(ASK)
        if (p1.bid && p2.ask) {
            const profit = calculationManager.calculateProfitPercentage(p2.ask, p1.bid);
            const calc = {
                currency: currencyCode,
                direction: `${ex1}(BID)->${ex2}(ASK)`,
                buyExchange: ex2,
                sellExchange: ex1,
                buyPrice: p2.ask,
                sellPrice: p1.bid,
                profitPercent: profit,
                isDEXInvolved: false,
                isProfitable: profit >= config.profitThresholdPercent,
                buyExchangeType: 'CEX',
                sellExchangeType: 'CEX',
                buyType: 'ASK',
                sellType: 'BID'
            };
            allCalculations.push(calc);
            if (calc.isProfitable) opportunities.push(calc);
        }

        // 2) ex2(BID) -> ex1(ASK)
        if (p2.bid && p1.ask) {
            const profit = calculationManager.calculateProfitPercentage(p1.ask, p2.bid);
            const calc = {
                currency: currencyCode,
                direction: `${ex2}(BID)->${ex1}(ASK)`,
                buyExchange: ex1,
                sellExchange: ex2,
                buyPrice: p1.ask,
                sellPrice: p2.bid,
                profitPercent: profit,
                isDEXInvolved: false,
                isProfitable: profit >= config.profitThresholdPercent,
                buyExchangeType: 'CEX',
                sellExchangeType: 'CEX',
                buyType: 'ASK',
                sellType: 'BID'
            };
            allCalculations.push(calc);
            if (calc.isProfitable) opportunities.push(calc);
        }

        if (ex3 && p3) {
            // 3) ex3(BID) -> ex1(ASK)
            if (p3.bid && p1.ask) {
                const profit = calculationManager.calculateProfitPercentage(p1.ask, p3.bid);
                const calc = {
                    currency: currencyCode,
                    direction: `${ex3}(BID)->${ex1}(ASK)`,
                    buyExchange: ex1,
                    sellExchange: ex3,
                    buyPrice: p1.ask,
                    sellPrice: p3.bid,
                    profitPercent: profit,
                    isDEXInvolved: false,
                    isProfitable: profit >= config.profitThresholdPercent,
                    buyExchangeType: 'CEX',
                    sellExchangeType: 'CEX',
                    buyType: 'ASK',
                    sellType: 'BID'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }

            // 4) ex1(BID) -> ex3(ASK)
            if (p1.bid && p3.ask) {
                const profit = calculationManager.calculateProfitPercentage(p3.ask, p1.bid);
                const calc = {
                    currency: currencyCode,
                    direction: `${ex1}(BID)->${ex3}(ASK)`,
                    buyExchange: ex3,
                    sellExchange: ex1,
                    buyPrice: p3.ask,
                    sellPrice: p1.bid,
                    profitPercent: profit,
                    isDEXInvolved: false,
                    isProfitable: profit >= config.profitThresholdPercent,
                    buyExchangeType: 'CEX',
                    sellExchangeType: 'CEX',
                    buyType: 'ASK',
                    sellType: 'BID'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }

            // 5) ex2(BID) -> ex3(ASK)
            if (p2.bid && p3.ask) {
                const profit = calculationManager.calculateProfitPercentage(p3.ask, p2.bid);
                const calc = {
                    currency: currencyCode,
                    direction: `${ex2}(BID)->${ex3}(ASK)`,
                    buyExchange: ex3,
                    sellExchange: ex2,
                    buyPrice: p3.ask,
                    sellPrice: p2.bid,
                    profitPercent: profit,
                    isDEXInvolved: false,
                    isProfitable: profit >= config.profitThresholdPercent,
                    buyExchangeType: 'CEX',
                    sellExchangeType: 'CEX',
                    buyType: 'ASK',
                    sellType: 'BID'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }

            // 6) ex3(BID) -> ex2(ASK)
            if (p3.bid && p2.ask) {
                const profit = calculationManager.calculateProfitPercentage(p2.ask, p3.bid);
                const calc = {
                    currency: currencyCode,
                    direction: `${ex3}(BID)->${ex2}(ASK)`,
                    buyExchange: ex2,
                    sellExchange: ex3,
                    buyPrice: p2.ask,
                    sellPrice: p3.bid,
                    profitPercent: profit,
                    isDEXInvolved: false,
                    isProfitable: profit >= config.profitThresholdPercent,
                    buyExchangeType: 'CEX',
                    sellExchangeType: 'CEX',
                    buyType: 'ASK',
                    sellType: 'BID'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }
        }
    } else {
        // Fallback: generate all i->j as i(BID) -> j(ASK)
        for (let i = 0; i < cexExchanges.length; i++) {
            for (let j = 0; j < cexExchanges.length; j++) {
                if (i === j) continue;
                const exI = cexExchanges[i];
                const exJ = cexExchanges[j];
                const pI = prices[exI];
                const pJ = prices[exJ];
                if (pI.bid && pJ.ask) {
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
                        sellType: 'BID'
                    };
                    allCalculations.push(calc);
                    if (calc.isProfitable) opportunities.push(calc);
                }
            }
        }
    }

    // Calculate CEX <-> DEX opportunities in requested order
    for (const dexExchange of dexExchanges) {
        for (const cexExchange of cexExchanges) {
            const dexPrice = prices[dexExchange];
            const cexPrice = prices[cexExchange];
            if (!dexPrice || !cexPrice) continue;

            // Exchange(BID) vs DEX(BID): sell = CEX BID, buy = DEX BID → (CEX - DEX) / CEX
            if (dexPrice.bid && cexPrice.bid) {
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
                    sellType: 'BID'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }

            // Exchange(ASK) vs DEX(BID): sell = CEX ASK, buy = DEX BID → (CEX - DEX) / CEX
            if (cexPrice.ask && dexPrice.bid) {
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
                    sellType: 'ASK'
                };
                allCalculations.push(calc);
                if (calc.isProfitable) opportunities.push(calc);
            }
        }
    }

    // Store all calculations in data manager for web interface
    dataManager.storeArbitrageCalculations(currencyCode, allCalculations);

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
        const prices = {};
        const pricePromises = enabledExchanges.map(async (exchangeId) => {
            const price = await getExchangePrice(currencyCode, exchangeId, config);
            if (price) prices[exchangeId] = price;
        });
        
        await Promise.all(pricePromises);
        
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