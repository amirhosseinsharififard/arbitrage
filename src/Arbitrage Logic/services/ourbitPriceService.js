/**
 * Ourbit Price Service - Integration with Puppeteer for Ourbit Exchange
 * 
 * This module provides price data services for Ourbit exchange using Puppeteer
 * web scraping, replacing MEXC and Bybit functionality.
 * 
 * Features:
 * - Real-time price fetching from Ourbit via Puppeteer
 * - 100ms update intervals as requested
 * - Integration with existing arbitrage system
 * - Error handling and fallback mechanisms
 * - Unified price data interface
 */

import ourbitPuppeteerService from '../../Puppeteer Logic/index.js';
import config from '../config/config.js';
import { FormattingUtils } from '../utils/index.js';

/**
 * Ourbit Price Service class for managing Ourbit price data
 * 
 * Features:
 * - Puppeteer-based price extraction
 * - Real-time price monitoring
 * - Integration with arbitrage system
 * - Error handling and retry logic
 * - Performance optimization
 */
class OurbitPriceService {
    constructor() {
        this.isInitialized = false;
        this.priceCache = new Map();
        this.cacheTimeout = 1000; // 1 second cache timeout
        this.updateInterval = 100; // 100ms as requested
        this.monitoringInterval = null;

        // Track previous prices to detect changes
        this.previousPrices = {
            bid: null,
            ask: null
        };
    }

    /**
     * Initialize the Ourbit price service
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Ourbit price service...');
            if (!config.ourbit.enabled) {
                console.log('⚠️ Ourbit service disabled by config');
                this.isInitialized = false;
                return false;
            }

            // Initialize Puppeteer service
            const success = await ourbitPuppeteerService.initialize();
            if (!success) {
                throw new Error('Failed to initialize Puppeteer service');
            }

            // Start price monitoring
            await this.startPriceMonitoring();

            this.isInitialized = true;
            console.log('✅ Ourbit price service initialized successfully');
            return true;

        } catch (error) {
            console.error(`❌ Failed to initialize Ourbit price service: ${error.message}`);
            return false;
        }
    }

    /**
     * Start continuous price monitoring
     */
    async startPriceMonitoring() {
        try {
            if (!config.ourbit.enabled) {
                console.log('⚠️ Ourbit monitoring skipped (disabled)');
                return;
            }
            // Start Puppeteer price monitoring
            ourbitPuppeteerService.startPriceMonitoring();

            // Set up local monitoring interval
            this.monitoringInterval = setInterval(async() => {
                await this.updatePriceCache();
            }, this.updateInterval);

            console.log(`🔄 Ourbit price monitoring started (${this.updateInterval}ms interval)`);

        } catch (error) {
            console.error(`❌ Failed to start price monitoring: ${error.message}`);
        }
    }

    /**
     * Update price cache from Puppeteer service
     */
    async updatePriceCache() {
        try {
            if (!config.ourbit.enabled) return;
            const priceData = ourbitPuppeteerService.getCurrentPrices();

            if (priceData && (priceData.bid || priceData.ask)) {
                // Check if prices have changed
                const pricesChanged = (this.previousPrices.bid !== priceData.bid || this.previousPrices.ask !== priceData.ask);

                if (pricesChanged) {
                    // Update previous prices
                    this.previousPrices.bid = priceData.bid;
                    this.previousPrices.ask = priceData.ask;
                    if (!(config.display && config.display.conciseOutput) && (config.logSettings && config.logSettings.enableDetailedLogging)) {
                        console.log(`${FormattingUtils.label('OURBIT')} Price changed: Bid=${FormattingUtils.formatPrice(priceData.bid)} | Ask=${FormattingUtils.formatPrice(priceData.ask)}`);
                    }
                }

                const symbol = (config.symbols && config.symbols.ourbit) || 'ETH/USDT';
                this.cachePrice('ourbit', symbol, priceData);
            }

        } catch (error) {
            console.error(`❌ Failed to update price cache: ${error.message}`);
        }
    }

    /**
     * Get current price for Ourbit
     */
    async getPrice(exchangeId = 'ourbit', symbol = ((config.symbols && config.symbols.ourbit) || 'ETH/USDT')) {
        try {
            if (!this.isInitialized) {
                throw new Error('Ourbit price service not initialized');
            }
            if (!config.ourbit.enabled) {
                return { bid: null, ask: null, timestamp: Date.now(), exchangeId, symbol, error: null };
            }

            // Get cached price first
            const cached = this.getCachedPrice(exchangeId, symbol);
            if (cached) {
                return cached;
            }

            // Get current price from Puppeteer service
            const priceData = ourbitPuppeteerService.getCurrentPrices();

            if (priceData && (priceData.bid || priceData.ask)) {
                this.cachePrice(exchangeId, symbol, priceData);
                return priceData;
            }

            // Return empty price data if no valid data available
            return {
                bid: null,
                ask: null,
                timestamp: Date.now(),
                exchangeId: exchangeId,
                symbol: symbol,
                error: 'No price data available'
            };

        } catch (error) {
            console.error(`❌ Failed to get Ourbit price: ${error.message}`);
            return {
                bid: null,
                ask: null,
                timestamp: Date.now(),
                exchangeId: exchangeId,
                symbol: symbol,
                error: error.message
            };
        }
    }

