/**
 * Exchange Connection Test Script
 * Tests actual connections to exchanges to identify connectivity issues
 */

import { getAvailableCurrencies, getCurrencyConfig, getEnabledExchanges } from "./src/Arbitrage Logic/config/multiCurrencyConfig.js";
import { lbankPriceService, kcexPuppeteerService, dexscreenerApiService } from "./src/Arbitrage Logic/services/index.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";
import chalk from "chalk";

// Test results storage
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

/**
 * Test a specific exchange connection
 */
async function testExchangeConnection(currencyCode, exchangeId, config) {
    const symbol = config.symbols[exchangeId];
    console.log(`\n🔍 Testing ${currencyCode} on ${exchangeId} (${symbol})`);
    
    try {
        let price = null;
        let responseTime = 0;
        
        switch (exchangeId) {
            case 'lbank':
                if (config.exchanges.lbank?.enabled) {
                    const startTime = Date.now();
                    price = await lbankPriceService.getPrice('lbank', symbol);
                    responseTime = Date.now() - startTime;
                }
                break;
                
            case 'mexc':
                if (config.exchanges.mexc?.enabled) {
                    const exchanges = exchangeManager.getAllExchanges();
                    const mexcExchange = exchanges.get('mexc');
                    if (mexcExchange) {
                        const startTime = Date.now();
                        const ticker = await mexcExchange.fetchTicker(symbol);
                        responseTime = Date.now() - startTime;
                        price = { bid: parseFloat(ticker.bid), ask: parseFloat(ticker.ask), isDEX: false };
                    }
                }
                break;
                
            case 'kcex':
                if (config.exchanges.kcex?.enabled) {
                    const startTime = Date.now();
                    price = await kcexPuppeteerService.getCurrentPrices();
                    responseTime = Date.now() - startTime;
                }
                break;
                
            case 'dexscreener':
                if (config.dex.dexscreener?.enabled) {
                    const dexConfig = config.dex.dexscreener;
                    const startTime = Date.now();
                    price = await dexscreenerApiService.getBidPriceByToken(
                        dexConfig.contractAddress,
                        dexConfig.network
                    );
                    responseTime = Date.now() - startTime;
                }
                break;
                
            case 'ourbit':
                if (config.exchanges.ourbit?.enabled) {
                    console.log(`  ⚠️  Ourbit testing requires puppeteer service`);
                    return { status: 'skipped', reason: 'Requires puppeteer service' };
                }
                break;
                
            case 'xt':
                if (config.exchanges.xt?.enabled) {
                    console.log(`  ⚠️  XT testing requires puppeteer service`);
                    return { status: 'skipped', reason: 'Requires puppeteer service' };
                }
                break;
        }
        
        if (price) {
            console.log(`  ✅ ${exchangeId}: Bid: ${price.bid}, Ask: ${price.ask} (${responseTime}ms)`);
            return { status: 'success', price, responseTime };
        } else {
            console.log(`  ❌ ${exchangeId}: No price data received`);
            return { status: 'failed', reason: 'No price data' };
        }
        
    } catch (error) {
        console.log(`  ❌ ${exchangeId}: ${error.message}`);
        return { status: 'failed', reason: error.message };
    }
}

/**
 * Test all exchanges for a specific currency
 */
async function testCurrencyConnections(currencyCode) {
    console.log(`\n${chalk.blue('='.repeat(60))}`);
    console.log(`${chalk.blue(`Testing Currency: ${currencyCode}`)}`);
    console.log(`${chalk.blue('='.repeat(60))}`);
    
    try {
        const config = getCurrencyConfig(currencyCode);
        const enabledExchanges = getEnabledExchanges(currencyCode);
        
        console.log(`\n📊 Configuration Summary:`);
        console.log(`  - Enabled Exchanges: ${enabledExchanges.join(', ')}`);
        console.log(`  - Profit Threshold: ${config.profitThresholdPercent}%`);
        console.log(`  - Trade Volume: $${config.tradeVolumeUSD}`);
        
        const results = {};
        
        for (const exchangeId of enabledExchanges) {
            testResults.total++;
            const result = await testExchangeConnection(currencyCode, exchangeId, config);
            results[exchangeId] = result;
            
            if (result.status === 'success') {
                testResults.passed++;
            } else if (result.status === 'failed') {
                testResults.failed++;
                testResults.errors.push({
                    currency: currencyCode,
                    exchange: exchangeId,
                    error: result.reason
                });
            }
        }
        
        return results;
        
    } catch (error) {
        console.log(`  ❌ Configuration Error: ${error.message}`);
        testResults.total++;
        testResults.failed++;
        testResults.errors.push({
            currency: currencyCode,
            exchange: 'config',
            error: error.message
        });
        return null;
    }
}

/**
 * Main test function
 */
async function runConnectionTests() {
    console.log(`${chalk.green('🚀 Starting Exchange Connection Tests')}`);
    console.log(`${chalk.green('='.repeat(60))}`);
    
    const currencies = getAvailableCurrencies();
    console.log(`\n📋 Found ${currencies.length} currencies: ${currencies.join(', ')}`);
    
    // Initialize exchange manager
    try {
        await exchangeManager.initialize();
        console.log(`\n✅ Exchange manager initialized`);
    } catch (error) {
        console.log(`\n❌ Failed to initialize exchange manager: ${error.message}`);
        return;
    }
    
    const allResults = {};
    
    for (const currencyCode of currencies) {
        allResults[currencyCode] = await testCurrencyConnections(currencyCode);
        
        // Add divider between currencies
        console.log(`\n${chalk.gray('─'.repeat(60))}`);
    }
    
    // Print summary
    console.log(`\n${chalk.yellow('='.repeat(60))}`);
    console.log(`${chalk.yellow('📊 CONNECTION TEST SUMMARY')}`);
    console.log(`${chalk.yellow('='.repeat(60))}`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.total - testResults.passed - testResults.failed}`);
    
    if (testResults.errors.length > 0) {
        console.log(`\n${chalk.red('❌ CONNECTION ISSUES FOUND:')}`);
        testResults.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.currency} - ${error.exchange}: ${error.error}`);
        });
        
        console.log(`\n${chalk.yellow('🔧 RECOMMENDATIONS:')}`);
        console.log(`  1. Check network connectivity to exchanges`);
        console.log(`  2. Verify API endpoints are accessible`);
        console.log(`  3. Check authentication credentials if required`);
        console.log(`  4. Review exchange-specific error messages`);
        console.log(`  5. Test puppeteer services for web-based exchanges`);
    } else {
        console.log(`\n${chalk.green('🎉 All connection tests passed!')}`);
    }
    
    // Cleanup
    try {
        await exchangeManager.cleanup();
        console.log(`\n✅ Exchange manager cleaned up`);
    } catch (error) {
        console.log(`\n⚠️  Cleanup warning: ${error.message}`);
    }
}

// Run the tests
runConnectionTests().catch(error => {
    console.error(`\n💥 Test execution failed: ${error.message}`);
    process.exit(1);
});
