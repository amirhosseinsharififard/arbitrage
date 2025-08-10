import { retryWrapper } from "../error/errorBoundory.js";
import config from "../config/config.js";
import { ValidationUtils } from "../utils/validation.js";

/**
 * Service for fetching and managing price data from exchanges
 */
export class PriceService {
    constructor() {
        this.priceCache = new Map();
        this.cacheTimeout = config.cache.priceCacheTimeout;
    }

    /**
     * Fetches current bid/ask prices for a symbol from an exchange
     * @param {object} exchange - Exchange instance
     * @param {string} symbol - Trading symbol
     * @returns {Promise<object>} Object containing bid and ask prices
     */
    async getPrice(exchange, symbol) {
        try {
            // First try to get price from ticker
            const ticker = await retryWrapper(
                exchange.fetchTicker.bind(exchange), [symbol],
                config.errorHandling.maxRetries,
                config.errorHandling.defaultRetryDelay
            );

            if (ticker.bid != null && ticker.ask != null) {
                return { bid: ticker.bid, ask: ticker.ask };
            }

            // Fallback to orderbook if ticker doesn't have bid/ask
            const orderbook = await retryWrapper(
                exchange.fetchOrderBook.bind(exchange), [symbol],
                config.errorHandling.maxRetries,
                config.errorHandling.defaultRetryDelay
            );

            const bestAsk = orderbook.asks.length ? orderbook.asks[0][0] : null;
            const bestBid = orderbook.bids.length ? orderbook.bids[0][0] : null;

            return { bid: bestBid, ask: bestAsk };
        } catch (error) {
            console.error(
                `[${exchange.id}] Failed to fetch price for ${symbol} after retries: ${error.message || error}`
            );
            return { bid: null, ask: null };
        }
    }

    /**
     * Fetches prices from multiple exchanges for comparison
     * @param {Map} exchanges - Map of exchange instances
     * @param {object} symbols - Object containing symbols for each exchange
     * @returns {Promise<object>} Object containing prices for each exchange
     */
    async getPricesFromExchanges(exchanges, symbols) {
        const exchangesObj = Object.fromEntries(exchanges);
        const prices = {};

        for (const [exchangeId, symbol] of Object.entries(symbols)) {
            if (exchangesObj[exchangeId]) {
                prices[exchangeId] = await this.getPrice(exchangesObj[exchangeId], symbol);
            }
        }

        return prices;
    }

    /**
     * Handles different types of errors and determines if retry is appropriate
     * @param {Error} error - Error object
     * @param {number} attempt - Current attempt number
     * @param {number} maxRetries - Maximum number of retries
     * @param {string} exchangeId - Exchange identifier
     * @param {string} symbol - Trading symbol
     * @returns {boolean} Whether retry should be attempted
     */
    handlePriceError(error, attempt, maxRetries, exchangeId, symbol) {
        if (!error) {
            console.error(`[${exchangeId}] Unknown error for symbol ${symbol}.`);
            return false;
        }

        const statusCode = error.httpStatusCode || error.statusCode || null;

        if (statusCode) {
            switch (statusCode) {
                case 403:
                    console.error(
                        `[${exchangeId}] Access forbidden (403) for symbol ${symbol}. Check API keys or permissions.`
                    );
                    return false;
                case 429:
                    console.warn(
                        `[${exchangeId}] Rate limit exceeded (429) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
                    );
                    return attempt < maxRetries;
                case 500:
                case 502:
                case 503:
                case 504:
                    console.warn(
                        `[${exchangeId}] Server error (${statusCode}) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
                    );
                    return attempt < maxRetries;
                default:
                    console.error(
                        `[${exchangeId}] HTTP error (${statusCode}) for symbol ${symbol}: ${error.message || error}`
                    );
                    return false;
            }
        }

        if (error.message && error.message.toLowerCase().includes("timeout")) {
            console.warn(
                `[${exchangeId}] Timeout error for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
            );
            return attempt < maxRetries;
        }

        console.error(
            `[${exchangeId}] Unexpected error for symbol ${symbol}: ${error.message || error}`
        );
        return false;
    }

    /**
     * Cache price data with timeout
     * @param {string} key - Cache key
     * @param {object} priceData - Price data to cache
     */
    cachePrice(key, priceData) {
        this.priceCache.set(key, {
            data: priceData,
            timestamp: Date.now()
        });

        // Cleanup old cache entries
        if (this.priceCache.size > config.cache.maxCacheSize) {
            const oldestKey = this.priceCache.keys().next().value;
            this.priceCache.delete(oldestKey);
        }
    }

    /**
     * Get cached price data if not expired
     * @param {string} key - Cache key
     * @returns {object|null} Cached price data or null if expired
     */
    getCachedPrice(key) {
        const cached = this.priceCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Clear price cache
     */
    clearCache() {
        this.priceCache.clear();
    }

    /**
     * Validate price data
     * @param {object} priceData - Price data to validate
     * @returns {boolean} True if valid
     */
    validatePriceData(priceData) {
        if (!priceData || typeof priceData !== 'object') return false;

        const { bid, ask } = priceData;
        return ValidationUtils.validatePrice(bid) && ValidationUtils.validatePrice(ask);
    }
}

// Create singleton instance
const priceService = new PriceService();

export default priceService;