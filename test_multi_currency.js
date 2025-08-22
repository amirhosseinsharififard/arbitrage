/**
 * Test file for Multi-Currency Arbitrage System
 * Tests the dynamic multi-currency configuration and arbitrage calculations
 */

import { getAvailableCurrencies, getCurrencyConfig, getEnabledExchanges } from "./src/Arbitrage Logic/config/multiCurrencyConfig.js";
import { processAllCurrencies } from "./src/Arbitrage Logic/core/multiCurrencyManager.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import { lbankPriceService, kcexPuppeteerService } from "./src/Arbitrage Logic/services/index.js";
import exitHandler from "./src/Arbitrage Logic/system/exitHandler.js";

async function testMultiCurrencySystem() {
    try {
        console.log("🚀 Testing Multi-Currency Arbitrage System");
        console.log("=".repeat(60));
        
        // Get available currencies
        const currencies = getAvailableCurrencies();
        console.log(`💰 Available currencies: ${currencies.join(', ')}`);
        
        // Test configuration for each currency
        currencies.forEach(currency => {
            console.log(`\n📋 Configuration for ${currency}:`);
            const config = getCurrencyConfig(currency);
            console.log(`   Profit threshold: ${config.profitThresholdPercent}%`);
            console.log(`   Close threshold: ${config.closeThresholdPercent}%`);
            console.log(`   Trade volume: $${config.tradeVolumeUSD}`);
            console.log(`   Enabled exchanges: ${getEnabledExchanges(currency).join(', ')}`);
        });
        
        console.log("\n" + "=".repeat(60));
        console.log("🔄 Initializing services...");
        
        // Initialize services
        await lbankPriceService.initialize();
        await kcexPuppeteerService.initialize();
        await exchangeManager.initialize();
        
        // Register cleanup
        exitHandler.addExitHandler(async() => {
            await kcexPuppeteerService.cleanup();
        });
        
        console.log("✅ Services initialized successfully");
        console.log("\n" + "=".repeat(60));
        
        // Test single iteration
        console.log("🔄 Running single iteration test...");
        const exchanges = exchangeManager.getAllExchanges();
        const results = await processAllCurrencies(exchanges);
        
        console.log("\n📊 Test Results:");
        results.forEach(result => {
            if (result.error) {
                console.log(`❌ ${result.currency}: ${result.error}`);
            } else {
                console.log(`✅ ${result.currency}: ${result.enabledExchanges.length} exchanges, ${result.opportunities.length} opportunities`);
                if (result.opportunities.length > 0) {
                    result.opportunities.forEach(opp => {
                        console.log(`   💰 ${opp.direction}: +${opp.profitPercent.toFixed(2)}%`);
                    });
                }
            }
        });
        
        console.log("\n✅ Multi-currency system test completed successfully!");
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        console.error(error.stack);
    } finally {
        // Cleanup
        await exitHandler.forceExit();
    }
}

// Run the test
testMultiCurrencySystem();
