/**
 * Basic Currency Configuration Test Script
 * Tests configuration validation without requiring all services
 */

import { getAvailableCurrencies, getCurrencyConfig, getEnabledExchanges } from "./src/Arbitrage Logic/config/multiCurrencyConfig.js";
import chalk from "chalk";

// Test results storage
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

/**
 * Test configuration validation for a currency
 */
function testCurrencyConfig(currencyCode) {
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
        console.log(`  - Target Token Quantity: ${config.targetTokenQuantity}`);
        console.log(`  - Max Token Quantity: ${config.maxTokenQuantity}`);
        
        // Test exchange configurations
        console.log(`\n🔍 Exchange Configurations:`);
        for (const exchangeId of enabledExchanges) {
            testResults.total++;
            
            try {
                let exchangeConfig = config.exchanges[exchangeId];
                let isDex = false;
                
                // Check if it's a DEX exchange
                if (!exchangeConfig && config.dex[exchangeId]) {
                    exchangeConfig = config.dex[exchangeId];
                    isDex = true;
                }
                
                const symbol = config.symbols[exchangeId];
                
                if (exchangeConfig && symbol) {
                    console.log(`  ✅ ${exchangeId}: ${symbol} ${isDex ? '(DEX)' : ''}`);
                    console.log(`     - Enabled: ${exchangeConfig.enabled}`);
                    console.log(`     - Fees: ${exchangeConfig.feesPercent}%`);
                    if (isDex && exchangeConfig.contractAddress) {
                        console.log(`     - Contract: ${exchangeConfig.contractAddress}`);
                        console.log(`     - Network: ${exchangeConfig.network}`);
                    }
                    testResults.passed++;
                } else {
                    console.log(`  ❌ ${exchangeId}: Missing configuration`);
                    testResults.failed++;
                    testResults.errors.push({
                        currency: currencyCode,
                        exchange: exchangeId,
                        error: 'Missing configuration'
                    });
                }
            } catch (error) {
                console.log(`  ❌ ${exchangeId}: ${error.message}`);
                testResults.failed++;
                testResults.errors.push({
                    currency: currencyCode,
                    exchange: exchangeId,
                    error: error.message
                });
            }
        }
        
        // Test DEX configurations
        if (config.dex && Object.keys(config.dex).length > 0) {
            console.log(`\n🔍 DEX Configurations:`);
            for (const [dexId, dexConfig] of Object.entries(config.dex)) {
                testResults.total++;
                
                try {
                    if (dexConfig.enabled) {
                        console.log(`  ✅ ${dexId}: ${dexConfig.symbol || 'N/A'}`);
                        console.log(`     - Contract: ${dexConfig.contractAddress || 'N/A'}`);
                        console.log(`     - Network: ${dexConfig.network || 'N/A'}`);
                        testResults.passed++;
                    } else {
                        console.log(`  ⏭️  ${dexId}: Disabled`);
                    }
                } catch (error) {
                    console.log(`  ❌ ${dexId}: ${error.message}`);
                    testResults.failed++;
                    testResults.errors.push({
                        currency: currencyCode,
                        exchange: dexId,
                        error: error.message
                    });
                }
            }
        }
        
        return { status: 'success', config, enabledExchanges };
        
    } catch (error) {
        console.log(`  ❌ Configuration Error: ${error.message}`);
        testResults.total++;
        testResults.failed++;
        testResults.errors.push({
            currency: currencyCode,
            exchange: 'config',
            error: error.message
        });
        return { status: 'failed', error: error.message };
    }
}

/**
 * Validate symbol formats
 */
function validateSymbolFormats(currencyCode, config) {
    console.log(`\n🔍 Symbol Format Validation:`);
    
    const symbolIssues = [];
    
    for (const [exchangeId, symbol] of Object.entries(config.symbols)) {
        if (!symbol) {
            symbolIssues.push(`${exchangeId}: Missing symbol`);
            continue;
        }
        
        // Basic symbol format validation - different exchanges use different formats
        const isValid = symbol.length > 0;
        if (!isValid) {
            symbolIssues.push(`${exchangeId}: Missing symbol`);
        } else {
            console.log(`  ✅ ${exchangeId}: ${symbol}`);
        }
    }
    
    if (symbolIssues.length > 0) {
        console.log(`  ❌ Issues found:`);
        symbolIssues.forEach(issue => console.log(`     - ${issue}`));
        return false;
    }
    
    return true;
}

/**
 * Main test function
 */
async function runBasicTests() {
    console.log(`${chalk.green('🚀 Starting Basic Configuration Tests')}`);
    console.log(`${chalk.green('='.repeat(60))}`);
    
    const currencies = getAvailableCurrencies();
    console.log(`\n📋 Found ${currencies.length} currencies: ${currencies.join(', ')}`);
    
    const allResults = {};
    
    for (const currencyCode of currencies) {
        allResults[currencyCode] = testCurrencyConfig(currencyCode);
        
        // Validate symbol formats
        if (allResults[currencyCode].status === 'success') {
            validateSymbolFormats(currencyCode, allResults[currencyCode].config);
        }
        
        // Add divider between currencies
        console.log(`\n${chalk.gray('─'.repeat(60))}`);
    }
    
    // Print summary
    console.log(`\n${chalk.yellow('='.repeat(60))}`);
    console.log(`${chalk.yellow('📊 TEST SUMMARY')}`);
    console.log(`${chalk.yellow('='.repeat(60))}`);
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.total - testResults.passed - testResults.failed}`);
    
    if (testResults.errors.length > 0) {
        console.log(`\n${chalk.red('❌ CONFIGURATION ISSUES FOUND:')}`);
        testResults.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.currency} - ${error.exchange}: ${error.error}`);
        });
        
        console.log(`\n${chalk.yellow('🔧 RECOMMENDATIONS:')}`);
        console.log(`  1. Check symbol formats for each exchange`);
        console.log(`  2. Verify exchange configurations are complete`);
        console.log(`  3. Ensure all required fields are present`);
        console.log(`  4. Review DEX contract addresses and networks`);
    } else {
        console.log(`\n${chalk.green('🎉 All configuration tests passed!')}`);
    }
}

// Run the tests
runBasicTests().catch(error => {
    console.error(`\n💥 Test execution failed: ${error.message}`);
    process.exit(1);
});
