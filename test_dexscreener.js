/**
 * Test script for DexScreener+ integration
 * This script will test the DexScreener Puppeteer service to identify any issues
 */

import config from './src/Arbitrage Logic/config/config.js';
import dexscreenerPuppeteerService from './src/puppeteer/dexscreenerService.js';
import { FormattingUtils } from './src/Arbitrage Logic/utils/index.js';
import chalk from 'chalk';

console.log('🧪 Testing DexScreener+ Integration...\n');

// Test 1: Check configuration
console.log('📋 Configuration Test:');
console.log(`   Enabled: ${config.dexscreener.enabled}`);
console.log(`   URL: ${config.dexscreener.url}`);
console.log(`   Update Interval: ${config.dexscreener.updateInterval}ms`);
console.log(`   Bid Selector: ${config.dexscreener.selectors.bidPrice}`);
console.log(`   Is DEX: ${config.dexscreener.isDEX}`);
console.log('');

// Test 2: Initialize service
console.log('🚀 Initialization Test:');
try {
    const initResult = await dexscreenerPuppeteerService.initialize();
    console.log(`   Initialization Result: ${initResult ? '✅ Success' : '❌ Failed'}`);
    
    if (initResult) {
        console.log('   ✅ Browser and page initialized successfully');
    } else {
        console.log('   ❌ Failed to initialize browser/page');
    }
} catch (error) {
    console.log(`   ❌ Initialization Error: ${error.message}`);
}
console.log('');

// Test 3: Extract prices
console.log('📊 Price Extraction Test:');
try {
    const priceData = await dexscreenerPuppeteerService.extractPrices();
    console.log('   Raw Price Data:');
    console.log(`     Bid: ${priceData.bid}`);
    console.log(`     Ask: ${priceData.ask}`);
    console.log(`     Exchange ID: ${priceData.exchangeId}`);
    console.log(`     Symbol: ${priceData.symbol}`);
    console.log(`     Is DEX: ${priceData.isDEX}`);
    console.log(`     Error: ${priceData.error || 'None'}`);
    console.log(`     Timestamp: ${new Date(priceData.timestamp).toLocaleString()}`);
    
    if (priceData.bid !== null) {
        console.log(`   ✅ Bid price extracted: ${chalk.white(FormattingUtils.formatPrice(priceData.bid))}`);
    } else {
        console.log('   ❌ No bid price extracted');
    }
    
    if (priceData.error) {
        console.log(`   ⚠️ Error occurred: ${priceData.error}`);
    }
} catch (error) {
    console.log(`   ❌ Price Extraction Error: ${error.message}`);
}
console.log('');

// Test 4: Multiple price extractions
console.log('🔄 Multiple Extraction Test:');
for (let i = 1; i <= 3; i++) {
    try {
        console.log(`   Attempt ${i}:`);
        const priceData = await dexscreenerPuppeteerService.extractPrices();
        if (priceData.bid !== null) {
            console.log(`     ✅ Bid: ${chalk.white(FormattingUtils.formatPrice(priceData.bid))}`);
        } else {
            console.log(`     ❌ No bid price`);
        }
        
        if (priceData.error) {
            console.log(`     ⚠️ Error: ${priceData.error}`);
        }
        
        // Wait 1 second between attempts
        if (i < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
    }
}
console.log('');

// Test 5: Check service status
console.log('📈 Service Status Test:');
console.log(`   Service Running: ${dexscreenerPuppeteerService.isServiceRunning()}`);
console.log(`   Browser: ${dexscreenerPuppeteerService.browser ? '✅ Active' : '❌ Not Active'}`);
console.log(`   Page: ${dexscreenerPuppeteerService.page ? '✅ Active' : '❌ Not Active'}`);
console.log('');

// Test 6: Get current prices
console.log('💾 Current Prices Test:');
try {
    const currentPrices = dexscreenerPuppeteerService.getCurrentPrices();
    console.log('   Current Price Data:');
    console.log(`     Bid: ${currentPrices.bid}`);
    console.log(`     Ask: ${currentPrices.ask}`);
    console.log(`     Exchange ID: ${currentPrices.exchangeId}`);
    console.log(`     Symbol: ${currentPrices.symbol}`);
    console.log(`     Is DEX: ${currentPrices.isDEX}`);
    console.log(`     Error: ${currentPrices.error || 'None'}`);
} catch (error) {
    console.log(`   ❌ Error getting current prices: ${error.message}`);
}
console.log('');

// Test 7: Cleanup
console.log('🧹 Cleanup Test:');
try {
    await dexscreenerPuppeteerService.cleanup();
    console.log('   ✅ Cleanup completed successfully');
} catch (error) {
    console.log(`   ❌ Cleanup Error: ${error.message}`);
}

console.log('\n🏁 DexScreener+ Test Complete!');