    /**
     * Get prices from Ourbit and MEXC (LBank completely disabled)
     */
    async getPricesFromExchanges(exchanges, symbols) {
        try {
            // Get Ourbit price
            const ourbitPrice = await this.getPrice('ourbit', ((config.symbols && config.symbols.ourbit) || 'ETH/USDT'));

            // Return Ourbit and MEXC price data (LBank completely disabled)
            return {
                ourbit: ourbitPrice,
                mexc: {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'GAIA/USDT:USDT',
                    error: 'MEXC data will be fetched from exchange manager'
                }
            };

        } catch (error) {
            console.error(`❌ Failed to get prices from exchanges: ${error.message}`);

            // Return error data for Ourbit and MEXC only
            return {
                ourbit: {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'ourbit',
                    symbol: ((config.symbols && config.symbols.ourbit) || 'ETH/USDT'),
                    error: error.message
                },
                mexc: {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'GAIA/USDT:USDT',
                    error: 'MEXC data will be fetched from exchange manager'
                }
            };
        }
    }

    /**
     * Get order book data (simulated for Ourbit)
     */
    async getOrderBook(exchangeId = 'ourbit', symbol = 'GAIA/USDT') {
        try {
            if (!config.ourbit.enabled) {
                return { bids: [], asks: [], timestamp: Date.now(), exchangeId, symbol, error: null };
            }
            const priceData = await this.getPrice(exchangeId, symbol);

            if (!priceData.bid || !priceData.ask) {
                throw new Error('No valid price data available');
            }

            // Create simulated order book from bid/ask prices
            return {
                bids: [
                    [priceData.bid, 1000]
                ], // Simulated bid with volume
                asks: [
                    [priceData.ask, 1000]
                ], // Simulated ask with volume
                timestamp: priceData.timestamp,
                exchangeId: exchangeId,
                symbol: symbol
            };

        } catch (error) {
            console.error(`❌ Failed to get Ourbit order book: ${error.message}`);
            return {
                bids: [],
                asks: [],
                timestamp: Date.now(),
                exchangeId: exchangeId,
                symbol: symbol,
                error: error.message
            };
        }
    }

    /**
     * Get order books from exchanges (Ourbit and MEXC only)
     */
    async getOrderBooksFromExchanges(exchanges, symbols) {
        try {
            const ourbitOrderBook = await this.getOrderBook('ourbit', 'GAIA/USDT');

            return {
                ourbit: ourbitOrderBook,
                mexc: {
                    bids: [],
                    asks: [],
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'GAIA/USDT:USDT',
                    error: 'MEXC order book will be fetched from exchange manager'
                }
            };

        } catch (error) {
            console.error(`❌ Failed to get order books from exchanges: ${error.message}`);

            return {
                ourbit: {
                    bids: [],
                    asks: [],
                    timestamp: Date.now(),
                    exchangeId: 'ourbit',
                    symbol: 'GAIA/USDT',
                    error: error.message
                },
                mexc: {
                    bids: [],
                    asks: [],
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'GAIA/USDT:USDT',
                    error: 'MEXC order book will be fetched from exchange manager'
                }
            };
        }
    }

    /**
     * Cache price data
     */
    cachePrice(exchangeId, symbol, priceData) {
        const cacheKey = `${exchangeId}-${symbol}`;
        this.priceCache.set(cacheKey, {
            data: priceData,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached price data
     */
    getCachedPrice(exchangeId, symbol) {
        const cacheKey = `${exchangeId}-${symbol}`;
        const cached = this.priceCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        return null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.priceCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, cached] of this.priceCache.entries()) {
            if (now - cached.timestamp < this.cacheTimeout) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.priceCache.size,
            validEntries: validEntries,
            expiredEntries: expiredEntries,
            cacheTimeout: this.cacheTimeout,
            updateInterval: this.updateInterval
        };
    }

    /**
     * Validate price data
     */
    validatePriceData(priceData) {
        if (!priceData || typeof priceData !== 'object') {
            return false;
        }

        if (!('bid' in priceData) || !('ask' in priceData)) {
            return false;
        }

        if (priceData.bid !== null && (typeof priceData.bid !== 'number' || isNaN(priceData.bid))) {
            return false;
        }

        if (priceData.ask !== null && (typeof priceData.ask !== 'number' || isNaN(priceData.ask))) {
            return false;
        }

        if (priceData.bid !== null && priceData.ask !== null && priceData.bid >= priceData.ask) {
            return false;
        }

        return true;
    }

    /**
     * Stop price monitoring and cleanup
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up Ourbit price service...');

            // Stop monitoring interval
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }

            // Stop Puppeteer service
            ourbitPuppeteerService.stopPriceMonitoring();

            // Cleanup Puppeteer resources
            await ourbitPuppeteerService.cleanup();

            // Clear cache
            this.clearCache();

            this.isInitialized = false;
            console.log('✅ Ourbit price service cleaned up');

        } catch (error) {
            console.error(`❌ Error during cleanup: ${error.message}`);
        }
    }

    /**
     * Check if service is healthy
     */
    isHealthy() {
        if (!config.ourbit.enabled) return true;
        return this.isInitialized && ourbitPuppeteerService.isHealthy();
    }
}

// Create singleton instance
const ourbitPriceService = new OurbitPriceService();

export default ourbitPriceService;
export { OurbitPriceService };