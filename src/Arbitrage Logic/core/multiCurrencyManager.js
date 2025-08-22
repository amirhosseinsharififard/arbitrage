/**
 * Multi-Currency Arbitrage Manager
 * Handles arbitrage calculations for multiple currencies simultaneously
 */

import { getCurrencyConfig, getAvailableCurrencies, getEnabledExchanges } from "../config/multiCurrencyConfig.js";
import { lbankPriceService, kcexPuppeteerService, dexscreenerApiService } from "../services/index.js";
import { calculationManager, FormattingUtils } from "../utils/index.js";
import chalk from "chalk";
import exchangeManager from "../exchanges/exchangeManager.js";
import dataManager from "./dataManager.js";

let webInterfaceInstance = null;
let previousData = {};
let errorMessagesShown = {};

export function setWebInterface(webInterface) {
    webInterfaceInstance = webInterface;
}

function initializeErrorTracking(currencyCode) {
    if (!errorMessagesShown[currencyCode]) {
        errorMessagesShown[currencyCode] = {
            mexc: false, kcex: false, xt: false, lbank: false, dexscreener: false
        };
    }
}

async function getExchangePrice(currencyCode, exchangeId, config) {
    try {
        switch (exchangeId) {
            case 'lbank':
                if (config.exchanges.lbank?.enabled) {
                    return await lbankPriceService.getPrice('lbank', config.symbols.lbank);
                }
                break;
            case 'mexc':
                if (config.exchanges.mexc?.enabled) {
                    const exchanges = exchangeManager.getAllExchanges();
                    const mexcExchange = exchanges.get('mexc');
                    if (mexcExchange) {
                        const ticker = await mexcExchange.fetchTicker(config.symbols.mexc);
                        return { bid: parseFloat(ticker.bid), ask: parseFloat(ticker.ask), isDEX: false };
                    }
                }
                break;
            case 'kcex':
                if (config.exchanges.kcex?.enabled) {
                    return kcexPuppeteerService.getCurrentPrices();
                }
                break;
            case 'dexscreener':
                if (config.dex.dexscreener?.enabled) {
                    return await dexscreenerApiService.getBidPriceByToken(
                        config.dex.dexscreener.contractAddress,
                        config.dex.dexscreener.network
                    );
                }
                break;
        }
        return null;
    } catch (error) {
        if (!errorMessagesShown[currencyCode]?.[exchangeId]) {
            console.log(`⚠️ ${currencyCode} ${exchangeId}: ${error.message}`);
            if (!errorMessagesShown[currencyCode]) errorMessagesShown[currencyCode] = {};
            errorMessagesShown[currencyCode][exchangeId] = true;
        }
        return null;
    }
}

function calculateArbitrageOpportunities(currencyCode, prices, config) {
    const opportunities = [];
    const exchanges = Object.keys(prices).filter(id => prices[id] !== null);
    
    for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
            const exA = exchanges[i], exB = exchanges[j];
            const priceA = prices[exA], priceB = prices[exB];
            
            if (!priceA || !priceB) continue;
            
            // A->B opportunity
            if (priceA.ask && priceB.bid) {
                const profit = calculationManager.calculateProfitPercentage(priceA.ask, priceB.bid);
                if (profit >= config.profitThresholdPercent) {
                    opportunities.push({
                        currency: currencyCode,
                        direction: `${exA}->${exB}`,
                        buyPrice: priceA.ask,
                        sellPrice: priceB.bid,
                        profitPercent: profit
                    });
                }
            }
            
            // B->A opportunity
            if (priceB.ask && priceA.bid) {
                const profit = calculationManager.calculateProfitPercentage(priceB.ask, priceA.bid);
                if (profit >= config.profitThresholdPercent) {
                    opportunities.push({
                        currency: currencyCode,
                        direction: `${exB}->${exA}`,
                        buyPrice: priceB.ask,
                        sellPrice: priceA.bid,
                        profitPercent: profit
                    });
                }
            }
        }
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
            display += `${chalk.bold(opp.currency)} ${chalk.blue(opp.direction)} ${profitColor(`+${opp.profitPercent.toFixed(2)}%`)}\n`;
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
