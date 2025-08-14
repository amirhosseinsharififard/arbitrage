import ccxt from 'ccxt';

// API Logger
class APILogger {
    constructor() {
        this.logs = [];
    }

    log(level, exchange, method, data, error = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            exchange,
            method,
            data,
            error: error ? error.message : null,
            stack: error ? error.stack : null
        };
        
        this.logs.push(logEntry);
        
        // Console output
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${exchange.toUpperCase()}]`;
        if (error) {
            console.log(`${prefix} ${method} -> ERROR: ${error.message}`);
            if (error.stack) {
                console.log(`${prefix} Stack: ${error.stack}`);
            }
        } else {
            console.log(`${prefix} ${method} -> ${JSON.stringify(data).substring(0, 200)}...`);
        }
    }

    getLogs() {
        return this.logs;
    }

    saveToFile(filename = 'api_logs.json') {
        import('fs').then(fs => {
            fs.writeFileSync(filename, JSON.stringify(this.logs, null, 2));
            console.log(`📁 API logs saved to ${filename}`);
        }).catch(err => {
            console.log(`⚠️ Could not save logs to file: ${err.message}`);
        });
    }
}

const apiLogger = new APILogger();

// Create exchange instances with logging
function createLoggedExchange(exchangeId, options) {
    const exchange = new ccxt[exchangeId](options);
    
    // Override fetch method to log all API calls
    const originalFetch = exchange.fetch;
    exchange.fetch = async function(url, method = 'GET', headers = undefined, body = undefined) {
        const startTime = Date.now();
        
        try {
            apiLogger.log('info', exchangeId, `${method} ${url}`, { headers, body });
            
            const response = await originalFetch.call(this, url, method, headers, body);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            apiLogger.log('success', exchangeId, `${method} ${url}`, {
                status: response.status,
                duration: `${duration}ms`,
                data: response.data
            });
            
            return response;
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            apiLogger.log('error', exchangeId, `${method} ${url}`, {
                duration: `${duration}ms`,
                error: error.message
            }, error);
            
            throw error;
        }
    };
    
    return exchange;
}

async function testAPILogging() {
    try {
        console.log('🚀 Starting comprehensive API logging test...\n');
        
        // Test MEXC
        console.log('📊 Testing MEXC API...');
        const mexc = createLoggedExchange('mexc', {
            enableRateLimit: true,
            options: { defaultType: "swap" }
        });
        
        try {
            apiLogger.log('info', 'mexc', 'loadMarkets', {});
            await mexc.loadMarkets();
            apiLogger.log('success', 'mexc', 'loadMarkets', { marketsCount: Object.keys(mexc.markets).length });
        } catch (error) {
            apiLogger.log('error', 'mexc', 'loadMarkets', {}, error);
        }
        
        // Test specific symbol
        const mexcSymbol = "DEBT/USDT:USDT";
        if (mexc.markets[mexcSymbol]) {
            try {
                apiLogger.log('info', 'mexc', 'fetchOrderBook', { symbol: mexcSymbol });
                const orderbook = await mexc.fetchOrderBook(mexcSymbol);
                apiLogger.log('success', 'mexc', 'fetchOrderBook', {
                    symbol: mexcSymbol,
                    bids: orderbook.bids.length,
                    asks: orderbook.asks.length,
                    bestBid: orderbook.bids[0] ? orderbook.bids[0][0] : null,
                    bestAsk: orderbook.asks[0] ? orderbook.asks[0][0] : null
                });
            } catch (error) {
                apiLogger.log('error', 'mexc', 'fetchOrderBook', { symbol: mexcSymbol }, error);
            }
            
            // Test fetchTicker
            try {
                apiLogger.log('info', 'mexc', 'fetchTicker', { symbol: mexcSymbol });
                const ticker = await mexc.fetchTicker(mexcSymbol);
                apiLogger.log('success', 'mexc', 'fetchTicker', {
                    symbol: mexcSymbol,
                    bid: ticker.bid,
                    ask: ticker.ask,
                    last: ticker.last,
                    volume: ticker.baseVolume
                });
            } catch (error) {
                apiLogger.log('error', 'mexc', 'fetchTicker', { symbol: mexcSymbol }, error);
            }
        }
        
        // Test LBank
        console.log('\n📊 Testing LBank API...');
        const lbank = createLoggedExchange('lbank', {
            enableRateLimit: true,
            options: { defaultType: "swap" }
        });
        
        try {
            apiLogger.log('info', 'lbank', 'loadMarkets', {});
            await lbank.loadMarkets();
            apiLogger.log('success', 'lbank', 'loadMarkets', { marketsCount: Object.keys(lbank.markets).length });
        } catch (error) {
            apiLogger.log('error', 'lbank', 'loadMarkets', {}, error);
        }
        
        // Test specific symbol
        const lbankSymbol = "DEBT/USDT:USDT";
        if (lbank.markets[lbankSymbol]) {
            try {
                apiLogger.log('info', 'lbank', 'fetchOrderBook', { symbol: lbankSymbol });
                const orderbook = await lbank.fetchOrderBook(lbankSymbol);
                apiLogger.log('success', 'lbank', 'fetchOrderBook', {
                    symbol: lbankSymbol,
                    bids: orderbook.bids.length,
                    asks: orderbook.asks.length,
                    bestBid: orderbook.bids[0] ? orderbook.bids[0][0] : null,
                    bestAsk: orderbook.asks[0] ? orderbook.asks[0][0] : null
                });
            } catch (error) {
                apiLogger.log('error', 'lbank', 'fetchOrderBook', { symbol: lbankSymbol }, error);
            }
            
            // Test fetchTicker
            try {
                apiLogger.log('info', 'lbank', 'fetchTicker', { symbol: lbankSymbol });
                const ticker = await lbank.fetchTicker(lbankSymbol);
                apiLogger.log('success', 'lbank', 'fetchTicker', {
                    symbol: lbankSymbol,
                    bid: ticker.bid,
                    ask: ticker.ask,
                    last: ticker.last,
                    volume: ticker.baseVolume
                });
            } catch (error) {
                apiLogger.log('error', 'lbank', 'fetchTicker', { symbol: lbankSymbol }, error);
            }
        }
        
        // Test error scenarios
        console.log('\n🔍 Testing error scenarios...');
        
        // Test invalid symbol
        try {
            apiLogger.log('info', 'mexc', 'fetchOrderBook', { symbol: 'INVALID/SYMBOL' });
            await mexc.fetchOrderBook('INVALID/SYMBOL');
        } catch (error) {
            apiLogger.log('error', 'mexc', 'fetchOrderBook', { symbol: 'INVALID/SYMBOL' }, error);
        }
        
        try {
            apiLogger.log('info', 'lbank', 'fetchOrderBook', { symbol: 'INVALID/SYMBOL' });
            await lbank.fetchOrderBook('INVALID/SYMBOL');
        } catch (error) {
            apiLogger.log('error', 'lbank', 'fetchOrderBook', { symbol: 'INVALID/SYMBOL' }, error);
        }
        
        // Save logs to file
        apiLogger.saveToFile('api_test_logs.json');
        
        console.log('\n✅ API logging test completed!');
        console.log(`📊 Total API calls logged: ${apiLogger.logs.length}`);
        
        // Summary
        const errors = apiLogger.logs.filter(log => log.level === 'error');
        const successes = apiLogger.logs.filter(log => log.level === 'success');
        
        console.log(`✅ Successful calls: ${successes.length}`);
        console.log(`❌ Error calls: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\n🚨 Errors found:');
            errors.forEach(error => {
                console.log(`  - ${error.exchange}: ${error.method} -> ${error.error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testAPILogging();
