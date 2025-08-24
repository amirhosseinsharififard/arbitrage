/**
 * Test script for AIOT OurBit integration in main arbitrage system
 * This script runs the main system briefly to test AIOT price fetching
 */

import { processAllCurrencies } from './src/Arbitrage Logic/core/multiCurrencyManager.js';
import { getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import exchangeManager from './src/Arbitrage Logic/exchanges/exchangeManager.js';

async function testAIOTMainSystem() {
    console.log('🧪 Testing AIOT OurBit integration in main system...');
    console.log('========================================');

    try {
        // Check available currencies
        const currencies = getAvailableCurrencies();
        console.log('📋 Available currencies:', currencies);
        console.log('');

        // Initialize exchange manager
        console.log('🚀 Initializing exchange manager...');
        await exchangeManager.initialize();
        console.log('✅ Exchange manager initialized');
        console.log('');

        // Test AIOT processing for 3 iterations
        console.log('📊 Testing AIOT processing (3 iterations):');
        console.log('========================================');

        for (let i = 1; i <= 3; i++) {
            console.log(`\n🔄 Iteration ${i}:`);
            console.log('========');

            try {
                // Process all currencies (including AIOT)
                const results = await processAllCurrencies(exchangeManager.getAllExchanges());

                // Find AIOT result
                const aiotResult = results.find(result => result.currency === 'AIOT');

                if (aiotResult) {
                    console.log(`✅ AIOT processed successfully`);
                    console.log(`   Enabled exchanges: ${aiotResult.enabledExchanges.join(', ')}`);
                    console.log(`   Opportunities found: ${aiotResult.opportunities.length}`);

                    if (aiotResult.prices && Object.keys(aiotResult.prices).length > 0) {
                        console.log('   Prices:');
                        Object.entries(aiotResult.prices).forEach(([exchange, price]) => {
                            if (price && (price.bid || price.ask)) {
                                console.log(`     ${exchange}: Bid=${price.bid || 'n/a'}, Ask=${price.ask || 'n/a'}`);
                            } else {
                                console.log(`     ${exchange}: No price data`);
                            }
                        });
                    } else {
                        console.log('   No price data available');
                    }
                } else {
                    console.log('❌ AIOT not found in results');
                }

            } catch (error) {
                console.log(`❌ Error in iteration ${i}: ${error.message}`);
            }

            // Wait 5 seconds between iterations
            if (i < 3) {
                console.log('⏳ Waiting 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        console.log('\n✅ Test completed');

    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await exchangeManager.cleanup();
        console.log('✅ Cleanup completed');
    }
}

// Run the test
testAIOTMainSystem().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
}).catch((error) => {
    console.error(`💥 Test script crashed: ${error.message}`);
    process.exit(1);
});