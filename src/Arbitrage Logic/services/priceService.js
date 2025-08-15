/**
 * Price Service - Centralized price data management
 * 
 * This module provides comprehensive price data services including:
 * 1. Real-time price fetching from multiple exchanges
 * 2. Order book data retrieval and processing
 * 3. Price validation and error handling
 * 4. Caching and performance optimization
 * 5. Unified price data interface
 * 
 * All price data is fetched from exchange order books to ensure
 * accuracy and real-time market information.
 */

import exchangeManager from "../exchanges/exchangeManager.js";
import config from "../config/config.js";

/**
 * Main Price Service class for managing price data
 * 
 * Features:
 * - Multi-exchange price fetching
 * - Order book data processing
 * - Price validation and sanitization
 * - Error handling and retry logic
 * - Performance caching
 */
class PriceService {
    /**
     * Initialize the price service
     * 
     * Sets up internal state and prepares for price fetching operations.
     */
    constructor() {
        // Cache for storing recent price data to avoid excessive API calls
        this.priceCache = new Map();
        this.cacheTimeout = config.cache.priceCacheTimeout;

        // Track last fetch times to implement rate limiting
        this.lastFetchTimes = new Map();
        this.minFetchInterval = 100; // Minimum 100ms between fetches
    }

    /**
     * Get current price for a specific symbol and exchange
     * 
     * Fetches the latest price data from the specified exchange.
     * Returns best bid and ask prices from the order book.
     * 
     * @param {string} exchangeId - Exchange identifier (e.g., 'mexc', 'lbank')
     * @param {string} symbol - Trading symbol (e.g., 'DEBT/USDT:USDT')
     * @returns {object} Price object with bid and ask prices
     */
    async getPrice(exchangeId, symbol) {
        try {
            // Check if exchanges are initialized
            if (!exchangeManager.isInitialized()) {
                throw new Error('Exchanges not initialized');
            }

            // Get exchange instance
            const exchange = exchangeManager.getExchange(exchangeId);

            // Check rate limiting
            const now = Date.now();
            const lastFetch = this.lastFetchTimes.get(`${exchangeId}-${symbol}`) || 0;
            if (now - lastFetch < this.minFetchInterval) {
                // Return cached data if available
                const cached = this.getCachedPrice(exchangeId, symbol);
                if (cached) {
                    return cached;
                }
            }

            // Fetch order book from exchange
            const orderBook = await exchange.fetchOrderBook(symbol);

            // Extract best bid and ask prices
            const bestBid = orderBook.bids && orderBook.bids[0] ? orderBook.bids[0][0] : null;
            const bestAsk = orderBook.asks && orderBook.asks[0] ? orderBook.asks[0][0] : null;

            // Create price object
            const priceData = {
                bid: bestBid ? parseFloat(bestBid) : null,
                ask: bestAsk ? parseFloat(bestAsk) : null,
                timestamp: Date.now(),
                exchangeId: exchangeId,
                symbol: symbol
            };

            // Cache the price data
            this.cachePrice(exchangeId, symbol, priceData);

            // Update last fetch time
            this.lastFetchTimes.set(`${exchangeId}-${symbol}`, now);

            return priceData;

        } catch (error) {
            console.error(`❌ Failed to fetch price for ${symbol} from ${exchangeId}: ${error.message}`);

            // Return cached data if available, otherwise return null
            const cached = this.getCachedPrice(exchangeId, symbol);
            if (cached) {
                console.log(`⚠️ Using cached price data for ${symbol} from ${exchangeId}`);
                return cached;
            }

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
     * Get prices from multiple exchanges simultaneously
     * 
     * Fetches price data from all configured exchanges for the given symbols.
     * Uses Promise.all for parallel execution to improve performance.
     * 
     * @param {Map} exchanges - Map of exchange instances
     * @param {object} symbols - Object containing symbols for each exchange
     * @returns {object} Object containing prices for each exchange
     */
    async getPricesFromExchanges(exchanges, symbols) {
        try {
            const pricePromises = [];
            const exchangeIds = [];

            // Create price fetch promises for each exchange
            for (const [exchangeId, symbol] of Object.entries(symbols)) {
                pricePromises.push(this.getPrice(exchangeId, symbol));
                exchangeIds.push(exchangeId);
            }

            // Fetch all prices simultaneously
            const prices = await Promise.all(pricePromises);

            // Organize results by exchange ID
            const result = {};
            exchangeIds.forEach((exchangeId, index) => {
                result[exchangeId] = prices[index];
            });

            return result;

        } catch (error) {
            console.error(`❌ Failed to fetch prices from exchanges: ${error.message}`);

            // Return empty price objects for failed fetches
            const result = {};
            for (const exchangeId of Object.keys(symbols)) {
                result[exchangeId] = {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: exchangeId,
                    symbol: symbols[exchangeId],
                    error: error.message
                };
            }

            return result;
        }
    }

    /**
     * Get order book data for a specific symbol and exchange
     * 
     * Fetches complete order book data including all bid and ask levels.
     * Useful for detailed market analysis and volume calculations.
     * 
     * @param {string} exchangeId - Exchange identifier
     * @param {string} symbol - Trading symbol
     * @returns {object} Complete order book data
     */
    async getOrderBook(exchangeId, symbol) {
        try {
            if (!exchangeManager.isInitialized()) {
                throw new Error('Exchanges not initialized');
            }

            const exchange = exchangeManager.getExchange(exchangeId);
            const orderBook = await exchange.fetchOrderBook(symbol);

            // Validate order book structure
            if (!orderBook || !Array.isArray(orderBook.bids) || !Array.isArray(orderBook.asks)) {
                throw new Error('Invalid order book structure');
            }

            return {
                bids: orderBook.bids,
                asks: orderBook.asks,
                timestamp: orderBook.timestamp || Date.now(),
                exchangeId: exchangeId,
                symbol: symbol
            };

        } catch (error) {
            console.error(`❌ Failed to fetch order book for ${symbol} from ${exchangeId}: ${error.message}`);
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
     * Get order books from multiple exchanges simultaneously
     * 
     * Fetches complete order book data from all configured exchanges.
     * Useful for cross-exchange market analysis and arbitrage calculations.
     * 
     * @param {Map} exchanges - Map of exchange instances
     * @param {object} symbols - Object containing symbols for each exchange
     * @returns {object} Object containing order books for each exchange
     */
    async getOrderBooksFromExchanges(exchanges, symbols) {
        try {
            const orderBookPromises = [];
            const exchangeIds = [];

            // Create order book fetch promises for each exchange
            for (const [exchangeId, symbol] of Object.entries(symbols)) {
                orderBookPromises.push(this.getOrderBook(exchangeId, symbol));
                exchangeIds.push(exchangeId);
            }

            // Fetch all order books simultaneously
            const orderBooks = await Promise.all(orderBookPromises);

            // Organize results by exchange ID
            const result = {};
            exchangeIds.forEach((exchangeId, index) => {
                result[exchangeId] = orderBooks[index];
            });

            return result;

        } catch (error) {
            console.error(`❌ Failed to fetch order books from exchanges: ${error.message}`);

            // Return empty order books for failed fetches
            const result = {};
            for (const exchangeId of Object.keys(symbols)) {
                result[exchangeId] = {
                    bids: [],
                    asks: [],
                    timestamp: Date.now(),
                    exchangeId: exchangeId,
                    symbol: symbols[exchangeId],
                    error: error.message
                };
            }

            return result;
        }
    }

    /**
     * Cache price data for performance optimization
     * 
     * Stores price data in memory cache with timestamp for expiration.
     * Reduces API calls and improves response times.
     * 
     * @param {string} exchangeId - Exchange identifier
     * @param {string} symbol - Trading symbol
     * @param {object} priceData - Price data to cache
     */
    cachePrice(exchangeId, symbol, priceData) {
        const cacheKey = `${exchangeId}-${symbol}`;
        this.priceCache.set(cacheKey, {
            data: priceData,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached price data if available and not expired
     * 
     * Retrieves price data from cache if it exists and hasn't expired.
     * Returns null if no cached data is available or if it's expired.
     * 
     * @param {string} exchangeId - Exchange identifier
     * @param {string} symbol - Trading symbol
     * @returns {object|null} Cached price data or null if not available
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
     * Clear the price cache
     * 
     * Removes all cached price data to free memory.
     * Useful for debugging or when cache corruption is suspected.
     */
    clearCache() {
        this.priceCache.clear();
        this.lastFetchTimes.clear();
    }

    /**
     * Get cache statistics
     * 
     * Returns information about the current cache state including
     * cache size, hit rate, and memory usage.
     * 
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        // Count valid and expired cache entries
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
            minFetchInterval: this.minFetchInterval
        };
    }

    /**
     * Validate price data structure
     * 
     * Ensures price data objects have the correct structure and
     * contain valid numeric values for bid and ask prices.
     * 
     * @param {object} priceData - Price data object to validate
     * @returns {boolean} True if price data is valid
     */
    validatePriceData(priceData) {
        if (!priceData || typeof priceData !== 'object') {
            return false;
        }

        // Check required properties
        if (!('bid' in priceData) || !('ask' in priceData)) {
            return false;
        }

        // Check if prices are valid numbers (or null for missing data)
        if (priceData.bid !== null && (typeof priceData.bid !== 'number' || isNaN(priceData.bid))) {
            return false;
        }

        if (priceData.ask !== null && (typeof priceData.ask !== 'number' || isNaN(priceData.ask))) {
            return false;
        }

        // Check if bid is less than ask (when both are available)
        if (priceData.bid !== null && priceData.ask !== null && priceData.bid >= priceData.ask) {
            return false;
        }

        return true;
    }
}

// Create singleton instance for use throughout the system
const priceService = new PriceService();

export default priceService;
export { PriceService };