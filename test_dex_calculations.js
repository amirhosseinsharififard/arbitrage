/**
 * Test DEX calculation logic
 */

import { getCurrencyConfig, getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import { calculationManager } from './src/Arbitrage Logic/utils/index.js';
import chalk from 'chalk';

function testDEXCalculations() {
    console.log(`${chalk.green('🚀 Testing DEX Calculation Logic')}`);
    console.log('='.repeat(60));
    
    const currencies = getAvailableCurrencies();
    
    currencies.forEach(currencyCode => {
        console.log(`\n📊 ${chalk.cyan(currencyCode)}:`);
        
        // Mock prices for testing
        const mockPrices = {
            mexc: { bid: 1.630, ask: 1.635, isDEX: false },
            lbank: { bid: 1.628, ask: 1.632, isDEX: false },
            kcex: { bid: 1.629, ask: 1.634, isDEX: false },
            dexscreener: { bid: 1.630, ask: null, isDEX: true }
        };
        
        const config = getCurrencyConfig(currencyCode);
        const exchanges = Object.keys(mockPrices);
        
        // Separate DEX and CEX exchanges
        const dexExchanges = exchanges.filter(ex => mockPrices[ex]?.isDEX);
        const cexExchanges = exchanges.filter(ex => !mockPrices[ex]?.isDEX);
        
        console.log(`  🔄 DEX: ${dexExchanges.join(', ')}`);
        console.log(`  🏦 CEX: ${cexExchanges.join(', ')}`);
        
        // Test DEX vs CEX calculations
        dexExchanges.forEach(dexExchange => {
            cexExchanges.forEach(cexExchange => {
                const dexPrice = mockPrices[dexExchange];
                const cexPrice = mockPrices[cexExchange];
                
                console.log(`\n  📈 ${dexExchange} vs ${cexExchange}:`);
                
                // DEX -> CEX BID
                if (dexPrice.bid && cexPrice.bid) {
                    const profit = calculationManager.calculateProfitPercentage(dexPrice.bid, cexPrice.bid);
                    console.log(`    ${dexExchange}(BID) -> ${cexExchange}(BID): ${profit.toFixed(2)}%`);
                }
                
                // DEX -> CEX ASK
                if (dexPrice.bid && cexPrice.ask) {
                    const profit = calculationManager.calculateProfitPercentage(dexPrice.bid, cexPrice.ask);
                    console.log(`    ${dexExchange}(BID) -> ${cexExchange}(ASK): ${profit.toFixed(2)}%`);
                }
                
                // CEX BID -> DEX
                if (cexPrice.bid && dexPrice.bid) {
                    const profit = calculationManager.calculateProfitPercentage(cexPrice.bid, dexPrice.bid);
                    console.log(`    ${cexExchange}(BID) -> ${dexExchange}(BID): ${profit.toFixed(2)}%`);
                }
                
                // CEX ASK -> DEX
                if (cexPrice.ask && dexPrice.bid) {
                    const profit = calculationManager.calculateProfitPercentage(cexPrice.ask, dexPrice.bid);
                    console.log(`    ${cexExchange}(ASK) -> ${dexExchange}(BID): ${profit.toFixed(2)}%`);
                }
            });
        });
    });
    
    console.log(`\n✅ DEX calculation test completed!`);
}

testDEXCalculations();
