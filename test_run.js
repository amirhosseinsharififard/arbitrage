import config from "./src/Arbitrage Logic/config/config.js";
import exchangeManager from "./src/Arbitrage Logic/exchanges/exchangeManager.js";

async function testSystem() {
    try {
        console.log('🚀 Testing arbitrage system startup...');
        
        // Test config loading
        console.log('✅ Config loaded successfully');
        console.log(`   Symbols: MEXC=${config.symbols.mexc}, LBank=${config.symbols.lbank}`);
        console.log(`   Profit threshold: ${config.profitThresholdPercent}%`);
        console.log(`   Close threshold: ${config.closeThresholdPercent}%`);
        
        // Test exchange initialization
        console.log('🔄 Initializing exchanges...');
        await exchangeManager.initialize();
        const exchanges = exchangeManager.getAllExchanges();
        
        console.log('✅ Exchanges initialized successfully');
        console.log(`   Available exchanges: ${Object.keys(exchanges).join(', ')}`);
        
        // Test market loading
        for (const [exchangeId, exchange] of Object.entries(exchanges)) {
            try {
                console.log(`📊 Loading markets for ${exchangeId}...`);
                await exchange.loadMarkets();
                
                const symbol = config.symbols[exchangeId];
                if (exchange.markets[symbol]) {
                    console.log(`   ✅ ${symbol} is available on ${exchangeId}`);
                    const market = exchange.markets[symbol];
                    console.log(`      Type: ${market.type}, Swap: ${market.swap}, Active: ${market.active}`);
                } else {
                    console.log(`   ❌ ${symbol} not found on ${exchangeId}`);
                }
            } catch (err) {
                console.log(`   ❌ Error loading markets for ${exchangeId}: ${err.message}`);
            }
        }
        
        console.log('✅ System test completed successfully!');
        
    } catch (error) {
        console.error('❌ System test failed:', error.message);
        console.error(error.stack);
    }
}

testSystem();
