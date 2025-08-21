import WebInterface from './web_interface.js';

// Mock exchange data for testing DEX opportunities
const mockExchangeData = {
    exchanges: {
        lbank: {
            name: 'LBank',
            bid: 0.000722,
            ask: 0.000726,
            symbol: 'DEBT/USDT:USDT',
            timestamp: Date.now()
        },
        mexc: {
            name: 'MEXC',
            bid: 0.000739,
            ask: 0.00074,
            symbol: 'DEBT/USDT:USDT',
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
        }
    },
    arbitrageOpportunities: [
        '🟢 DEX DEXSCREENER(Bid:$0.0007297) -> MEXC(Bid:$0.000739) => 1.274%',
        '🟢 DEX DEXSCREENER(Bid:$0.0007297) -> MEXC(Ask:$0.00074) => 1.412%',
        '🟢 LBANK(Bid:$0.000722) -> DEX DEXSCREENER(Bid:$0.0007297) => 1.065%',
        '🟢 KCEX(Ask:$0.00074) -> DEX DEXSCREENER(Bid:$0.0007297) => -1.408%',
        '🟢 MEXC(Bid:$0.000739) -> DEX DEXSCREENER(Bid:$0.0007297) => -1.274%',
        '📈 MEXC(Ask:$0.00074) -> LBANK(Bid:$0.000722) => -2.432%',
        '📈 LBANK(Ask:$0.000726) -> MEXC(Bid:$0.000739) => 1.791%'
    ]
};

class DexOpportunitiesWebInterface extends WebInterface {
    constructor() {
        super();
        this.port = 3001; // Different port to avoid conflicts
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
            
            console.log('🧪 Sending DEX opportunities data to client');
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending DEX opportunities data to client:', error.message);
        }
    }

    broadcastDataUpdate() {
        if (this.isRunning) {
            try {
                // Simulate changing prices
                mockExchangeData.exchanges.lbank.bid = (0.000720 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.lbank.ask = (0.000724 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.mexc.bid = (0.000737 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.mexc.ask = (0.000738 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.kcex.bid = (0.000737 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.kcex.ask = (0.000738 + Math.random() * 0.000010).toFixed(6);
                mockExchangeData.exchanges.dexscreener.bid = (0.000727 + Math.random() * 0.000010).toFixed(6);
                
                // Update timestamps
                Object.values(mockExchangeData.exchanges).forEach(exchange => {
                    exchange.timestamp = Date.now();
                });
                
                // Simulate new DEX arbitrage opportunities
                const opportunities = [
                    '🟢 DEX DEXSCREENER(Bid:$' + mockExchangeData.exchanges.dexscreener.bid + ') -> MEXC(Bid:$' + mockExchangeData.exchanges.mexc.bid + ') => ' + (Math.random() * 2).toFixed(3) + '%',
                    '🟢 LBANK(Bid:$' + mockExchangeData.exchanges.lbank.bid + ') -> DEX DEXSCREENER(Bid:$' + mockExchangeData.exchanges.dexscreener.bid + ') => ' + (Math.random() * 2).toFixed(3) + '%',
                    '🟢 KCEX(Ask:$' + mockExchangeData.exchanges.kcex.ask + ') -> DEX DEXSCREENER(Bid:$' + mockExchangeData.exchanges.dexscreener.bid + ') => ' + (Math.random() * 3 - 1.5).toFixed(3) + '%',
                    '🟢 MEXC(Bid:$' + mockExchangeData.exchanges.mexc.bid + ') -> DEX DEXSCREENER(Bid:$' + mockExchangeData.exchanges.dexscreener.bid + ') => ' + (Math.random() * 2 - 1).toFixed(3) + '%',
                    '📈 MEXC(Ask:$' + mockExchangeData.exchanges.mexc.ask + ') -> LBANK(Bid:$' + mockExchangeData.exchanges.lbank.bid + ') => ' + (Math.random() * 5 - 2.5).toFixed(3) + '%',
                    '📈 LBANK(Ask:$' + mockExchangeData.exchanges.lbank.ask + ') -> MEXC(Bid:$' + mockExchangeData.exchanges.mexc.bid + ') => ' + (Math.random() * 3).toFixed(3) + '%'
                ];
                
                // Randomly select 3-6 opportunities
                const numOpportunities = Math.floor(Math.random() * 4) + 3;
                mockExchangeData.arbitrageOpportunities = opportunities.slice(0, numOpportunities);
                
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
                
                console.log('🧪 Broadcasting DEX opportunities update:', data.exchangeData.arbitrageOpportunities.length, 'opportunities');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting DEX opportunities update:', error.message);
            }
        }
    }
}

async function testDexOpportunities() {
    console.log('🧪 Testing DEX opportunities web interface...');
    
    try {
        const webInterface = new DexOpportunitiesWebInterface();
        await webInterface.start();
        
        console.log('✅ DEX opportunities web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3001');
        console.log('🟢 You should see DEX vs CEX arbitrage opportunities clearly marked');
        console.log('📊 Data updates every 2 seconds with simulated price changes');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping DEX opportunities web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start DEX opportunities web interface:', error.message);
        process.exit(1);
    }
}

testDexOpportunities();
