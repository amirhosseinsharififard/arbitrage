/**
 * Test script for XT Puppeteer integration
 *
 * This script tests the XT Puppeteer service to ensure it can:
 * 1. Initialize the browser
 * 2. Navigate to XT exchange
 * 3. Extract price data using XPath selectors
 * 4. Handle errors gracefully
 */

import xtPuppeteerService from './src/puppeteer/xtService.js';

async function testXTPuppeteer() {
    console.log('🧪 Testing XT Puppeteer integration...');

    try {
        // Initialize the service
        console.log('1️⃣ Initializing XT Puppeteer service...');
        const initialized = await xtPuppeteerService.initialize();

        if (!initialized) {
            console.error('❌ Failed to initialize XT Puppeteer service');
            return;
        }

        console.log('✅ XT Puppeteer service initialized successfully');

        // Test price extraction
        console.log('2️⃣ Testing price extraction...');
        const priceData = await xtPuppeteerService.extractPrices();

        console.log('📊 Extracted price data:', {
            bid: priceData.bid,
            ask: priceData.ask,
            timestamp: new Date(priceData.timestamp).toLocaleString(),
            error: priceData.error
        });

        if (priceData.bid && priceData.ask) {
            console.log('✅ Price extraction successful!');
            console.log(`💰 Bid: ${priceData.bid}`);
            console.log(`💰 Ask: ${priceData.ask}`);
        } else {
            console.log('⚠️ Price extraction returned null values');
        }

        // Test multiple extractions
        console.log('3️⃣ Testing multiple price extractions...');
        for (let i = 0; i < 5; i++) {
            const data = await xtPuppeteerService.extractPrices();
            console.log(`Extraction ${i + 1}: Bid=${data.bid}, Ask=${data.ask}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }

        // Test health check
        console.log('4️⃣ Testing health check...');
        const isHealthy = xtPuppeteerService.isHealthy();
        console.log(`Health status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

        // Cleanup
        console.log('5️⃣ Cleaning up...');
        await xtPuppeteerService.cleanup();
        console.log('✅ Cleanup completed');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await xtPuppeteerService.cleanup();
    }
}

// Run the test
testXTPuppeteer();