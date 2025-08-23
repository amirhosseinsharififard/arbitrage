/**
 * Simple test to check available currencies
 */

import { getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import chalk from 'chalk';

function testCurrencies() {
    console.log(`${chalk.green('🚀 Testing Available Currencies')}`);
    console.log('='.repeat(50));
    
    const currencies = getAvailableCurrencies();
    
    console.log(`📋 Found ${currencies.length} currencies:`);
    currencies.forEach((currency, index) => {
        console.log(`  ${index + 1}. ${chalk.cyan(currency)}`);
    });
    
    console.log(`\n✅ Currency test completed!`);
}

testCurrencies();
