/**
 * Test script for KCEX Puppeteer integration
 */

import kcexPuppeteerService from './src/puppeteer/kcexService.js';
import { getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';

async function testKCEXPuppeteer() {
    console.log('🧪 Testing KCEX Puppeteer integration...');

    try {
        // Get DEBT configuration and set it for KCex service
        const debtConfig = getCurrencyConfig('DEBT');
        kcexPuppeteerService.setConfig(debtConfig);
        
        console.log('1️⃣ Initializing KCEX Puppeteer service...');
        const initialized = await kcexPuppeteerService.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize KCEX Puppeteer service');
            return;
        }

        console.log('✅ KCEX Puppeteer service initialized successfully');
        console.log('2️⃣ Testing price extraction...');
        const priceData = await kcexPuppeteerService.extractPrices();

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

        console.log('3️⃣ Testing multiple price extractions...');
        for (let i = 0; i < 5; i++) {
            const data = await kcexPuppeteerService.extractPrices();
            console.log(`Extraction ${i + 1}: Bid=${data.bid}, Ask=${data.ask}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('4️⃣ Testing health check...');
        const isHealthy = kcexPuppeteerService.isHealthy();
        console.log(`Health status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

        console.log('5️⃣ Cleaning up...');
        await kcexPuppeteerService.cleanup();
        console.log('✅ Cleanup completed');

        console.log('🎉 All tests completed successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await kcexPuppeteerService.cleanup();
    }
}

testKCEXPuppeteer();