/**
 * Test script for real DEX arbitrage with actual data
 * Tests DEX vs CEX arbitrage opportunities with live data
 */

import { getAvailableCurrencies, getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import { calculationManager } from './src/Arbitrage Logic/utils/index.js';
import { lbankPriceService, dexscreenerApiService } from './src/Arbitrage Logic/services/index.js';
import exchangeManager from './src/Arbitrage Logic/exchanges/exchangeManager.js';
import chalk from 'chalk';

async function testRealDexArbitrage() {
    console.log(`${chalk.green('🚀 Testing Real DEX Arbitrage with Live Data')}`);
    console.log('='.repeat(70));
    
    // Initialize exchanges
    await exchangeManager.initialize();
    
    const currencies = getAvailableCurrencies();
    
    for (const currencyCode of currencies) {
        const config = getCurrencyConfig(currencyCode);
        console.log(`\n📊 Testing ${chalk.cyan(currencyCode)}:`);
        
        // Check if DEX is enabled
        if (!config.dex?.dexscreener?.enabled) {
            console.log(`  ❌ DEX not enabled for ${currencyCode}`);
            continue;
        }
        
        console.log(`  ✅ DEX enabled: ${config.dex.dexscreener.network}`);
        console.log(`  📍 Contract: ${config.dex.dexscreener.contractAddress}`);
        
        // Get real prices
        const prices = {};
        
        try {
            // Get DEX price
            console.log(`  🔄 Fetching DEX price...`);
            const dexPrice = await dexscreenerApiService.getBidPriceByToken(
                config.dex.dexscreener.contractAddress,
                config.dex.dexscreener.network
            );
            prices.dexscreener = dexPrice;
            console.log(`  ✅ DEX: ${dexPrice.bid ? `$${dexPrice.bid}` : 'No data'}`);
            
            // Get CEX prices
            const enabledExchanges = Object.keys(config.exchanges).filter(ex => config.exchanges[ex]?.enabled);
            
            for (const exchange of enabledExchanges) {
                if (exchange === 'mexc') {
                    console.log(`  🔄 Fetching MEXC price...`);
                    try {
                        const mexcExchange = exchangeManager.getAllExchanges().get('mexc');
                        if (mexcExchange) {
                            const ticker = await mexcExchange.fetchTicker(config.symbols.mexc);
                            prices.mexc = {
                                bid: parseFloat(ticker.bid),
                                ask: parseFloat(ticker.ask),
                                isDEX: false,
                                exchangeId: 'mexc'
                            };
                            console.log(`  ✅ MEXC: Bid: $${prices.mexc.bid}, Ask: $${prices.mexc.ask}`);
                        }
                    } catch (error) {
                        console.log(`  ❌ MEXC error: ${error.message}`);
                    }
                } else if (exchange === 'lbank') {
                    console.log(`  🔄 Fetching LBank price...`);
                    try {
                        const lbankPrice = await lbankPriceService.getPrice('lbank', config.symbols.lbank);
                        prices.lbank = lbankPrice;
                        console.log(`  ✅ LBank: Bid: $${lbankPrice.bid}, Ask: $${lbankPrice.ask}`);
                    } catch (error) {
                        console.log(`  ❌ LBank error: ${error.message}`);
                    }
                }
            }
            
            // Calculate arbitrage opportunities
            console.log(`  🧮 Calculating arbitrage opportunities...`);
            const opportunities = calculateArbitrageOpportunities(currencyCode, prices, config);
            
            if (opportunities.length > 0) {
                console.log(`  ✅ Found ${opportunities.length} opportunities:`);
                opportunities.forEach((opp, index) => {
                    const dexIndicator = opp.isDEXInvolved ? chalk.magenta(' [DEX]') : '';
                    const profitColor = opp.profitPercent >= config.profitThresholdPercent ? chalk.green : chalk.yellow;
                    console.log(`    ${index + 1}. ${opp.direction} ${profitColor(`+${opp.profitPercent.toFixed(2)}%`)}${dexIndicator}`);
                    console.log(`       Buy: $${opp.buyPrice} (${opp.buyExchange}) → Sell: $${opp.sellPrice} (${opp.sellExchange})`);
                });
            } else {
                console.log(`  ⚠️ No opportunities found (profit threshold: ${config.profitThresholdPercent}%)`);
                
                // Show price differences
                const exchanges = Object.keys(prices).filter(id => prices[id] !== null);
                if (exchanges.length >= 2) {
                    console.log(`  📊 Price comparison:`);
                    for (let i = 0; i < exchanges.length; i++) {
                        for (let j = i + 1; j < exchanges.length; j++) {
                            const exA = exchanges[i], exB = exchanges[j];
                            const priceA = prices[exA], priceB = prices[exB];
                            
                            if (priceA && priceB) {
                                const priceABuy = priceA.isDEX ? priceA.bid : priceA.ask;
                                const priceBSell = priceB.bid;
                                
                                if (priceABuy && priceBSell) {
                                    const profit = calculationManager.calculateProfitPercentage(priceABuy, priceBSell);
                                    console.log(`    ${exA}->${exB}: ${profit.toFixed(2)}% (${priceABuy} → ${priceBSell})`);
                                }
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log(`  ❌ Error testing ${currencyCode}: ${error.message}`);
        }
        
        console.log(`  ${'─'.repeat(50)}`);
    }
    
    console.log(`\n✅ Real DEX arbitrage test completed!`);
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
testRealDexArbitrage().catch(error => {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
});
