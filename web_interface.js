import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTradingStatus } from './src/Arbitrage Logic/arbitrage_bot/arbitrage.js';
import statistics from './src/Arbitrage Logic/monitoring/statistics.js';
import { getAvailableCurrencies } from './src/Arbitrage Logic/config/multiCurrencyConfig.js';
import dataManager from './src/Arbitrage Logic/core/dataManager.js';
import { getLatestArbitrageData } from './src/Arbitrage Logic/core/multiCurrencyManager.js';
import logger from './src/Arbitrage Logic/logging/logger.js';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

class WebInterface {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
        this.port = 8080;
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

        // Developer contact API endpoint
        this.app.get('/api/developer-contact', (req, res) => {
            res.json(logger.getDeveloperContact());
        });

        // Error reporting endpoint
        this.app.post('/api/report-error', express.json(), async(req, res) => {
            try {
                const { errorType, message, details } = req.body;
                await logger.logErrorWithContact(errorType, message, details, 'ERROR');
                res.json({ success: true, message: 'Error logged successfully' });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
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

    async broadcastDataUpdate() {
        if (this.isRunning) {
            try {
                const availableCurrencies = getAvailableCurrencies();

                // Get arbitrage opportunities from multi-currency manager
                const arbitrageOpportunities = getLatestArbitrageData();
                console.log(`📊 Web Interface: Retrieved arbitrage data for ${Object.keys(arbitrageOpportunities).length} currencies`);

                // Log opportunities for debugging
                Object.entries(arbitrageOpportunities).forEach(([currency, opportunities]) => {
                    console.log(`✅ Web Interface: ${currency} has ${opportunities.length} opportunities`);
                });

                const data = {
                    timestamp: new Date().toISOString(),
                    exchangeData: {
                        ...this.latestExchangeData,
                        arbitrageOpportunities: arbitrageOpportunities
                    },
                    config: {
                        currencies: availableCurrencies,
                        intervalMs: 50
                    }
                };

                console.log('🌐 Broadcasting multi-currency data update to web interface');
                this.io.emit('data-update', data);
            } catch (error) {
                console.error('❌ Error broadcasting data update:', error.message);

                // Log error with developer contact
                await logger.logErrorWithContact(
                    'WEB_INTERFACE_ERROR',
                    `Error broadcasting data update: ${error.message}`, { context: 'broadcastDataUpdate' },
                    'ERROR'
                );
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
        this.updateInterval = setInterval(async() => {
            if (this.isRunning) {
                await this.broadcastDataUpdate();
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