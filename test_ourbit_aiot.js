/**
 * Test script for OurBit AIOT price fetching
 * This script will test the OurBit service specifically for AIOT to diagnose why prices are showing as n/a
 */

import ourbitPriceService from './src/Arbitrage Logic/services/ourbitPriceService.js';
import config from './src/Arbitrage Logic/config/config.js';
import multiCurrencyConfig from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import { FormattingUtils } from './src/Arbitrage Logic/utils/index.js';

async function testOurbitAIOT() {
    console.log('🧪 Testing OurBit AIOT price fetching...');
    console.log('========================================');

    try {
        // Get AIOT configuration
        const aiotConfig = multiCurrencyConfig.getCurrencyConfig('AIOT');
        console.log('📋 AIOT Configuration:');
        console.log(`   Symbol: ${aiotConfig.currency.baseCurrency}/${aiotConfig.currency.quoteCurrency}`);
        console.log(`   OurBit URL: ${aiotConfig.exchanges.ourbit.url}`);
        console.log(`   OurBit Enabled: ${aiotConfig.exchanges.ourbit.enabled}`);
        console.log('');

        // Temporarily enable OurBit for testing
        console.log('🔧 Temporarily enabling OurBit for testing...');
        config.ourbit.enabled = true;

        // Check if OurBit is enabled in main config
        console.log('🔧 Main Config Status:');
        console.log(`   OurBit Enabled: ${config.ourbit.enabled}`);
        console.log(`   OurBit URL: ${config.ourbit.url}`);
        console.log(`   Selectors:`, config.ourbit.selectors);
        console.log('');

        // Configure Puppeteer service with AIOT settings
        console.log('🔧 Configuring Puppeteer service with AIOT settings...');
        const ourbitPuppeteerService = await
        import ('./src/puppeteer/index.js');
        ourbitPuppeteerService.default.setConfig(aiotConfig);
        console.log(`   Configured URL: ${ourbitPuppeteerService.default.url}`);
        console.log('');

        // Initialize OurBit service
        console.log('🚀 Initializing OurBit service...');
        const initSuccess = await ourbitPriceService.initialize();
        console.log(`   Initialization: ${initSuccess ? '✅ Success' : '❌ Failed'}`);
        console.log('');

        if (!initSuccess) {
            console.log('❌ Service initialization failed. Cannot proceed with testing.');
            return;
        }

        // Test price fetching multiple times
        console.log('📊 Testing price fetching (5 attempts):');
        console.log('========================================');

        for (let i = 1; i <= 5; i++) {
            console.log(`\n🔄 Attempt ${i}:`);

            // Get price data
            const priceData = await ourbitPriceService.getPrice('ourbit', 'AIOT/USDT');

            console.log(`   Bid: ${priceData.bid !== null ? FormattingUtils.formatPrice(priceData.bid) : 'n/a'}`);
            console.log(`   Ask: ${priceData.ask !== null ? FormattingUtils.formatPrice(priceData.ask) : 'n/a'}`);
            console.log(`   Timestamp: ${new Date(priceData.timestamp).toLocaleTimeString()}`);
            console.log(`   Error: ${priceData.error || 'None'}`);

            // Wait 2 seconds between attempts
            if (i < 5) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Test service health
        console.log('\n🏥 Service Health Check:');
        console.log('========================================');
        const isHealthy = ourbitPriceService.isHealthy();
        console.log(`   Service Healthy: ${isHealthy ? '✅ Yes' : '❌ No'}`);

        // Get cache stats
        const cacheStats = ourbitPriceService.getCacheStats();
        console.log('   Cache Statistics:');
        console.log(`     Total Entries: ${cacheStats.totalEntries}`);
        console.log(`     Valid Entries: ${cacheStats.validEntries}`);
        console.log(`     Expired Entries: ${cacheStats.expiredEntries}`);
        console.log(`     Cache Timeout: ${cacheStats.cacheTimeout}ms`);
        console.log(`     Update Interval: ${cacheStats.updateInterval}ms`);

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await ourbitPriceService.cleanup();
        console.log('✅ Test completed');

    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
    }
}

// Run the test
testOurbitAIOT().then(() => {
    console.log('\n🏁 Test script finished');
    process.exit(0);
}).catch((error) => {
    console.error(`💥 Test script crashed: ${error.message}`);
    process.exit(1);
});