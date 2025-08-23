/**
 * Test current system status
 */

import { getAvailableCurrencies, getCurrencyConfig } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import chalk from 'chalk';

function testCurrentStatus() {
    console.log(`${chalk.green('🚀 Current System Status')}`);
    console.log('='.repeat(50));
    
    const currencies = getAvailableCurrencies();
    
    console.log(`📋 Found ${currencies.length} currencies:`);
    
    currencies.forEach(currencyCode => {
        const config = getCurrencyConfig(currencyCode);
        console.log(`\n📊 ${chalk.cyan(currencyCode)}:`);
        
        // Check exchanges
        const enabledExchanges = Object.keys(config.exchanges).filter(ex => config.exchanges[ex]?.enabled);
        console.log(`  🔄 Exchanges: ${enabledExchanges.join(', ')}`);
        
        // Check DEX
        if (config.dex?.dexscreener?.enabled) {
            console.log(`  ✅ DEX: ${config.dex.dexscreener.network} (${config.dex.dexscreener.contractAddress})`);
        } else {
            console.log(`  ❌ DEX: Not enabled`);
        }
        
        // Check trading settings
        if (config.trading) {
            console.log(`  💰 Profit Threshold: ${config.trading.profitThresholdPercent}%`);
            console.log(`  📈 Trade Volume: $${config.trading.tradeVolumeUSD}`);
            console.log(`  🎯 Target Tokens: ${config.trading.targetTokenQuantity}`);
        } else {
            console.log(`  ⚠️ Trading config not found`);
        }
    });
    
    console.log(`\n✅ Status check completed!`);
}

testCurrentStatus();
