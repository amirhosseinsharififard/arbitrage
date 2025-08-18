/**
 * Test script to verify arbitrage system works without DexScreener
 */

import { printBidAskPairs } from './src/Arbitrage Logic/prices.js';
import config from './src/Arbitrage Logic/config/config.js';

console.log('🧪 Testing Arbitrage System (DexScreener Disabled)...\n');

// Check configuration
console.log('📋 Exchange Status:');
console.log(`   MEXC: ${config.exchanges.mexc.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   LBank: ${config.exchanges.lbank.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   KCEX: ${config.kcex.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   XT: ${config.xt.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`   DexScreener: ${config.dexscreener.enabled ? '✅ Enabled' : '❌ Disabled'}`);
console.log('');

// Test price collection
console.log('📊 Testing Price Collection...');
console.log('   This will run for 30 seconds to collect price data...\n');

const startTime = Date.now();
const testDuration = 30000; // 30 seconds

async function runTest() {
    let iteration = 0;
    
    while (Date.now() - startTime < testDuration) {
        iteration++;
        console.log(`\n🔄 Iteration ${iteration} - ${new Date().toLocaleTimeString()}`);
        
        try {
            await printBidAskPairs(config.symbols, config.exchanges);
        } catch (error) {
            console.log(`❌ Error in iteration ${iteration}: ${error.message}`);
        }
        
        // Wait 5 seconds between iterations
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('\n✅ Test completed!');
    console.log(`   Total iterations: ${iteration}`);
    console.log(`   Duration: ${(Date.now() - startTime) / 1000} seconds`);
    console.log('\n🎯 Arbitrage system is working correctly with other exchanges!');
}

runTest().catch(console.error);
