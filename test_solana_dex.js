/**
 * Test script for Solana DEX configuration
 * This script will test the DexScreener integration with the new Solana token
 */

import config from './src/Arbitrage Logic/config/config.js';
import dexscreenerApiService from './src/Arbitrage Logic/services/dexscreenerApiService.js';
import dexDataService from './src/Arbitrage Logic/services/dexDataService.js';
import { FormattingUtils } from './src/Arbitrage Logic/utils/index.js';
import chalk from 'chalk';

console.log('🧪 Testing Solana DEX Configuration...\n');

// Test configuration
console.log('📋 Configuration Test:');
console.log(`   URL: ${config.dexscreener.url}`);
console.log(`   Contract Address: ${config.dexscreener.contractAddress}`);
console.log(`   Network: ${config.dexscreener.network}`);
console.log(`   Use API: ${config.dexscreener.useApi}`);
console.log(`   Is DEX: ${config.dexscreener.isDEX}`);
console.log('');

// Test 1: DexScreener API Service
console.log('🔍 Test 1: DexScreener API Service');
try {
    const apiResult = await dexscreenerApiService.getBidPriceByToken(
        config.dexscreener.contractAddress, 
        config.dexscreener.network
    );
    
    if (apiResult.error) {
        console.log(`   ❌ Error: ${apiResult.error}`);
    } else {
        console.log(`   ✅ Bid Price: $${apiResult.bid}`);
        console.log(`   ✅ Symbol: ${apiResult.symbol}`);
        console.log(`   ✅ Exchange ID: ${apiResult.exchangeId}`);
        console.log(`   ✅ Is DEX: ${apiResult.isDEX}`);
    }
} catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
}
console.log('');

// Test 2: DEX Data Service
console.log('🔍 Test 2: DEX Data Service');
try {
    const dexResult = await dexDataService.getDexScreenerPrice(
        config.dexscreener.contractAddress,
        config.dexscreener.network
    );
    
    if (dexResult.success) {
        console.log(`   ✅ Bid Price: $${dexResult.data.bid}`);
        console.log(`   ✅ Volume 24h: $${dexResult.data.volume24h}`);
        console.log(`   ✅ Liquidity: $${dexResult.data.liquidity}`);
        console.log(`   ✅ DEX ID: ${dexResult.data.dexId}`);
        console.log(`   ✅ Pair Address: ${dexResult.data.pairAddress}`);
    } else {
        console.log(`   ❌ Error: ${dexResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
}
console.log('');

// Test 3: Get All DEX Pairs
console.log('🔍 Test 3: Get All DEX Pairs');
try {
    const pairsResult = await dexDataService.getAllDexPairs(config.dexscreener.contractAddress);
    
    if (pairsResult.success) {
        console.log(`   ✅ Found ${pairsResult.data.length} pairs:`);
        pairsResult.data.forEach((pair, index) => {
            console.log(`      ${index + 1}. ${pair.baseToken}/${pair.quoteToken} on ${pair.dexId}`);
            console.log(`         Price: $${pair.priceUsd}`);
            console.log(`         Liquidity: $${pair.liquidity}`);
            console.log(`         Volume 24h: $${pair.volume24h}`);
        });
    } else {
        console.log(`   ❌ Error: ${pairsResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
}
console.log('');

// Test 4: Get Liquidity Info
console.log('🔍 Test 4: Get Liquidity Info');
try {
    const liquidityResult = await dexDataService.getLiquidityInfo(config.dexscreener.contractAddress);
    
    if (liquidityResult.success) {
        console.log(`   ✅ Total Liquidity: $${liquidityResult.data.totalLiquidity}`);
        console.log(`   ✅ Volume 24h: $${liquidityResult.data.volume24h}`);
        console.log(`   ✅ DEX ID: ${liquidityResult.data.dexId}`);
        console.log(`   ✅ Pair Address: ${liquidityResult.data.pairAddress}`);
    } else {
        console.log(`   ❌ Error: ${liquidityResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
}
console.log('');

console.log('✅ Solana DEX Configuration Test Complete!');
console.log('========');
