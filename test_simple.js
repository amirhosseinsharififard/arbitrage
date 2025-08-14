import ccxt from 'ccxt';

async function testSimple() {
    try {
        console.log('🚀 Testing simple market access...');
        
        // Test MEXC
        console.log('📊 Testing MEXC...');
        const mexc = new ccxt.mexc({
            enableRateLimit: true,
            options: { defaultType: "swap" }
        });
        
        await mexc.loadMarkets();
        console.log('✅ MEXC markets loaded');
        
        const mexcSymbol = "DEBT/USDT:USDT";
        if (mexc.markets[mexcSymbol]) {
            console.log(`✅ ${mexcSymbol} available on MEXC`);
            
            // Try to get orderbook
            try {
                const orderbook = await mexc.fetchOrderBook(mexcSymbol);
                console.log(`✅ MEXC orderbook: ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`);
                if (orderbook.bids.length > 0 && orderbook.asks.length > 0) {
                    console.log(`   Best bid: ${orderbook.bids[0][0]} x ${orderbook.bids[0][1]}`);
                    console.log(`   Best ask: ${orderbook.asks[0][0]} x ${orderbook.asks[0][1]}`);
                }
            } catch (err) {
                console.log(`❌ MEXC orderbook error: ${err.message}`);
            }
        } else {
            console.log(`❌ ${mexcSymbol} not found on MEXC`);
        }
        
        // Test LBank
        console.log('\n📊 Testing LBank...');
        const lbank = new ccxt.lbank({
            enableRateLimit: true,
            options: { defaultType: "swap" }
        });
        
        await lbank.loadMarkets();
        console.log('✅ LBank markets loaded');
        
        const lbankSymbol = "DEBT/USDT:USDT";
        if (lbank.markets[lbankSymbol]) {
            console.log(`✅ ${lbankSymbol} available on LBank`);
            
            // Try to get orderbook
            try {
                const orderbook = await lbank.fetchOrderBook(lbankSymbol);
                console.log(`✅ LBank orderbook: ${orderbook.bids.length} bids, ${orderbook.asks.length} asks`);
                if (orderbook.bids.length > 0 && orderbook.asks.length > 0) {
                    console.log(`   Best bid: ${orderbook.bids[0][0]} x ${orderbook.bids[0][1]}`);
                    console.log(`   Best ask: ${orderbook.asks[0][0]} x ${orderbook.asks[0][1]}`);
                }
            } catch (err) {
                console.log(`❌ LBank orderbook error: ${err.message}`);
            }
        } else {
            console.log(`❌ ${lbankSymbol} not found on LBank`);
        }
        
        console.log('\n✅ Simple test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSimple();
