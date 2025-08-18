/**
 * Test script for LBank integration
 * 
 * This script tests the LBank price service and exchange manager
 * to ensure that LBank integration is working correctly.
 */

import config from "./src/Arbitrage Logic/config/config.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import lbankPriceService from "./src/Arbitrage Logic/services/lbankPriceService.js";

async function testLbankIntegration() {
    console.log("🧪 Testing LBank Integration...");
    console.log("=".repeat(50));

    try {
        // Test 1: Initialize exchange manager
        console.log("1. Testing exchange manager initialization...");
        await exchangeManager.initialize();
        console.log("✅ Exchange manager initialized successfully");

        // Test 2: Check if LBank exchange is available
        console.log("\n2. Testing LBank exchange availability...");
        const lbankExchange = exchangeManager.getExchange('lbank');
        if (lbankExchange) {
            console.log("✅ LBank exchange is available");
            console.log(`   Exchange ID: ${lbankExchange.id}`);
            console.log(`   Has fetchTicker: ${typeof lbankExchange.fetchTicker === 'function'}`);
        } else {
            throw new Error("LBank exchange not found");
        }

        // Test 3: Test LBank price service initialization
        console.log("\n3. Testing LBank price service initialization...");
        await lbankPriceService.initialize();
        console.log("✅ LBank price service initialized successfully");

        // Test 4: Test price fetching from exchange manager
        console.log("\n4. Testing price fetching from exchange manager...");
        const symbol = config.symbols.lbank || 'DAM/USDT:USDT';
        const priceData = await exchangeManager.getLbankPrice(symbol);
        console.log("✅ Price data fetched from exchange manager:");
        console.log(`   Symbol: ${priceData.symbol}`);
        console.log(`   Bid: ${priceData.bid}`);
        console.log(`   Ask: ${priceData.ask}`);
        console.log(`   Timestamp: ${new Date(priceData.timestamp).toLocaleString()}`);

        // Test 5: Test price fetching from LBank price service
        console.log("\n5. Testing price fetching from LBank price service...");
        const servicePriceData = await lbankPriceService.getPrice('lbank', symbol);
        console.log("✅ Price data fetched from LBank price service:");
        console.log(`   Symbol: ${servicePriceData.symbol}`);
        console.log(`   Bid: ${servicePriceData.bid}`);
        console.log(`   Ask: ${servicePriceData.ask}`);
        console.log(`   Timestamp: ${new Date(servicePriceData.timestamp).toLocaleString()}`);

        // Test 6: Test order book fetching
        console.log("\n6. Testing order book fetching...");
        const orderBook = await lbankExchange.fetchOrderBook(symbol);
        console.log("✅ Order book fetched successfully:");
        console.log(`   Symbol: ${orderBook.symbol}`);
        console.log(`   Best bid: ${orderBook.bids && orderBook.bids[0] ? `${orderBook.bids[0][0]} x ${orderBook.bids[0][1]}` : 'N/A'}`);
        console.log(`   Best ask: ${orderBook.asks && orderBook.asks[0] ? `${orderBook.asks[0][0]} x ${orderBook.asks[0][1]}` : 'N/A'}`);

        // Test 7: Test service status
        console.log("\n7. Testing LBank price service status...");
        const status = lbankPriceService.getStatus();
        console.log("✅ Service status:");
        console.log(`   Initialized: ${status.isInitialized}`);
        console.log(`   Last fetch time: ${status.lastFetchTime ? new Date(status.lastFetchTime).toLocaleString() : 'N/A'}`);
        console.log(`   Min fetch interval: ${status.minFetchInterval}ms`);
        console.log(`   Cache timeout: ${status.cacheTimeout}ms`);

        console.log("\n🎉 All LBank integration tests passed successfully!");
        console.log("=".repeat(50));

    } catch (error) {
        console.error("❌ LBank integration test failed:");
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Run the test
testLbankIntegration().catch(console.error);
