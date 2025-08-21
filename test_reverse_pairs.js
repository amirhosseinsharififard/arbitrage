import WebInterface from './web_interface.js';

// Mock exchange data for testing reverse pairs
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

class ReversePairsWebInterface extends WebInterface {
    constructor() {
        super();
        this.port = 3005; // Different port to avoid conflicts
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
            
            console.log('🧪 Sending reverse pairs data to client');
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending reverse pairs data to client:', error.message);
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
                
                console.log('🧪 Broadcasting reverse pairs update');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting reverse pairs update:', error.message);
            }
        }
    }
}

async function testReversePairs() {
    console.log('🧪 Testing reverse pairs web interface...');
    
    try {
        const webInterface = new ReversePairsWebInterface();
        await webInterface.start();
        
        console.log('✅ Reverse pairs web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3005');
        console.log('💰 You should see reverse pairs (LBank(Bid)/MEXC(Ask) next to MEXC(Bid)/LBank(Ask))');
        console.log('📊 Data updates every 2 seconds with simulated price changes');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping reverse pairs web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start reverse pairs web interface:', error.message);
        process.exit(1);
    }
}

testReversePairs();
