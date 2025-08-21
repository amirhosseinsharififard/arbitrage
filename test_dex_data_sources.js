import dexDataService from './src/Arbitrage Logic/services/dexDataService.js';
import config from './src/Arbitrage Logic/config/config.js';

console.log('🔍 Testing DEX Data Sources...\n');

const contractAddress = config.dexscreener.contractAddress;

// Test 1: DexScreener (current source)
console.log('📊 1. DexScreener API (Current Source):');
console.log(`   URL: https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
console.log(`   Status: ✅ Always Available (No API key needed)`);
console.log(`   Data: Price, Volume, Liquidity, DEX info`);

try {
    const dexScreenerResult = await dexDataService.getDexScreenerPrice(contractAddress, 'solana');
    if (dexScreenerResult.success) {
        console.log(`   ✅ Price: $${dexScreenerResult.data.bid}`);
        console.log(`   📈 Volume 24h: $${dexScreenerResult.data.volume24h.toLocaleString()}`);
        console.log(`   💧 Liquidity: $${dexScreenerResult.data.liquidity.toLocaleString()}`);
        console.log(`   🏪 DEX: ${dexScreenerResult.data.dexId}`);
    } else {
        console.log(`   ❌ Error: ${dexScreenerResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 2: 1inch API
console.log('🔗 2. 1inch API (Best Aggregator):');
console.log(`   URL: https://api.1inch.dev/swap/v6.0/8453/quote`);
console.log(`   Status: ${process.env.ONEINCH_API_KEY ? '✅ Available' : '⚠️ Requires API key'}`);
console.log(`   Data: Best price from all DEXs, Gas estimate, Protocols used`);

try {
    const oneInchResult = await dexDataService.getOneInchPrice(contractAddress);
    if (oneInchResult.success) {
        console.log(`   ✅ Price: $${oneInchResult.data.bid}`);
        console.log(`   ⛽ Gas Estimate: ${oneInchResult.data.gasEstimate} gas`);
        console.log(`   🔄 Protocols: ${oneInchResult.data.protocols?.length || 0} used`);
    } else {
        console.log(`   ⚠️ ${oneInchResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 3: ParaSwap API
console.log('🔄 3. ParaSwap API (Free Alternative):');
console.log(`   URL: https://apiv5.paraswap.io/prices`);
console.log(`   Status: ✅ Always Available (No API key needed)`);
console.log(`   Data: Price, Gas cost, Exchange routes`);

try {
    const paraSwapResult = await dexDataService.getParaSwapPrice(contractAddress);
    if (paraSwapResult.success) {
        console.log(`   ✅ Price: $${paraSwapResult.data.bid}`);
        console.log(`   ⛽ Gas Cost: $${paraSwapResult.data.gasEstimate || 'N/A'}`);
        console.log(`   🛣️ Exchanges: ${paraSwapResult.data.exchanges?.length || 0} used`);
    } else {
        console.log(`   ⚠️ ${paraSwapResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 4: Aggregated Data
console.log('📈 4. Aggregated DEX Data (All Sources):');
console.log(`   Combining all available sources for best price`);

try {
    const aggregatedResult = await dexDataService.getAggregatedDexPrice(contractAddress);
    console.log(`   📊 Sources Available: ${aggregatedResult.sources.join(', ')}`);
    console.log(`   🏆 Best Price: $${aggregatedResult.bestPrice || 'N/A'}`);
    
    if (aggregatedResult.dexscreener) {
        console.log(`   📊 DexScreener: $${aggregatedResult.dexscreener.bid}`);
    }
    if (aggregatedResult.oneinch) {
        console.log(`   🔗 1inch: $${aggregatedResult.oneinch.bid}`);
    }
    if (aggregatedResult.paraswap) {
        console.log(`   🔄 ParaSwap: $${aggregatedResult.paraswap.bid}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 5: Liquidity Information
console.log('💧 5. Liquidity Information:');
console.log(`   Detailed liquidity and volume data`);

try {
    const liquidityResult = await dexDataService.getLiquidityInfo(contractAddress);
    if (liquidityResult.success) {
        console.log(`   💧 Total Liquidity: $${liquidityResult.data.totalLiquidity.toLocaleString()}`);
        console.log(`   📈 Volume 24h: $${liquidityResult.data.volume24h.toLocaleString()}`);
        console.log(`   🏪 DEX: ${liquidityResult.data.dexId}`);
        console.log(`   🔗 Pair Address: ${liquidityResult.data.pairAddress}`);
    } else {
        console.log(`   ⚠️ ${liquidityResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 6: All DEX Pairs
console.log('🏪 6. All Available DEX Pairs:');
console.log(`   All exchanges where this token is traded`);

try {
    const pairsResult = await dexDataService.getAllDexPairs(contractAddress);
    if (pairsResult.success) {
        console.log(`   📊 Found ${pairsResult.data.length} pairs:`);
        pairsResult.data.forEach((pair, index) => {
            console.log(`   ${index + 1}. ${pair.dexId}: $${pair.priceUsd} (Liquidity: $${pair.liquidity.toLocaleString()})`);
        });
    } else {
        console.log(`   ⚠️ ${pairsResult.error}`);
    }
} catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

console.log('📋 Summary of DEX Data Sources:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. DexScreener API:');
console.log('   ✅ Free, no API key needed');
console.log('   ✅ Price, volume, liquidity, DEX info');
console.log('   ✅ Current implementation');
console.log('');
console.log('2. 1inch API:');
console.log('   ⚠️ Requires API key (free tier available)');
console.log('   ✅ Best price from all DEXs');
console.log('   ✅ Gas estimates, protocol info');
console.log('   ✅ Best for actual trading');
console.log('');
console.log('3. ParaSwap API:');
console.log('   ✅ Free, no API key needed');
console.log('   ✅ Price, gas cost, exchange routes');
console.log('   ✅ Good alternative to 1inch');
console.log('');
console.log('4. 0x Protocol:');
console.log('   ⚠️ Requires API key');
console.log('   ✅ Professional grade');
console.log('   ✅ Advanced features');
console.log('');
console.log('5. Jupiter (Solana):');
console.log('   ✅ Free, no API key needed');
console.log('   ✅ Solana DEX aggregator');
console.log('   ❌ Not applicable for Base chain');
console.log('');

console.log('💡 Recommendations:');
console.log('• Use DexScreener for price monitoring (current)');
console.log('• Add 1inch API key for better trading execution');
console.log('• Consider ParaSwap as backup/alternative');
console.log('• Monitor multiple sources for best arbitrage opportunities');
console.log('');

console.log('🏁 DEX Data Sources Test Complete!');
