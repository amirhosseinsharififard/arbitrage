/**
 * Test script for Request Management and Data Update systems
 * Tests concurrent requests, rate limiting, and data caching
 */

import { requestManager, dataUpdateManager, systemMonitor } from './src/Arbitrage Logic/utils/index.js';
import { getAvailableCurrencies, getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import chalk from 'chalk';

async function testRequestManagement() {
    console.log(`${chalk.green('🚀 Testing Request Management System')}`);
    console.log('='.repeat(60));
    
    // Start system monitoring
    systemMonitor.startMonitoring();
    
    // Test concurrent requests
    console.log('\n📊 Testing concurrent requests...');
    
    const currencies = getAvailableCurrencies();
    const testCurrency = currencies[0]; // Use first currency
    
    console.log(`Testing with currency: ${chalk.cyan(testCurrency)}`);
    
    // Simulate multiple concurrent requests
    const requests = [];
    for (let i = 0; i < 5; i++) {
        requests.push({
            exchangeId: 'mexc',
            requestFunction: async () => {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                return { bid: 1.0 + Math.random(), ask: 1.0 + Math.random(), test: true };
            },
            requestId: `test_mexc_${i}`
        });
    }
    
    // Execute concurrent requests
    const results = await requestManager.executeConcurrentRequests(requests);
    console.log(`✅ Completed ${Object.keys(results).length} concurrent requests`);
    
    // Test data update manager
    console.log('\n📊 Testing data update manager...');
    
    const updateFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { bid: 1.5, ask: 1.6, updated: true };
    };
    
    // Test caching
    console.log('Testing data caching...');
    const data1 = await dataUpdateManager.getData('test', 'BTC', updateFunction);
    console.log(`First request: ${data1 ? '✅ Cached' : '❌ No data'}`);
    
    const data2 = await dataUpdateManager.getData('test', 'BTC', updateFunction);
    console.log(`Second request: ${data2 ? '✅ Cached' : '❌ No data'}`);
    
    // Test force update
    console.log('Testing force update...');
    const forceData = await dataUpdateManager.forceUpdate('test', 'BTC', updateFunction);
    console.log(`Force update: ${forceData ? '✅ Success' : '❌ Failed'}`);
    
    // Display statistics
    console.log('\n📊 Request Manager Statistics:');
    requestManager.displayStatus();
    
    console.log('\n📊 Data Update Manager Statistics:');
    dataUpdateManager.displayStatus();
    
    // Display system health
    console.log('\n📊 System Health:');
    systemMonitor.displaySystemHealth();
    
    // Display request history
    console.log('\n📊 Recent Request History:');
    systemMonitor.displayRequestHistory(5);
    
    // Stop monitoring
    setTimeout(() => {
        systemMonitor.stopMonitoring();
        console.log('\n✅ Request management test completed!');
    }, 5000);
}

// Run test
testRequestManagement().catch(error => {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
});
