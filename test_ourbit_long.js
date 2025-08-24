/**
 * Long test for OurBit integration
 * This script runs multiple iterations to see if OurBit eventually shows up
 */

import { processAllCurrencies } from './src/Arbitrage Logic/core/multiCurrencyManager.js';
import { getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import exchangeManager from './src/Arbitrage Logic/exchanges/exchangeManager.js';

async function testOurbitLong() {
    console.log('🧪 Long test for OurBit integration...');
    console.log('========================================');

    try {
        // Initialize exchange manager
        console.log('🚀 Initializing exchange manager...');
        await exchangeManager.initialize();
        console.log('✅ Exchange manager initialized');
        console.log('');

        // Test for 10 iterations
        console.log('📊 Testing for 10 iterations:');
        console.log('========================================');

        for (let i = 1; i <= 10; i++) {
            console.log(`\n🔄 Iteration ${i}:`);
            console.log('========');

            try {
                // Process all currencies
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

            // Wait 3 seconds between iterations
            if (i < 10) {
                console.log('⏳ Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log('\n✅ Test completed');

    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
    }
}

// Run the test
testOurbitLong().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
}).catch((error) => {
    console.error(`💥 Test script crashed: ${error.message}`);
    process.exit(1);
});