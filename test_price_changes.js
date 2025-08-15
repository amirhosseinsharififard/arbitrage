/**
 * Test script for price change detection
 * 
 * This script demonstrates how the system only logs when prices actually change
 */

import ourbitPuppeteerService from './src/Puppeteer Logic/index.js';

async function testPriceChangeDetection() {
    console.log('🧪 Testing price change detection...');

    try {
        // Initialize the service
        console.log('1️⃣ Initializing Ourbit Puppeteer service...');
        const initialized = await ourbitPuppeteerService.initialize();

        if (!initialized) {
            console.error('❌ Failed to initialize Ourbit Puppeteer service');
            return;
        }

        console.log('✅ Ourbit Puppeteer service initialized successfully');

        // Test multiple extractions to see change detection
        console.log('2️⃣ Testing price change detection (10 extractions)...');
        console.log('📝 Only price changes will be logged:');

        for (let i = 0; i < 10; i++) {
            const data = await ourbitPuppeteerService.extractPrices();
            console.log(`   Extraction ${i + 1}: Bid=${data.bid}, Ask=${data.ask} (${data.error ? 'Error' : 'Success'})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        }

        // Cleanup
        console.log('3️⃣ Cleaning up...');
        await ourbitPuppeteerService.cleanup();
        console.log('✅ Cleanup completed');

        console.log('🎉 Price change detection test completed!');
        console.log('💡 Notice that only actual price changes are logged in the Puppeteer service.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await ourbitPuppeteerService.cleanup();
    }
}

// Run the test
testPriceChangeDetection();