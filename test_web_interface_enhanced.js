import WebInterface from './web_interface.js';

// Mock data for testing
const mockTradingStatus = {
    isAnyPositionOpen: false,
    totalProfit: 0,
    totalTrades: 0,
    lastTradeProfit: 0,
    totalInvestment: 0,
    openPositionsCount: 0,
    totalOpenTokens: 0
};

const mockSessionStats = {
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    winRate: "0.00",
    totalProfit: "0.00",
    avgProfit: "0.00",
    totalVolume: "0.000000",
    totalFeesUSD: "0.00",
    openPositions: 0,
    currentInvestment: "0.00",
    bestTrade: {
        profit: "0.00",
        tradeNumber: 0
    },
    worstTrade: {
        profit: "0.00",
        tradeNumber: 0
    }
};

const mockConfig = {
    tradeVolumeUSD: 200,
    profitThresholdPercent: 2,
    closeThresholdPercent: 1,
    intervalMs: 100
};

class EnhancedWebInterface extends WebInterface {
    constructor() {
        super();
        this.testMode = true;
    }

    sendDataToClient(socket) {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                tradingStatus: mockTradingStatus,
                sessionStats: mockSessionStats,
                config: mockConfig
            };
            
            console.log('🧪 Sending test data to client');
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending test data to client:', error.message);
        }
    }

    broadcastDataUpdate() {
        if (this.isRunning) {
            try {
                // Simulate changing data
                mockTradingStatus.totalTrades = Math.floor(Math.random() * 10);
                mockTradingStatus.totalProfit = (Math.random() * 100 - 50).toFixed(2);
                mockSessionStats.winRate = (Math.random() * 100).toFixed(2);
                
                const data = {
                    timestamp: new Date().toISOString(),
                    tradingStatus: { ...mockTradingStatus },
                    sessionStats: { ...mockSessionStats },
                    config: mockConfig
                };
                
                console.log('🧪 Broadcasting test data update:', data);
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting test data update:', error.message);
            }
        }
    }
}

async function testEnhancedWebInterface() {
    console.log('🧪 Testing enhanced web interface...');
    
    try {
        const webInterface = new EnhancedWebInterface();
        await webInterface.start();
        
        console.log('✅ Enhanced web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3000');
        console.log('📊 The dashboard should display test data that updates every 2 seconds');
        console.log('🔍 Check browser console for data update logs');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping enhanced web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start enhanced web interface:', error.message);
        process.exit(1);
    }
}

testEnhancedWebInterface();
