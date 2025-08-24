/**
 * Debug script for OurBit price extraction
 * This script tests OurBit Puppeteer service directly
 */

import ourbitPuppeteerService from './src/puppeteer/index.js';
import { getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';

async function testOurbitDebug() {
    console.log('🔍 Debugging OurBit price extraction...');
    console.log('========================================');

    try {
        // Get AIOT configuration
        const aiotConfig = getCurrencyConfig('AIOT');
        console.log('📋 AIOT Configuration:');
        console.log(`   OurBit URL: ${aiotConfig.exchanges.ourbit.url}`);
        console.log(`   OurBit Enabled: ${aiotConfig.exchanges.ourbit.enabled}`);
        console.log('');

        // Configure Puppeteer service
        console.log('🔧 Configuring Puppeteer service...');
        ourbitPuppeteerService.setConfig(aiotConfig);
        console.log(`   Configured URL: ${ourbitPuppeteerService.url}`);
        console.log(`   Configured Selectors:`, ourbitPuppeteerService.selectors);
        console.log('');

        // Initialize service
        console.log('🚀 Initializing OurBit Puppeteer service...');
        const initSuccess = await ourbitPuppeteerService.initialize();
        console.log(`   Initialization: ${initSuccess ? '✅ Success' : '❌ Failed'}`);
        console.log('');

        if (!initSuccess) {
            console.log('❌ Service initialization failed');
            return;
        }

        // Test price extraction multiple times
        console.log('📊 Testing price extraction (10 attempts):');
        console.log('========================================');

        for (let i = 1; i <= 10; i++) {
            console.log(`\n🔄 Attempt ${i}:`);

            try {
                // Extract prices directly
                const priceData = await ourbitPuppeteerService.extractPrices();

                console.log(`   Bid: ${priceData.bid || 'n/a'}`);
                console.log(`   Ask: ${priceData.ask || 'n/a'}`);
                console.log(`   Error: ${priceData.error || 'None'}`);
                console.log(`   Timestamp: ${new Date(priceData.timestamp).toLocaleTimeString()}`);

                if (priceData.bid || priceData.ask) {
                    console.log(`   ✅ Price extraction successful!`);
                    break;
                }

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }

            // Wait 2 seconds between attempts
            if (i < 10) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await ourbitPuppeteerService.cleanup();
        console.log('✅ Cleanup completed');

    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
    }
}

// Run the test
testOurbitDebug().then(() => {
    console.log('\n🏁 Debug test finished');
    process.exit(0);
}).catch((error) => {
    console.error(`💥 Debug test crashed: ${error.message}`);
    process.exit(1);
});