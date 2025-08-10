import ccxt from "ccxt";
import config from "../config/config.js";
import { retryWrapper } from "../error/errorBoundory.js";

/**
 * Exchange Manager - Handles all exchange operations
 */
class ExchangeManager {
    constructor() {
        this.exchanges = new Map();
        this.initialized = false;
    }

    /**
     * Initialize all configured exchanges
     */
    async initialize() {
        try {
            console.log("🔄 Initializing exchanges...");
            
            for (const [exchangeId, exchangeConfig] of Object.entries(config.exchanges)) {
                const exchange = await this.createExchange(
                    exchangeConfig.id, 
                    exchangeConfig.options,
                    exchangeConfig.retryAttempts,
                    exchangeConfig.retryDelay
                );
                this.exchanges.set(exchangeId, exchange);
                console.log(`✅ ${exchangeId.toUpperCase()} initialized successfully`);
            }
            
            this.initialized = true;
            console.log("🎯 All exchanges initialized successfully!");
        } catch (error) {
            console.error(`❌ Failed to initialize exchanges: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates and initializes an exchange instance with retry logic
     * @param {string} id - Exchange ID (e.g., 'mexc', 'lbank')
     * @param {object} options - Exchange configuration options
     * @param {number} retryAttempts - Number of retry attempts
     * @param {number} retryDelay - Delay between retries in milliseconds
     * @returns {object} Initialized exchange instance
     */
    async createExchange(id, options, retryAttempts = 3, retryDelay = 1000) {
        const exchange = new ccxt[id](options);
        await retryWrapper(
            exchange.loadMarkets.bind(exchange), 
            [], 
            retryAttempts, 
            retryDelay
        );
        return exchange;
    }

    /**
     * Get an exchange instance by ID
     * @param {string} exchangeId - Exchange identifier
     * @returns {object} Exchange instance
     */
    getExchange(exchangeId) {
        if (!this.initialized) {
            throw new Error("Exchanges not initialized. Call initialize() first.");
        }
        
        const exchange = this.exchanges.get(exchangeId);
        if (!exchange) {
            throw new Error(`Exchange '${exchangeId}' not found`);
        }
        
        return exchange;
    }

    /**
     * Get all initialized exchanges
     * @returns {Map} Map of all exchanges
     */
    getAllExchanges() {
        if (!this.initialized) {
            throw new Error("Exchanges not initialized. Call initialize() first.");
        }
        return this.exchanges;
    }

    /**
     * Check if exchanges are initialized
     * @returns {boolean} Initialization status
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get exchange configuration
     * @param {string} exchangeId - Exchange identifier
     * @returns {object} Exchange configuration
     */
    getExchangeConfig(exchangeId) {
        return config.exchanges[exchangeId];
    }

    /**
     * Get all exchange IDs
     * @returns {string[]} Array of exchange IDs
     */
    getExchangeIds() {
        return Object.keys(config.exchanges);
    }
}

// Create singleton instance
const exchangeManager = new ExchangeManager();

export default exchangeManager;
export { ExchangeManager };
