/**
 * Centralized Data Manager
 * Manages all data storage and retrieval throughout the project
 * 
 * This module provides:
 * 1. Centralized data storage for all currencies and exchanges
 * 2. Cached data for performance optimization
 * 3. Data validation and sanitization
 * 4. Real-time data updates
 * 5. Data persistence and retrieval
 */

class DataManager {
    constructor() {
        // Central data storage
        this.data = {
            currencies: {},
            exchanges: {},
            opportunities: {},
            statistics: {},
            configuration: {},
            cache: new Map()
        };

        // Data update listeners
        this.listeners = new Map();

        // Data validation rules
        this.validationRules = {
            price: (value) => typeof value === 'number' && value > 0,
            percentage: (value) => typeof value === 'number' && value >= -100 && value <= 1000,
            timestamp: (value) => typeof value === 'number' && value > 0,
            string: (value) => typeof value === 'string' && value.length > 0
        };

        // Performance tracking
        this.stats = {
            totalUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastUpdate: null
        };
    }

    /**
     * Store currency data
     * @param {string} currencyCode - Currency code
     * @param {object} data - Currency data
     */
    storeCurrencyData(currencyCode, data) {
        if (!this.validationRules.string(currencyCode)) {
            throw new Error('Invalid currency code');
        }

        this.data.currencies[currencyCode] = {
            ...data,
            lastUpdate: Date.now(),
            version: (this.data.currencies[currencyCode]?.version || 0) + 1
        };

        this.notifyListeners('currency', currencyCode, this.data.currencies[currencyCode]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Get currency data
     * @param {string} currencyCode - Currency code
     * @returns {object} Currency data
     */
    getCurrencyData(currencyCode) {
        return this.data.currencies[currencyCode] || null;
    }

    /**
     * Store exchange data
     * @param {string} exchangeId - Exchange ID
     * @param {object} data - Exchange data
     */
    storeExchangeData(exchangeId, data) {
        if (!this.validationRules.string(exchangeId)) {
            throw new Error('Invalid exchange ID');
        }

        this.data.exchanges[exchangeId] = {
            ...data,
            lastUpdate: Date.now(),
            version: (this.data.exchanges[exchangeId]?.version || 0) + 1
        };

        this.notifyListeners('exchange', exchangeId, this.data.exchanges[exchangeId]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Get exchange data
     * @param {string} exchangeId - Exchange ID
     * @returns {object} Exchange data
     */
    getExchangeData(exchangeId) {
        return this.data.exchanges[exchangeId] || null;
    }

    /**
     * Store arbitrage opportunities
     * @param {string} currencyCode - Currency code
     * @param {Array} opportunities - Arbitrage opportunities
     */
    storeOpportunities(currencyCode, opportunities) {
        if (!this.validationRules.string(currencyCode)) {
            throw new Error('Invalid currency code');
        }

        this.data.opportunities[currencyCode] = {
            opportunities: opportunities || [],
            lastUpdate: Date.now(),
            count: opportunities ? opportunities.length : 0
        };

        this.notifyListeners('opportunities', currencyCode, this.data.opportunities[currencyCode]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Store all arbitrage calculations (including non-profitable ones)
     * @param {string} currencyCode - Currency code
     * @param {Array} calculations - All arbitrage calculations
     */
    storeArbitrageCalculations(currencyCode, calculations) {
        if (!this.validationRules.string(currencyCode)) {
            throw new Error('Invalid currency code');
        }

        this.data.opportunities[currencyCode] = {
            ...this.data.opportunities[currencyCode],
            allCalculations: calculations || [],
            profitableOpportunities: calculations ? calculations.filter(calc => calc.isProfitable) : [],
            lastUpdate: Date.now(),
            count: calculations ? calculations.filter(calc => calc.isProfitable).length : 0,
            totalCalculations: calculations ? calculations.length : 0
        };

        this.notifyListeners('arbitrageCalculations', currencyCode, this.data.opportunities[currencyCode]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Get arbitrage opportunities
     * @param {string} currencyCode - Currency code
     * @returns {Array} Arbitrage opportunities
     */
    getOpportunities(currencyCode) {
        return this.data.opportunities[currencyCode]?.profitableOpportunities || [];
    }

    /**
     * Store statistics
     * @param {string} key - Statistics key
     * @param {object} stats - Statistics data
     */
    storeStatistics(key, stats) {
        if (!this.validationRules.string(key)) {
            throw new Error('Invalid statistics key');
        }

        this.data.statistics[key] = {
            ...stats,
            lastUpdate: Date.now()
        };

        this.notifyListeners('statistics', key, this.data.statistics[key]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Get statistics
     * @param {string} key - Statistics key
     * @returns {object} Statistics data
     */
    getStatistics(key) {
        return this.data.statistics[key] || null;
    }

    /**
     * Store configuration
     * @param {string} key - Configuration key
     * @param {object} config - Configuration data
     */
    storeConfiguration(key, config) {
        if (!this.validationRules.string(key)) {
            throw new Error('Invalid configuration key');
        }

        this.data.configuration[key] = {
            ...config,
            lastUpdate: Date.now()
        };

        this.notifyListeners('configuration', key, this.data.configuration[key]);
        this.stats.totalUpdates++;
        this.stats.lastUpdate = Date.now();
    }

    /**
     * Get configuration
     * @param {string} key - Configuration key
     * @returns {object} Configuration data
     */
    getConfiguration(key) {
        return this.data.configuration[key] || null;
    }

    /**
     * Cache data with key
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    cacheData(key, data, ttl = 60000) {
        this.data.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any} Cached data or null
     */
    getCachedData(key) {
        const cached = this.data.cache.get(key);
        if (!cached) {
            this.stats.cacheMisses++;
            return null;
        }

        if (Date.now() - cached.timestamp > cached.ttl) {
            this.data.cache.delete(key);
            this.stats.cacheMisses++;
            return null;
        }

        this.stats.cacheHits++;
        return cached.data;
    }

    /**
     * Get all currency data
     * @returns {object} All currency data
     */
    getAllCurrencyData() {
        return this.data.currencies;
    }

    /**
     * Get all exchange data
     * @returns {object} All exchange data
     */
    getAllExchangeData() {
        return this.data.exchanges;
    }

    /**
     * Get all opportunities
     * @returns {object} All opportunities
     */
    getAllOpportunities() {
        return this.data.opportunities;
    }

    /**
     * Get all statistics
     * @returns {object} All statistics
     */
    getAllStatistics() {
        return this.data.statistics;
    }

    /**
     * Get all configuration
     * @returns {object} All configuration
     */
    getAllConfiguration() {
        return this.data.configuration;
    }

    /**
     * Get all data
     * @returns {object} All data
     */
    getAllData() {
        return {
            currencies: this.data.currencies,
            exchanges: this.data.exchanges,
            opportunities: this.data.opportunities,
            statistics: this.data.statistics,
            configuration: this.data.configuration,
            lastUpdate: this.stats.lastUpdate
        };
    }

    /**
     * Add data update listener
     * @param {string} type - Data type
     * @param {string} key - Data key
     * @param {function} callback - Callback function
     */
    addListener(type, key, callback) {
        const listenerKey = `${type}:${key}`;
        if (!this.listeners.has(listenerKey)) {
            this.listeners.set(listenerKey, []);
        }
        this.listeners.get(listenerKey).push(callback);
    }

    /**
     * Remove data update listener
     * @param {string} type - Data type
     * @param {string} key - Data key
     * @param {function} callback - Callback function
     */
    removeListener(type, key, callback) {
        const listenerKey = `${type}:${key}`;
        const listeners = this.listeners.get(listenerKey);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify listeners of data updates
     * @param {string} type - Data type
     * @param {string} key - Data key
     * @param {any} data - Updated data
     */
    notifyListeners(type, key, data) {
        const listenerKey = `${type}:${key}`;
        const listeners = this.listeners.get(listenerKey);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in data listener: ${error.message}`);
                }
            });
        }
    }

    /**
     * Clear all data
     */
    clearAllData() {
        this.data = {
            currencies: {},
            exchanges: {},
            opportunities: {},
            statistics: {},
            configuration: {},
            cache: new Map()
        };
        this.stats = {
            totalUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastUpdate: null
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.data.cache.clear();
    }

    /**
     * Get data manager statistics
     * @returns {object} Statistics
     */
    getManagerStatistics() {
        return {
            ...this.stats,
            currencyCount: Object.keys(this.data.currencies).length,
            exchangeCount: Object.keys(this.data.exchanges).length,
            opportunityCount: Object.keys(this.data.opportunities).length,
            cacheSize: this.data.cache.size,
            listenerCount: this.listeners.size
        };
    }

    /**
     * Validate data
     * @param {string} type - Data type
     * @param {any} data - Data to validate
     * @returns {boolean} Validation result
     */
    validateData(type, data) {
        const validator = this.validationRules[type];
        if (!validator) {
            return true; // No validation rule for this type
        }
        return validator(data);
    }

    /**
     * Export data to JSON
     * @returns {string} JSON string
     */
    exportData() {
        return JSON.stringify({
            data: this.data,
            stats: this.stats,
            timestamp: Date.now()
        }, null, 2);
    }

    /**
     * Import data from JSON
     * @param {string} jsonData - JSON data string
     */
    importData(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (imported.data) {
                this.data = imported.data;
            }
            if (imported.stats) {
                this.stats = imported.stats;
            }
        } catch (error) {
            throw new Error(`Failed to import data: ${error.message}`);
        }
    }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;