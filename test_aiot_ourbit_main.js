/**
 * Test script for AIOT OurBit integration in main arbitrage system
 * This script tests if the main system can now fetch AIOT prices from OurBit
 */

import { getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import multiCurrencyManager from './src/Arbitrage Logic/core/multiCurrencyManager.js';
import { FormattingUtils } from './src/Arbitrage Logic/utils/index.js';

async function testAIOTOurBitMain() {
    console.log('🧪 Testing AIOT OurBit integration in main system...');
    console.log('========================================');

    try {
        // Get AIOT configuration
        const aiotConfig = getCurrencyConfig('AIOT');
        console.log('📋 AIOT Configuration:');
        console.log(`   Symbol: ${aiotConfig.currency.baseCurrency}/${aiotConfig.currency.quoteCurrency}`);
        console.log(`   OurBit Enabled: ${aiotConfig.exchanges.ourbit.enabled}`);
        console.log(`   OurBit URL: ${aiotConfig.exchanges.ourbit.url}`);
        console.log('');

        // Test price fetching for AIOT
        console.log('📊 Testing AIOT price fetching from OurBit:');
        console.log('========================================');

        for (let i = 1; i <= 3; i++) {
            console.log(`\n🔄 Attempt ${i}:`);

            try {
                // Get OurBit price for AIOT
                const ourbitPrice = await multiCurrencyManager.getExchangePrice('AIOT', 'ourbit', aiotConfig);

                if (ourbitPrice && (ourbitPrice.bid || ourbitPrice.ask)) {
                    console.log(`   OurBit Bid: ${ourbitPrice.bid ? FormattingUtils.formatPrice(ourbitPrice.bid) : 'n/a'}`);
                    console.log(`   OurBit Ask: ${ourbitPrice.ask ? FormattingUtils.formatPrice(ourbitPrice.ask) : 'n/a'}`);
                    console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
                    console.log(`   Error: ${ourbitPrice.error || 'None'}`);
                } else {
                    console.log(`   OurBit Bid: n/a`);
                    console.log(`   OurBit Ask: n/a`);
                    console.log(`   Error: No price data available`);
                }
            } catch (error) {
                console.log(`   Error: ${error.message}`);
            }

            // Wait 3 seconds between attempts
            if (i < 3) {
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
testAIOTOurBitMain().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
}).catch((error) => {
    console.error(`💥 Test script crashed: ${error.message}`);
    process.exit(1);
});