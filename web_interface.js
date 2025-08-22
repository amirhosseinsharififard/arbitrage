import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTradingStatus } from './src/Arbitrage Logic/arbitrage_bot/arbitrage.js';
import statistics from './src/Arbitrage Logic/monitoring/statistics.js';
import { getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebInterface {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
        this.port = 3000;
        this.isRunning = false;
        this.updateInterval = null;
        
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupRoutes() {
        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Main route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('🌐 Client connected to web interface');
            
            // Send initial data
            this.sendDataToClient(socket);
            
            socket.on('disconnect', () => {
                console.log('🌐 Client disconnected from web interface');
            });
        });
    }

    sendDataToClient(socket) {
        try {
            const availableCurrencies = getAvailableCurrencies();
            const data = {
                timestamp: new Date().toISOString(),
                exchangeData: this.latestExchangeData,
                config: {
                    currencies: availableCurrencies,
                    intervalMs: 50
                }
            };
            
            socket.emit('data-update', data);
        } catch (error) {
            console.error('❌ Error sending data to client:', error.message);
        }
    }

    // Store latest multi-currency data
    latestExchangeData = {
        currencies: {},
        arbitrageOpportunities: [],
        timestamp: null
    };

    // Method to update exchange data
    updateExchangeData(exchangeData) {
        this.latestExchangeData = {
            ...this.latestExchangeData,
            ...exchangeData,
            timestamp: new Date().toISOString()
        };
    }

    broadcastDataUpdate() {
        if (this.isRunning) {
            try {
                const availableCurrencies = getAvailableCurrencies();
                const data = {
                    timestamp: new Date().toISOString(),
                    exchangeData: this.latestExchangeData,
                    config: {
                        currencies: availableCurrencies,
                        intervalMs: 50
                    }
                };
                
                console.log('🌐 Broadcasting multi-currency data update to web interface');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting data update:', error.message);
            }
        }
    }

    async start() {
        try {
            await new Promise((resolve, reject) => {
                this.server.listen(this.port, () => {
                    console.log(`🌐 Web interface started on http://localhost:${this.port}`);
                    this.isRunning = true;
                    
                    // Start automatic updates every 2 seconds
                    this.startAutoUpdates();
                    
                    resolve();
                });
                
                this.server.on('error', (error) => {
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`❌ Failed to start web interface: ${error.message}`);
        }
    }

    startAutoUpdates() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update every 2 seconds
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
                this.broadcastDataUpdate();
            }
        }, 2000);
        
        console.log('🔄 Auto-updates enabled (every 2 seconds)');
    }

    stop() {
        if (this.isRunning) {
            // Clear update interval
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            this.server.close();
            this.isRunning = false;
            console.log('🌐 Web interface stopped');
        }
    }
}

export default WebInterface;
