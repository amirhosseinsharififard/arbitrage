import WebInterface from './web_interface.js';

// Mock exchange data for testing optimized view
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
        binance: {
            name: 'Binance',
            bid: 0.000735,
            ask: 0.000738,
            symbol: 'DEBT/USDT',
            timestamp: Date.now()
        },
        coinbase: {
            name: 'Coinbase',
            bid: 0.000732,
            ask: 0.000740,
            symbol: 'DEBT/USDT',
            timestamp: Date.now()
        }
    }
};

class OptimizedViewWebInterface extends WebInterface {
    constructor() {
        super();
        this.port = 3006; // Different port to avoid conflicts
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
            
            console.log('🧪 Sending optimized view data to client');
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending optimized view data to client:', error.message);
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
                mockExchangeData.exchanges.binance.bid = (0.000730 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.binance.ask = (0.000735 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.coinbase.bid = (0.000728 + Math.random() * 0.000015).toFixed(6);
                mockExchangeData.exchanges.coinbase.ask = (0.000737 + Math.random() * 0.000015).toFixed(6);
                
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
                
                console.log('🧪 Broadcasting optimized view update');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting optimized view update:', error.message);
            }
        }
    }
}

async function testOptimizedView() {
    console.log('🧪 Testing optimized view web interface...');
    
    try {
        const webInterface = new OptimizedViewWebInterface();
        await webInterface.start();
        
        console.log('✅ Optimized view web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3006');
        console.log('💰 You should see optimized table with 3 rows per cell');
        console.log('📊 Data updates every 2 seconds with simulated price changes');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping optimized view web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start optimized view web interface:', error.message);
        process.exit(1);
    }
}

testOptimizedView();
