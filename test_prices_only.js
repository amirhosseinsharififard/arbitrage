import WebInterface from './web_interface.js';

// Mock exchange data for testing prices only
const mockExchangeData = {
    exchanges: {
        lbank: {
            name: 'LBank',
            bid: 0.000722,
            ask: 0.000726,
            symbol: 'DEBT/USDT',
            timestamp: Date.now()
        },
        mexc: {
            name: 'MEXC',
            bid: 0.000739,
            ask: 0.00074,
            symbol: 'DEBT/USDT',
            timestamp: Date.now()
        },
        kcex: {
            name: 'KCEX',
            bid: 0.000739,
            ask: 0.00074,
            symbol: 'DEBT/USDT',
            timestamp: Date.now()
        },
        dexscreener: {
            name: 'DexScreener',
            bid: 0.0007297,
            ask: null,
            symbol: 'DEBT/USDT',
            isDEX: true,
            timestamp: Date.now()
        },
        // Add more exchanges for different symbols
        binance: {
            name: 'Binance',
            bid: 0.000735,
            ask: 0.000738,
            symbol: 'ETH/USDT',
            timestamp: Date.now()
        },
        coinbase: {
            name: 'Coinbase',
            bid: 0.000732,
            ask: 0.000740,
            symbol: 'ETH/USDT',
            timestamp: Date.now()
        },
        kraken: {
            name: 'Kraken',
            bid: 0.000734,
            ask: 0.000739,
            symbol: 'ETH/USDT',
            timestamp: Date.now()
        },
        // BTC pairs
        bitfinex: {
            name: 'Bitfinex',
            bid: 0.000045,
            ask: 0.000048,
            symbol: 'BTC/USDT',
            timestamp: Date.now()
        },
        huobi: {
            name: 'Huobi',
            bid: 0.000044,
            ask: 0.000049,
            symbol: 'BTC/USDT',
            timestamp: Date.now()
        },
        okx: {
            name: 'OKX',
            bid: 0.000046,
            ask: 0.000047,
            symbol: 'BTC/USDT',
            timestamp: Date.now()
        }
    }
};

class PricesOnlyWebInterface extends WebInterface {
    constructor() {
        super();
        this.port = 3002; // Different port to avoid conflicts
        this.testMode = true;
    }

    sendDataToClient(socket) {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                exchangeData: mockExchangeData,
                config: {
                    tradeVolumeUSD: 200,
                    profitThresholdPercent: 3.1,
                    closeThresholdPercent: 2.5,
                    intervalMs: 50
                }
            };
            
            console.log('🧪 Sending prices data to client');
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending prices data to client:', error.message);
        }
    }

    broadcastDataUpdate() {
        if (this.isRunning) {
            try {
                // Simulate changing prices for all exchanges
                mockExchangeData.exchanges.lbank.bid = (0.000720 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.lbank.ask = (0.000724 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.mexc.bid = (0.000737 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.mexc.ask = (0.000738 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.kcex.bid = (0.000737 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.kcex.ask = (0.000738 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.dexscreener.bid = (0.000727 + Math.random() * 0.000010).toFixed(6);
                
                // ETH prices
                mockExchangeData.exchanges.binance.bid = (0.000730 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.binance.ask = (0.000735 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.coinbase.bid = (0.000728 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.coinbase.ask = (0.000737 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.kraken.bid = (0.000731 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.kraken.ask = (0.000736 + Math.random() * 0.000015).toFixed(6);
                
                // BTC prices
                mockExchangeData.exchanges.bitfinex.bid = (0.000042 + Math.random() * 0.000008).toFixed(6);
                mockExchangeData.exchanges.bitfinex.ask = (0.000045 + Math.random() * 0.000008).toFixed(6);
                mockExchangeData.exchanges.huobi.bid = (0.000041 + Math.random() * 0.000008).toFixed(6);
                mockExchangeData.exchanges.huobi.ask = (0.000046 + Math.random() * 0.000008).toFixed(6);
                mockExchangeData.exchanges.okx.bid = (0.000043 + Math.random() * 0.000008).toFixed(6);
                mockExchangeData.exchanges.okx.ask = (0.000044 + Math.random() * 0.000008).toFixed(6);
                
                // Update timestamps
                Object.values(mockExchangeData.exchanges).forEach(exchange => {
                    exchange.timestamp = Date.now();
                });
                
                const data = {
                    timestamp: new Date().toISOString(),
                    exchangeData: { ...mockExchangeData },
                    config: {
                        tradeVolumeUSD: 200,
                        profitThresholdPercent: 3.1,
                        closeThresholdPercent: 2.5,
                        intervalMs: 50
                    }
                };
                
                console.log('🧪 Broadcasting prices update');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting prices update:', error.message);
            }
        }
    }
}

async function testPricesOnly() {
    console.log('🧪 Testing prices-only web interface...');
    
    try {
        const webInterface = new PricesOnlyWebInterface();
        await webInterface.start();
        
        console.log('✅ Prices-only web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3002');
        console.log('💰 You should see only exchange prices table');
        console.log('📊 Data updates every 2 seconds with simulated price changes');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping prices-only web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start prices-only web interface:', error.message);
        process.exit(1);
    }
}

testPricesOnly();
