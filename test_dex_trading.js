import oneinchService from './src/Arbitrage Logic/services/oneinchService.js';
import dexArbitrageExecutor from './src/Arbitrage Logic/dex_trading/dexArbitrageExecutor.js';
import config from './src/Arbitrage Logic/config/config.js';

console.log('🧪 Testing DEX Trading System...\n');

// Test 1: Check configuration
console.log('📋 DEX Trading Configuration:');
console.log(`   DexScreener Enabled: ${config.dexscreener.enabled}`);
console.log(`   Contract Address: ${config.dexscreener.contractAddress}`);
console.log(`   Use API: ${config.dexscreener.useApi}`);
console.log(`   Profit Threshold: ${config.profitThresholdPercent}%`);
console.log('');

// Test 2: Check 1inch service
console.log('🔗 1inch Service Test:');
try {
    // Test getting tokens list (requires API key)
    const tokens = await oneinchService.getTokens();
    if (tokens.success) {
        console.log('   ✅ 1inch service connected successfully');
        console.log(`   📊 Available tokens: ${Object.keys(tokens.data.tokens || {}).length}`);
    } else {
        console.log('   ⚠️ 1inch service test failed:', tokens.error);
        console.log('   💡 Add ONEINCH_API_KEY to .env file to enable DEX trading');
    }
} catch (error) {
    console.log('   ❌ 1inch service error:', error.message);
}
console.log('');

// Test 3: Simulate arbitrage opportunity
console.log('📊 Simulated Arbitrage Test:');
const mockDexPrice = {
    bid: 0.0009312,
    ask: null,
    exchangeId: 'dexscreener',
    symbol: 'UNITE/USDC',
    isDEX: true
};

const mockCexPrice = {
    bid: 0.0009000,
    ask: 0.0009500,
    exchangeId: 'mexc',
    symbol: 'UNITE/USDT'
};

// Test DEX to CEX arbitrage
const dexToCexProfit = dexArbitrageExecutor.calculateProfitPercent(mockDexPrice, mockCexPrice, 'DEX_TO_CEX');
console.log(`   DEX → CEX Profit: ${dexToCexProfit.toFixed(2)}%`);

// Test CEX to DEX arbitrage  
const cexToDexProfit = dexArbitrageExecutor.calculateProfitPercent(mockDexPrice, mockCexPrice, 'CEX_TO_DEX');
console.log(`   CEX → DEX Profit: ${cexToDexProfit.toFixed(2)}%`);

if (dexToCexProfit > config.profitThresholdPercent || cexToDexProfit > config.profitThresholdPercent) {
    console.log('   🟢 Profitable opportunity detected!');
} else {
    console.log('   ⚠️ No profitable opportunity (below threshold)');
}
console.log('');

// Test 4: Check wallet configuration
console.log('👛 Wallet Configuration:');
const walletAddress = process.env.WALLET_ADDRESS;
if (walletAddress && walletAddress !== '0x0000000000000000000000000000000000000000') {
    console.log('   ✅ Wallet address configured');
    console.log(`   📍 Address: ${walletAddress}`);
} else {
    console.log('   ⚠️ Wallet address not configured');
    console.log('   💡 Add WALLET_ADDRESS to .env file');
}
console.log('');

// Test 5: DEX arbitrage executor
console.log('🤖 DEX Arbitrage Executor Test:');
try {
    const result = await dexArbitrageExecutor.checkAndExecuteArbitrage(
        mockDexPrice,
        mockCexPrice,
        'DEX_TO_CEX'
    );
    
    console.log(`   Executed: ${result.executed}`);
    console.log(`   Reason: ${result.reason}`);
    console.log(`   Profit: ${result.profit.toFixed(2)}%`);
    
} catch (error) {
    console.log('   ❌ Executor test failed:', error.message);
}
console.log('');

console.log('📋 Setup Instructions:');
console.log('1. Get 1inch API key from: https://portal.1inch.dev/');
console.log('2. Copy env.example to .env and fill in your API key');
console.log('3. Add your wallet address to .env file');
console.log('4. Ensure you have USDC balance on Base chain');
console.log('5. Run: node index.js to start arbitrage system');
console.log('');

console.log('🏁 DEX Trading Test Complete!');
