/**
 * Test script for DEX arbitrage calculations
 * Tests DEX vs CEX arbitrage opportunities
 */

import { getAvailableCurrencies, getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import { calculationManager } from './src/Arbitrage Logic/utils/index.js';
import chalk from 'chalk';

function testDexArbitrage() {
    console.log(`${chalk.green('🚀 Testing DEX Arbitrage Calculations')}`);
    console.log('='.repeat(60));
    
    const currencies = getAvailableCurrencies();
    
    currencies.forEach(currencyCode => {
        const config = getCurrencyConfig(currencyCode);
        console.log(`\n📊 Testing ${chalk.cyan(currencyCode)}:`);
        
        // Check if DEX is enabled
        if (config.dex?.dexscreener?.enabled) {
            console.log(`  ✅ DEX enabled: ${config.dex.dexscreener.network}`);
            console.log(`  📍 Contract: ${config.dex.dexscreener.contractAddress}`);
        } else {
            console.log(`  ❌ DEX not enabled`);
        }
        
        // Check enabled exchanges
        const enabledExchanges = Object.keys(config.exchanges).filter(ex => config.exchanges[ex]?.enabled);
        console.log(`  🔄 Enabled exchanges: ${enabledExchanges.join(', ')}`);
        
        // Test arbitrage calculation with mock data
        if (config.dex?.dexscreener?.enabled && enabledExchanges.length > 0) {
            console.log(`  🧮 Testing arbitrage calculation...`);
            
            // Mock prices
            const mockPrices = {
                dexscreener: {
                    bid: 1.64,
                    ask: null,
                    isDEX: true,
                    exchangeId: 'dexscreener'
                }
            };
            
            // Add mock CEX prices
            enabledExchanges.forEach(exchange => {
                if (exchange !== 'dexscreener') {
                    mockPrices[exchange] = {
                        bid: 1.63,
                        ask: 1.65,
                        isDEX: false,
                        exchangeId: exchange
                    };
                }
            });
            
            // Calculate opportunities
            const opportunities = calculateArbitrageOpportunities(currencyCode, mockPrices, config);
            
            if (opportunities.length > 0) {
                console.log(`  ✅ Found ${opportunities.length} opportunities:`);
                opportunities.forEach((opp, index) => {
                    const dexIndicator = opp.isDEXInvolved ? chalk.magenta(' [DEX]') : '';
                    console.log(`    ${index + 1}. ${opp.direction} ${chalk.green(`+${opp.profitPercent.toFixed(2)}%`)}${dexIndicator}`);
                });
            } else {
                console.log(`  ⚠️ No opportunities found (profit threshold: ${config.profitThresholdPercent}%)`);
            }
        }
    });
}

function calculateArbitrageOpportunities(currencyCode, prices, config) {
    const opportunities = [];
    const exchanges = Object.keys(prices).filter(id => prices[id] !== null);
    
    for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
            const exA = exchanges[i], exB = exchanges[j];
            const priceA = prices[exA], priceB = prices[exB];
            
            if (!priceA || !priceB) continue;
            
            // Handle DEX vs CEX arbitrage
            // For DEX, we only have bid price, so we use it for both buy and sell
            const priceABuy = priceA.isDEX ? priceA.bid : priceA.ask;
            const priceASell = priceA.bid;
            const priceBBuy = priceB.isDEX ? priceB.bid : priceB.ask;
            const priceBSell = priceB.bid;
            
            // A->B opportunity (buy from A, sell to B)
            if (priceABuy && priceBSell) {
                const profit = calculationManager.calculateProfitPercentage(priceABuy, priceBSell);
                if (profit >= config.profitThresholdPercent) {
                    opportunities.push({
                        currency: currencyCode,
                        direction: `${exA}->${exB}`,
                        buyPrice: priceABuy,
                        sellPrice: priceBSell,
                        profitPercent: profit,
                        buyExchange: exA,
                        sellExchange: exB,
                        isDEXInvolved: priceA.isDEX || priceB.isDEX
                    });
                }
            }
            
            // B->A opportunity (buy from B, sell to A)
            if (priceBBuy && priceASell) {
                const profit = calculationManager.calculateProfitPercentage(priceBBuy, priceASell);
                if (profit >= config.profitThresholdPercent) {
                    opportunities.push({
                        currency: currencyCode,
                        direction: `${exB}->${exA}`,
                        buyPrice: priceBBuy,
                        sellPrice: priceASell,
                        profitPercent: profit,
                        buyExchange: exB,
                        sellExchange: exA,
                        isDEXInvolved: priceA.isDEX || priceB.isDEX
                    });
                }
            }
        }
    }
    return opportunities;
}

// Run test
testDexArbitrage();
