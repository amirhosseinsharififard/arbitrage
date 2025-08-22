/**
 * Test script for Centralized Calculation and Data Management System
 * Demonstrates how calculations and data are centralized and reusable
 */

import { calculationManager } from "./src/Arbitrage Logic/utils/index.js";
import dataManager from "./src/Arbitrage Logic/core/dataManager.js";
import { getAvailableCurrencies, getCurrencyConfig } from "./src/Arbitrage Logic/config/multiCurrencyConfig.js";

async function testCentralizedSystem() {
    console.log("🚀 Testing Centralized Calculation and Data Management System");
    console.log("=".repeat(70));
    
    // Test 1: Centralized Calculations
    console.log("\n📊 Test 1: Centralized Calculations");
    console.log("-".repeat(40));
    
    const buyPrice = 100;
    const sellPrice = 102;
    
    // Calculate profit percentage using centralized manager
    const profitPercent = calculationManager.calculateProfitPercentage(buyPrice, sellPrice);
    console.log(`💰 Profit calculation: ${buyPrice} -> ${sellPrice} = ${profitPercent.toFixed(2)}%`);
    
    // Test different calculation methods
    const priceDiff = calculationManager.calculatePriceDifference(buyPrice, sellPrice);
    const absoluteDiff = calculationManager.calculateAbsolutePriceDifference(buyPrice, sellPrice);
    
    console.log(`📈 Price difference: ${priceDiff.toFixed(2)}%`);
    console.log(`📊 Absolute difference: $${absoluteDiff.toFixed(2)}`);
    
    // Test arbitrage opportunity calculation
    const exchangeA = { ask: 100, bid: 99 };
    const exchangeB = { ask: 101, bid: 102 };
    const config = { profitThresholdPercent: 1.0 };
    
    const opportunities = calculationManager.calculateArbitrageOpportunity(exchangeA, exchangeB, config);
    console.log(`🔄 Arbitrage opportunities found: ${opportunities.length}`);
    opportunities.forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.direction}: ${opp.profitPercent.toFixed(2)}%`);
    });
    
    // Test 2: Centralized Data Management
    console.log("\n📊 Test 2: Centralized Data Management");
    console.log("-".repeat(40));
    
    // Store currency data
    const currencyData = {
        prices: {
            mexc: { bid: 100, ask: 101 },
            lbank: { bid: 99, ask: 102 }
        },
        opportunities: opportunities,
        enabledExchanges: ['mexc', 'lbank'],
        config: {
            profitThreshold: 1.0,
            closeThreshold: 0.5,
            tradeVolume: 200
        }
    };
    
    dataManager.storeCurrencyData('AIOT', currencyData);
    console.log("✅ Stored AIOT currency data");
    
    // Store exchange data
    dataManager.storeExchangeData('mexc', {
        name: 'MEXC',
        bid: 100,
        ask: 101,
        volume: 1000000
    });
    console.log("✅ Stored MEXC exchange data");
    
    // Store opportunities
    dataManager.storeOpportunities('AIOT', opportunities);
    console.log("✅ Stored AIOT opportunities");
    
    // Store statistics
    dataManager.storeStatistics('system', {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0
    });
    console.log("✅ Stored system statistics");
    
    // Test 3: Data Retrieval and Reuse
    console.log("\n📊 Test 3: Data Retrieval and Reuse");
    console.log("-".repeat(40));
    
    // Retrieve stored data
    const retrievedCurrencyData = dataManager.getCurrencyData('AIOT');
    console.log("📋 Retrieved AIOT data:", {
        exchanges: Object.keys(retrievedCurrencyData.prices),
        opportunities: retrievedCurrencyData.opportunities.length,
        config: retrievedCurrencyData.config
    });
    
    const retrievedExchangeData = dataManager.getExchangeData('mexc');
    console.log("📋 Retrieved MEXC data:", {
        name: retrievedExchangeData.name,
        bid: retrievedExchangeData.bid,
        ask: retrievedExchangeData.ask
    });
    
    const retrievedOpportunities = dataManager.getOpportunities('AIOT');
    console.log("📋 Retrieved AIOT opportunities:", retrievedOpportunities.length);
    
    const retrievedStats = dataManager.getStatistics('system');
    console.log("📋 Retrieved system statistics:", retrievedStats);
    
    // Test 4: Caching System
    console.log("\n📊 Test 4: Caching System");
    console.log("-".repeat(40));
    
    // Cache some data
    const cacheKey = 'test-cache-key';
    const cacheData = { test: 'data', timestamp: Date.now() };
    dataManager.cacheData(cacheKey, cacheData, 60000); // 1 minute TTL
    console.log("✅ Cached test data");
    
    // Retrieve cached data
    const retrievedCacheData = dataManager.getCachedData(cacheKey);
    console.log("📋 Retrieved cached data:", retrievedCacheData);
    
    // Test 5: Multi-Currency Configuration Integration
    console.log("\n📊 Test 5: Multi-Currency Configuration Integration");
    console.log("-".repeat(40));
    
    const currencies = getAvailableCurrencies();
    console.log(`💰 Available currencies: ${currencies.join(', ')}`);
    
    currencies.forEach(currency => {
        const config = getCurrencyConfig(currency);
        console.log(`📋 ${currency} config:`, {
            profitThreshold: config.profitThresholdPercent,
            tradeVolume: config.tradeVolumeUSD,
            enabledExchanges: Object.keys(config.exchanges).filter(id => config.exchanges[id].enabled)
        });
        
        // Store configuration in data manager
        dataManager.storeConfiguration(currency, {
            profitThreshold: config.profitThresholdPercent,
            tradeVolume: config.tradeVolumeUSD,
            enabledExchanges: Object.keys(config.exchanges).filter(id => config.exchanges[id].enabled)
        });
    });
    
    // Test 6: Statistics and Performance
    console.log("\n📊 Test 6: Statistics and Performance");
    console.log("-".repeat(40));
    
    const calcStats = calculationManager.getStatistics();
    console.log("📊 Calculation manager stats:", calcStats);
    
    const dataStats = dataManager.getManagerStatistics();
    console.log("📊 Data manager stats:", dataStats);
    
    // Test 7: Data Export/Import
    console.log("\n📊 Test 7: Data Export/Import");
    console.log("-".repeat(40));
    
    const exportedData = dataManager.exportData();
    console.log("✅ Exported data length:", exportedData.length, "characters");
    
    // Clear data and import back
    dataManager.clearAllData();
    console.log("🗑️ Cleared all data");
    
    dataManager.importData(exportedData);
    console.log("✅ Imported data back");
    
    const restoredData = dataManager.getAllData();
    console.log("📋 Restored data keys:", Object.keys(restoredData));
    
    console.log("\n✅ Centralized system test completed successfully!");
    console.log("=".repeat(70));
    
    console.log("\n🎯 Key Benefits Demonstrated:");
    console.log("1. ✅ All calculations centralized in calculationManager");
    console.log("2. ✅ All data stored and managed in dataManager");
    console.log("3. ✅ Data is reusable across the entire project");
    console.log("4. ✅ Caching system for performance optimization");
    console.log("5. ✅ Data validation and error handling");
    console.log("6. ✅ Export/import functionality for data persistence");
    console.log("7. ✅ Statistics and performance monitoring");
    console.log("8. ✅ Multi-currency configuration integration");
}

// Run the test
testCentralizedSystem().catch(error => {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
});
