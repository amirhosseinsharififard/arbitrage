/**
 * Test script to demonstrate exchange enable/disable functionality
 */

import config from "./src/Arbitrage Logic/config/config.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import lbankPriceService from "./src/Arbitrage Logic/services/lbankPriceService.js";

async function testExchangeDisable() {
    console.log("🧪 Testing Exchange Enable/Disable Functionality...");
    console.log("=".repeat(60));

    // Test 1: Show current configuration
    console.log("1. Current Exchange Configuration:");
    console.log(`   MEXC enabled: ${config.exchanges.mexc.enabled}`);
    console.log(`   LBank enabled: ${config.exchanges.lbank.enabled}`);
    console.log(`   XT enabled: ${config.xt.enabled}`);
    console.log(`   KCEX enabled: ${config.kcex.enabled}`);

    // Test 2: Initialize exchanges
    console.log("\n2. Initializing exchanges...");
    await exchangeManager.initialize();
    
    // Test 3: Check which exchanges are available
    console.log("\n3. Available exchanges after initialization:");
    const availableExchanges = exchangeManager.getAllExchanges();
    for (const [exchangeId, exchange] of availableExchanges) {
        console.log(`   ✅ ${exchangeId.toUpperCase()}: Available`);
    }

    // Test 4: Test price fetching for enabled exchanges
    console.log("\n4. Testing price fetching for enabled exchanges:");
    
    if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
        try {
            const mexcPrice = await exchangeManager.getMexcPrice();
            console.log(`   ✅ MEXC: Bid=${mexcPrice.bid}, Ask=${mexcPrice.ask}`);
        } catch (error) {
            console.log(`   ❌ MEXC: ${error.message}`);
        }
    } else {
        console.log(`   ⏸️ MEXC: Disabled`);
    }

    if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
        try {
            await lbankPriceService.initialize();
            const lbankPrice = await lbankPriceService.getPrice();
            console.log(`   ✅ LBank: Bid=${lbankPrice.bid}, Ask=${lbankPrice.ask}`);
        } catch (error) {
            console.log(`   ❌ LBank: ${error.message}`);
        }
    } else {
        console.log(`   ⏸️ LBank: Disabled`);
    }

    console.log("\n🎉 Exchange enable/disable test completed!");
    console.log("=".repeat(60));
}

// Run the test
testExchangeDisable().catch(console.error);
