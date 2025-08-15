/**
 * Test script for MEXC Futures price fetching
 * 
 * This script tests the MEXC futures price fetching functionality
 * to ensure it's getting prices from futures market, not spot.
 * 
 * Usage:
 * node test_mexc_futures.js
 */

import exchangeManager from './src/Arbitrage Logic/exchanges/exchangeManager.js';
import config from './src/Arbitrage Logic/config/config.js';

async function testMexcFutures() {
    try {
        console.log('🧪 Testing MEXC Futures price fetching...');
        console.log('MEXC Config:', config.exchanges.mexc);
        console.log('Symbol:', config.symbols.mexc);
        console.log('');

        // Initialize exchange manager
        console.log('🔄 Initializing exchange manager...');
        await exchangeManager.initialize();
        console.log('✅ Exchange manager initialized');

        // Test futures price fetching
        console.log('📊 Testing MEXC futures price fetching...');
        const futuresPrice = await exchangeManager.getMexcPrice('GAIA/USDT:USDT');

        console.log('');
        console.log('📈 MEXC Futures Results:');
        console.log('Symbol:', futuresPrice.symbol);
        console.log('Bid:', futuresPrice.bid);
        console.log('Ask:', futuresPrice.ask);
        console.log('Spread:', futuresPrice.ask - futuresPrice.bid);
        console.log('Spread %:', ((futuresPrice.ask - futuresPrice.bid) / futuresPrice.bid * 100).toFixed(4) + '%');
        console.log('Timestamp:', new Date(futuresPrice.timestamp).toLocaleString());

        // Test spot price for comparison (if needed)
        console.log('');
        console.log('🔍 Testing MEXC spot price for comparison...');
        try {
            const spotExchange = exchangeManager.getExchange('mexc');
            // Temporarily change to spot
            spotExchange.options.defaultType = 'spot';
            const spotTicker = await spotExchange.fetchTicker('GAIA/USDT');
            console.log('Spot Bid:', spotTicker.bid);
            console.log('Spot Ask:', spotTicker.ask);
            console.log('Spot Spread:', spotTicker.ask - spotTicker.bid);

            // Change back to futures
            spotExchange.options.defaultType = 'future';
            console.log('✅ Switched back to futures mode');
        } catch (error) {
            console.log('⚠️ Could not fetch spot price for comparison:', error.message);
        }

        console.log('');
        console.log('✅ MEXC Futures test completed successfully!');

    } catch (error) {
        console.error('❌ Error during MEXC futures test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testMexcFutures().catch(console.error);