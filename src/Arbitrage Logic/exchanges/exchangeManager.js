/**
 * Exchange Manager - Centralized exchange connection and management
 * 
 * This module handles all exchange-related operations including:
 * 1. Exchange initialization and connection management
 * 2. CCXT exchange instance creation and configuration
 * 3. Retry logic and error handling for exchange operations
 * 4. Exchange instance storage and retrieval
 * 5. Connection status monitoring and validation
 * 
 * Supports multiple exchanges simultaneously with unified interface.
 */

import ccxt from "ccxt";
import config from "../config/config.js";
import { retryWrapper } from "../error/errorBoundary.js";

/**
 * Main Exchange Manager class for handling all exchange operations
 * 
 * Features:
 * - Multi-exchange support (MEXC, LBank, etc.)
 * - Automatic initialization and connection management
 * - Retry logic for failed connections
 * - Exchange instance caching and retrieval
 * - Connection status monitoring
 */
class ExchangeManager {
    /**
     * Initialize the exchange manager
     * 
     * Sets up internal storage for exchange instances and
     * connection status tracking.
     */
    constructor() {
        // Map to store exchange instances by ID
        this.exchanges = new Map();

        // Flag indicating whether exchanges have been initialized
        this.initialized = false;
    }

    /**
     * Initialize all configured exchanges
     * 
     * This method:
     * 1. Creates CCXT exchange instances for each configured exchange
     * 2. Loads markets and establishes connections
     * 3. Applies retry logic for failed connections
     * 4. Stores initialized instances for later use
     * 
     * Must be called before any exchange operations can be performed.
     * 
     * @throws {Error} If exchange initialization fails
     */
    async initialize() {
        try {
            console.log("🔄 Initializing exchanges...");

            // Iterate through all configured exchanges
            for (const [exchangeId, exchangeConfig] of Object.entries(config.exchanges)) {
                // Check if exchange is enabled
                if (exchangeConfig.enabled !== false) {
                    // Create and initialize each exchange
                    const exchange = await this.createExchange(
                        exchangeConfig.id,
                        exchangeConfig.options,
                        exchangeConfig.retryAttempts,
                        exchangeConfig.retryDelay
                    );

                    // Store the initialized exchange instance
                    this.exchanges.set(exchangeId, exchange);
                    console.log(`✅ ${exchangeId.toUpperCase()} initialized successfully`);
                } else {
                    console.log(`⏸️ ${exchangeId.toUpperCase()} disabled - skipping initialization`);
                }
            }

            // Mark exchanges as initialized
            this.initialized = true;
            console.log("🎯 All enabled exchanges initialized successfully!");
        } catch (error) {
            console.error(`❌ Failed to initialize exchanges: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates and initializes an exchange instance with retry logic
     * 
     * This method:
     * 1. Creates a new CCXT exchange instance
     * 2. Loads markets to establish connection
     * 3. Applies retry logic for failed operations
     * 4. Returns the fully initialized exchange instance
     * 
     * @param {string} id - Exchange ID (e.g., 'mexc', 'lbank')
     * @param {object} options - Exchange configuration options (e.g., defaultType: "future")
     * @param {number} retryAttempts - Number of retry attempts for failed operations
     * @param {number} retryDelay - Delay between retries in milliseconds
     * @returns {object} Fully initialized exchange instance
     * @throws {Error} If exchange creation or initialization fails
     */
    async createExchange(id, options, retryAttempts = 3, retryDelay = 1000) {
        // Create new CCXT exchange instance
        const exchange = new ccxt[id](options);

        // Load markets with retry logic
        await retryWrapper(
            exchange.loadMarkets.bind(exchange), [],
            retryAttempts,
            retryDelay
        );

        return exchange;
    }

    /**
     * Get an exchange instance by ID
     * 
     * Retrieves a previously initialized exchange instance.
     * Throws an error if exchanges haven't been initialized
     * or if the requested exchange doesn't exist.
     * 
     * @param {string} exchangeId - Exchange identifier (e.g., 'mexc', 'lbank')
     * @returns {object} Exchange instance for the specified ID
     * @throws {Error} If exchanges not initialized or exchange not found
     */
    getExchange(exchangeId) {
        // Ensure exchanges have been initialized
        if (!this.initialized) {
            throw new Error("Exchanges not initialized. Call initialize() first.");
        }

        // Retrieve exchange instance
        const exchange = this.exchanges.get(exchangeId);
        if (!exchange) {
            throw new Error(`Exchange '${exchangeId}' not found`);
        }

        return exchange;
    }

    /**
     * Get all initialized exchanges
     * 
     * Returns a Map containing all exchange instances.
     * Useful for operations that need to iterate through
     * all exchanges or perform bulk operations.
     * 
     * @returns {Map} Map of all exchange instances with exchangeId as key
     * @throws {Error} If exchanges not initialized
     */
    getAllExchanges() {
        if (!this.initialized) {
            throw new Error("Exchanges not initialized. Call initialize() first.");
        }
        return this.exchanges;
    }

    /**
     * Check if exchanges are initialized
     * 
     * Returns the current initialization status.
     * Useful for checking if exchange operations can be performed.
     * 
     * @returns {boolean} True if exchanges are initialized, false otherwise
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get exchange configuration
     * 
     * Retrieves the configuration object for a specific exchange.
     * Useful for accessing exchange-specific settings and parameters.
     * 
     * @param {string} exchangeId - Exchange identifier
     * @returns {object} Exchange configuration object from config
     */
    getExchangeConfig(exchangeId) {
        return config.exchanges[exchangeId];
    }

    /**
     * Get all exchange IDs
     * 
     * Returns an array of all configured exchange identifiers.
     * Useful for iterating through exchanges or displaying
     * available exchange options.
     * 
     * @returns {string[]} Array of exchange IDs (e.g., ['mexc', 'lbank'])
     */
    getExchangeIds() {
        return Object.keys(config.exchanges);
    }

    /**
     * Get price data from MEXC exchange
     * 
     * Fetches current bid/ask prices for a given symbol from MEXC futures.
     * 
     * @param {string} symbol - Trading symbol (e.g., 'GAIA/USDT:USDT' for futures)
     * @returns {object} Price data with bid, ask, timestamp, etc.
     * @throws {Error} If MEXC exchange not available or fetch fails
     */
    async getMexcPrice(symbol = (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT') {
        try {
            const mexcExchange = this.getExchange('mexc');

            // Ensure we're using the correct futures symbol format
            const resolvedSymbol = symbol || ((config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT');
            const futuresSymbol = resolvedSymbol.includes(':') ? resolvedSymbol : `${resolvedSymbol}:USDT`;

            // Suppress noisy fetching logs for concise output
            const ticker = await mexcExchange.fetchTicker(futuresSymbol);

            return {
                bid: ticker.bid,
                ask: ticker.ask,
                timestamp: ticker.timestamp,
                exchangeId: 'mexc',
                symbol: futuresSymbol
            };
        } catch (error) {
            console.error(`❌ Failed to get MEXC futures price for ${symbol}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get price data from LBank exchange
     * 
     * Fetches current bid/ask prices for a given symbol from LBank spot market.
     * 
     * @param {string} symbol - Trading symbol (e.g., 'DAM/USDT' for spot)
     * @returns {object} Price data with bid, ask, timestamp, etc.
     * @throws {Error} If LBank exchange not available or fetch fails
     */
    async getLbankPrice(symbol = (config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT') {
        try {
            const lbankExchange = this.getExchange('lbank');

            // Use spot symbol format for LBank
            const resolvedSymbol = symbol || ((config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT');

            // Fetch order book data from LBank (more reliable than ticker)
            const orderBook = await lbankExchange.fetchOrderBook(resolvedSymbol);

            // Extract best bid and ask from order book
            const bestBid = orderBook.bids && orderBook.bids[0] ? orderBook.bids[0][0] : null;
            const bestAsk = orderBook.asks && orderBook.asks[0] ? orderBook.asks[0][0] : null;

            return {
                bid: bestBid,
                ask: bestAsk,
                timestamp: Date.now(),
                exchangeId: 'lbank',
                symbol: resolvedSymbol
            };
        } catch (error) {
            console.error(`❌ Failed to get LBank price for ${symbol}: ${error.message}`);
            throw error;
        }
    }
}

// Create singleton instance for use throughout the system
const exchangeManager = new ExchangeManager();

export default exchangeManager;
export { ExchangeManager };