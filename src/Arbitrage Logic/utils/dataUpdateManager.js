/**
 * Data Update Manager for handling real-time data updates and caching
 * Manages data freshness and prevents unnecessary updates
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import requestManager from './requestManager.js';

class DataUpdateManager extends EventEmitter {
    constructor() {
        super();
        
        // Data cache
        this.dataCache = new Map();
        this.updateTimestamps = new Map();
        this.updateIntervals = new Map();
        
        // Update settings
        this.updateSettings = {
            mexc: { interval: 2000, maxAge: 5000 },      // Update every 2s, max age 5s
            lbank: { interval: 3000, maxAge: 8000 },     // Update every 3s, max age 8s
            kcex: { interval: 5000, maxAge: 10000 },     // Update every 5s, max age 10s
            ourbit: { interval: 5000, maxAge: 10000 },   // Update every 5s, max age 10s
            xt: { interval: 5000, maxAge: 10000 },       // Update every 5s, max age 10s
            dexscreener: { interval: 3000, maxAge: 8000 } // Update every 3s, max age 8s
        };
        
        // Update queues
        this.updateQueue = new Map();
        this.processingQueue = new Set();
        
        // Statistics
        this.stats = {
            totalUpdates: 0,
            successfulUpdates: 0,
            failedUpdates: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Listen to request manager events
        requestManager.on('request-success', this.handleRequestSuccess.bind(this));
        requestManager.on('request-error', this.handleRequestError.bind(this));
        
        console.log('🚀 Data Update Manager initialized');
    }
    
    /**
     * Handle successful request
     */
    handleRequestSuccess(data) {
        this.stats.successfulUpdates++;
        this.emit('data-updated', data);
    }
    
    /**
     * Handle failed request
     */
    handleRequestError(data) {
        this.stats.failedUpdates++;
        this.emit('data-update-failed', data);
    }
    
    /**
     * Check if data needs update
     */
    needsUpdate(exchangeId, currencyCode) {
        const cacheKey = `${exchangeId}_${currencyCode}`;
        const lastUpdate = this.updateTimestamps.get(cacheKey);
        const settings = this.updateSettings[exchangeId];
        
        if (!lastUpdate || !settings) {
            return true;
        }
        
        const age = Date.now() - lastUpdate;
        return age > settings.maxAge;
    }
    
    /**
     * Get cached data
     */
    getCachedData(exchangeId, currencyCode) {
        const cacheKey = `${exchangeId}_${currencyCode}`;
        const data = this.dataCache.get(cacheKey);
        
        if (data) {
            this.stats.cacheHits++;
            return data;
        }
        
        this.stats.cacheMisses++;
        return null;
    }
    
    /**
     * Cache data
     */
    cacheData(exchangeId, currencyCode, data) {
        const cacheKey = `${exchangeId}_${currencyCode}`;
        this.dataCache.set(cacheKey, {
            ...data,
            cachedAt: Date.now()
        });
        this.updateTimestamps.set(cacheKey, Date.now());
    }
    
    /**
     * Queue data update
     */
    queueUpdate(exchangeId, currencyCode, updateFunction) {
        const queueKey = `${exchangeId}_${currencyCode}`;
        
        // Check if already in queue
        if (this.updateQueue.has(queueKey)) {
            return;
        }
        
        // Check if already processing
        if (this.processingQueue.has(queueKey)) {
            return;
        }
        
        // Add to queue
        this.updateQueue.set(queueKey, {
            exchangeId,
            currencyCode,
            updateFunction,
            queuedAt: Date.now()
        });
        
        // Process queue
        this.processQueue();
    }
    
    /**
     * Process update queue
     */
    async processQueue() {
        if (this.processingQueue.size >= 5) {
            return; // Limit concurrent processing
        }
        
        for (const [queueKey, update] of this.updateQueue) {
            if (this.processingQueue.has(queueKey)) {
                continue;
            }
            
            // Check if still needs update
            if (!this.needsUpdate(update.exchangeId, update.currencyCode)) {
                this.updateQueue.delete(queueKey);
                continue;
            }
            
            // Process update
            this.processingQueue.add(queueKey);
            this.updateQueue.delete(queueKey);
            
            try {
                const result = await requestManager.executeRequest(
                    update.exchangeId,
                    update.updateFunction,
                    queueKey
                );
                
                if (result) {
                    this.cacheData(update.exchangeId, update.currencyCode, result);
                    this.stats.totalUpdates++;
                }
                
            } catch (error) {
                console.error(`❌ Update failed for ${queueKey}: ${error.message}`);
            } finally {
                this.processingQueue.delete(queueKey);
            }
        }
    }
    
    /**
     * Get data with automatic update
     */
    async getData(exchangeId, currencyCode, updateFunction) {
        // Check cache first
        const cachedData = this.getCachedData(exchangeId, currencyCode);
        
        if (cachedData && !this.needsUpdate(exchangeId, currencyCode)) {
            return cachedData;
        }
        
        // Queue update if needed
        if (this.needsUpdate(exchangeId, currencyCode)) {
            this.queueUpdate(exchangeId, currencyCode, updateFunction);
        }
        
        // Return cached data or null
        return cachedData || null;
    }
    
    /**
     * Force update data
     */
    async forceUpdate(exchangeId, currencyCode, updateFunction) {
        const queueKey = `${exchangeId}_${currencyCode}`;
        
        try {
            const result = await requestManager.executeRequest(
                exchangeId,
                updateFunction,
                queueKey
            );
            
            if (result) {
                this.cacheData(exchangeId, currencyCode, result);
                this.stats.totalUpdates++;
                return result;
            }
            
        } catch (error) {
            console.error(`❌ Force update failed for ${queueKey}: ${error.message}`);
        }
        
        return null;
    }
    
    /**
     * Get all cached data for a currency
     */
    getCurrencyData(currencyCode) {
        const data = {};
        
        for (const [cacheKey, cachedData] of this.dataCache.entries()) {
            if (cacheKey.endsWith(`_${currencyCode}`)) {
                const exchangeId = cacheKey.split('_')[0];
                data[exchangeId] = cachedData;
            }
        }
        
        return data;
    }
    
    /**
     * Clear old cache entries
     */
    clearOldCache(maxAge = 300000) { // 5 minutes
        const cutoff = Date.now() - maxAge;
        
        for (const [cacheKey, data] of this.dataCache.entries()) {
            if (data.cachedAt < cutoff) {
                this.dataCache.delete(cacheKey);
                this.updateTimestamps.delete(cacheKey);
            }
        }
    }
    
    /**
     * Get update statistics
     */
    getUpdateStats() {
        return {
            ...this.stats,
            queueSize: this.updateQueue.size,
            processingSize: this.processingQueue.size,
            cacheSize: this.dataCache.size,
            updateTimestamps: Object.fromEntries(this.updateTimestamps)
        };
    }
    
    /**
     * Display update manager status
     */
    displayStatus() {
        const stats = this.getUpdateStats();
        
        console.log(`\n${chalk.cyan('📊 DATA UPDATE MANAGER STATUS')}`);
        console.log('='.repeat(50));
        console.log(`Total Updates: ${stats.totalUpdates}`);
        console.log(`Successful: ${stats.successfulUpdates}`);
        console.log(`Failed: ${stats.failedUpdates}`);
        console.log(`Cache Hits: ${stats.cacheHits}`);
        console.log(`Cache Misses: ${stats.cacheMisses}`);
        console.log(`Queue Size: ${stats.queueSize}`);
        console.log(`Processing: ${stats.processingSize}`);
        console.log(`Cache Size: ${stats.cacheSize}`);
        
        // Display recent updates
        const recentUpdates = Object.entries(stats.updateTimestamps)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (recentUpdates.length > 0) {
            console.log('\nRecent Updates:');
            recentUpdates.forEach(([key, timestamp]) => {
                const age = Math.round((Date.now() - timestamp) / 1000);
                const color = age < 60 ? chalk.green : age < 300 ? chalk.yellow : chalk.red;
                console.log(`  ${key}: ${color(`${age}s ago`)}`);
            });
        }
    }
    
    /**
     * Start automatic cache cleanup
     */
    startCacheCleanup() {
        setInterval(() => {
            this.clearOldCache();
        }, 60000); // Clean up every minute
    }
}

// Create singleton instance
const dataUpdateManager = new DataUpdateManager();

export default dataUpdateManager;
