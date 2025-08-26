/**
 * LBank Price Service - Real-time price data management for LBank exchange
 * 
 * This service provides:
 * 1. Real-time bid/ask price fetching from LBank via CCXT
 * 2. Price data caching and rate limiting
 * 3. Error handling and retry logic
 * 4. Integration with the main arbitrage system
 * 
 * Uses CCXT library for reliable exchange communication.
 */

import config from "../config/config.js";
import exchangeManager from "../exchanges/exchangeManager.js";

/**
 * LBank Price Service class for managing LBank exchange price data
 * 
 * Features:
 * - Real-time price fetching via CCXT
 * - Automatic error handling and retry logic
 * - Price data caching for performance
 * - Integration with exchange manager
 */
class LbankPriceService {
    constructor() {
        this.isInitialized = false;
        this.lastFetchTime = 0;
        this.minFetchInterval = 25; // Reduced from 100ms to 25ms for faster updates
        this.cachedPrice = null;
        this.cacheTimeout = 50; // Reduced from 1000ms to 50ms for faster updates
    }

    /**
     * Initialize the LBank price service
     * 
     * Ensures exchange manager is initialized and LBank exchange is available.
     * Must be called before any price fetching operations.
     * 
     * @throws {Error} If initialization fails
     */
    async initialize() {
        try {
            // Ensure exchange manager is initialized
            if (!exchangeManager.isInitialized()) {
                await exchangeManager.initialize();
            }

            // Verify LBank exchange is available
            const lbankExchange = exchangeManager.getExchange('lbank');
            if (!lbankExchange) {
                throw new Error('LBank exchange not available');
            }

            this.isInitialized = true;
            console.log('✅ LBank Price Service initialized successfully');
        } catch (error) {
            console.error(`❌ Failed to initialize LBank Price Service: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get current price data from LBank exchange
     * 
     * Fetches real-time bid/ask prices for the configured symbol.
     * Implements caching and rate limiting for optimal performance.
     * 
     * @param {string} exchangeId - Exchange identifier (default: 'lbank')
     * @param {string} symbol - Trading symbol (default: from config)
     * @returns {object} Price data object with bid, ask, timestamp, etc.
     */
    async getPrice(exchangeId = 'lbank', symbol = ((config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT')) {
        try {
            // Check if service is initialized
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Check rate limiting
            const now = Date.now();
            if (now - this.lastFetchTime < this.minFetchInterval) {
                // Return cached data if available and not expired
                if (this.cachedPrice && (now - this.cachedPrice.timestamp) < this.cacheTimeout) {
                    return this.cachedPrice;
                }
            }

            // Fetch price from exchange manager
            const priceData = await exchangeManager.getLbankPrice(symbol);

            // Cache the price data
            this.cachedPrice = priceData;
            this.lastFetchTime = now;

            return priceData;

        } catch (error) {
            console.error(`❌ Failed to get LBank price: ${error.message}`);
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
     * Get prices from LBank and MEXC exchanges
     * 
     * Fetches price data from both LBank and MEXC for arbitrage calculations.
     * 
     * @param {object} exchanges - Exchange configuration
     * @param {object} symbols - Symbol configuration
     * @returns {object} Combined price data from both exchanges
     */
    async getPricesFromExchanges(exchanges, symbols) {
        try {
            // Get LBank price
            const lbankPrice = await this.getPrice('lbank', ((config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT'));

            // Get MEXC price from exchange manager
            let mexcPrice = null;
            try {
                mexcPrice = await exchangeManager.getMexcPrice(symbols.mexc || 'DAM/USDT:USDT');
            } catch (error) {
                mexcPrice = {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'DAM/USDT:USDT',
                    error: error.message
                };
            }

            return {
                lbank: lbankPrice,
                mexc: mexcPrice
            };

        } catch (error) {
            console.error(`❌ Failed to get prices from exchanges: ${error.message}`);

            return {
                lbank: {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'lbank',
                    symbol: ((config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT'),
                    error: error.message
                },
                mexc: {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'mexc',
                    symbol: symbols.mexc || 'DAM/USDT:USDT',
                    error: 'Failed to fetch MEXC price'
                }
            };
        }
    }

    /**
     * Check if the service is ready for operations
     * 
     * @returns {boolean} True if service is initialized and ready
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Get service status information
     * 
     * @returns {object} Service status including initialization state and last fetch time
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            lastFetchTime: this.lastFetchTime,
            cachedPrice: this.cachedPrice,
            minFetchInterval: this.minFetchInterval,
            cacheTimeout: this.cacheTimeout
        };
    }
}

// Create singleton instance
const lbankPriceService = new LbankPriceService();

export default lbankPriceService;
export { LbankPriceService };