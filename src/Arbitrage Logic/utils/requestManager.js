/**
 * Request Manager for handling concurrent requests and rate limiting
 * Manages API calls to prevent conflicts and ensure data freshness
 */

import pLimit from 'p-limit';
import { EventEmitter } from 'events';
import chalk from 'chalk';

class RequestManager extends EventEmitter {
    constructor() {
        super();
        
        // Request limits per exchange
        this.requestLimits = {
            mexc: pLimit(3),      // 3 concurrent requests
            lbank: pLimit(2),     // 2 concurrent requests (rate limited)
            kcex: pLimit(1),      // 1 concurrent request (puppeteer)
            ourbit: pLimit(1),    // 1 concurrent request (puppeteer)
            xt: pLimit(1),        // 1 concurrent request (puppeteer)
            dexscreener: pLimit(2) // 2 concurrent requests
        };
        
        // Request tracking
        this.activeRequests = new Map();
        this.requestHistory = new Map();
        this.lastUpdateTime = new Map();
        
        // Rate limiting settings
        this.rateLimits = {
            mexc: { requests: 0, window: 60000, maxRequests: 100 },      // 100 requests per minute
            lbank: { requests: 0, window: 60000, maxRequests: 30 },      // 30 requests per minute
            kcex: { requests: 0, window: 60000, maxRequests: 20 },       // 20 requests per minute
            ourbit: { requests: 0, window: 60000, maxRequests: 20 },     // 20 requests per minute
            xt: { requests: 0, window: 60000, maxRequests: 20 },         // 20 requests per minute
            dexscreener: { requests: 0, window: 60000, maxRequests: 50 } // 50 requests per minute
        };
        
        // Start rate limit reset timer
        this.startRateLimitReset();
        
        console.log('🚀 Request Manager initialized');
    }
    
    /**
     * Start rate limit reset timer
     */
    startRateLimitReset() {
        setInterval(() => {
            Object.keys(this.rateLimits).forEach(exchange => {
                this.rateLimits[exchange].requests = 0;
            });
        }, 60000); // Reset every minute
    }
    
    /**
     * Check if request is allowed based on rate limits
     */
    isRequestAllowed(exchangeId) {
        const limit = this.rateLimits[exchangeId];
        if (!limit) return true;
        
        return limit.requests < limit.maxRequests;
    }
    
    /**
     * Increment request count for rate limiting
     */
    incrementRequestCount(exchangeId) {
        const limit = this.rateLimits[exchangeId];
        if (limit) {
            limit.requests++;
        }
    }
    
    /**
     * Execute request with proper management
     */
    async executeRequest(exchangeId, requestFunction, requestId = null) {
        const requestKey = requestId || `${exchangeId}_${Date.now()}`;
        
        // Check if request is already active
        if (this.activeRequests.has(requestKey)) {
            console.log(`⚠️ Request ${requestKey} already in progress, skipping`);
            return null;
        }
        
        // Check rate limits
        if (!this.isRequestAllowed(exchangeId)) {
            console.log(`⚠️ Rate limit exceeded for ${exchangeId}, skipping request`);
            return null;
        }
        
        // Get request limit for this exchange
        const limit = this.requestLimits[exchangeId] || pLimit(1);
        
        try {
            // Mark request as active
            this.activeRequests.set(requestKey, {
                exchangeId,
                startTime: Date.now(),
                status: 'active'
            });
            
            // Increment request count
            this.incrementRequestCount(exchangeId);
            
            // Execute request with limit
            const result = await limit(async () => {
                console.log(`🔄 Executing request: ${requestKey} (${exchangeId})`);
                
                const startTime = Date.now();
                const result = await requestFunction();
                const duration = Date.now() - startTime;
                
                // Track request history
                this.requestHistory.set(requestKey, {
                    exchangeId,
                    duration,
                    timestamp: Date.now(),
                    success: true
                });
                
                // Update last update time
                this.lastUpdateTime.set(exchangeId, Date.now());
                
                console.log(`✅ Request completed: ${requestKey} (${duration}ms)`);
                
                // Emit success event
                this.emit('request-success', {
                    exchangeId,
                    requestKey,
                    duration,
                    result
                });
                
                return result;
            });
            
            return result;
            
        } catch (error) {
            console.error(`❌ Request failed: ${requestKey} - ${error.message}`);
            
            // Track failed request
            this.requestHistory.set(requestKey, {
                exchangeId,
                duration: Date.now() - this.activeRequests.get(requestKey)?.startTime || 0,
                timestamp: Date.now(),
                success: false,
                error: error.message
            });
            
            // Emit error event
            this.emit('request-error', {
                exchangeId,
                requestKey,
                error: error.message
            });
            
            return null;
            
        } finally {
            // Remove from active requests
            this.activeRequests.delete(requestKey);
        }
    }
    
    /**
     * Execute multiple requests concurrently
     */
    async executeConcurrentRequests(requests) {
        const results = {};
        
        const requestPromises = requests.map(async ({ exchangeId, requestFunction, requestId }) => {
            const result = await this.executeRequest(exchangeId, requestFunction, requestId);
            return { exchangeId, result };
        });
        
        const completedRequests = await Promise.allSettled(requestPromises);
        
        completedRequests.forEach((promise, index) => {
            if (promise.status === 'fulfilled') {
                const { exchangeId, result } = promise.value;
                results[exchangeId] = result;
            } else {
                console.error(`❌ Request failed: ${requests[index].exchangeId} - ${promise.reason}`);
            }
        });
        
        return results;
    }
    
    /**
     * Get request statistics
     */
    getRequestStats() {
        const stats = {
            activeRequests: this.activeRequests.size,
            totalHistory: this.requestHistory.size,
            rateLimits: {},
            lastUpdates: {}
        };
        
        // Rate limit stats
        Object.keys(this.rateLimits).forEach(exchangeId => {
            const limit = this.rateLimits[exchangeId];
            stats.rateLimits[exchangeId] = {
                current: limit.requests,
                max: limit.maxRequests,
                remaining: limit.maxRequests - limit.requests
            };
        });
        
        // Last update times
        this.lastUpdateTime.forEach((timestamp, exchangeId) => {
            stats.lastUpdates[exchangeId] = {
                timestamp,
                age: Date.now() - timestamp
            };
        });
        
        return stats;
    }
    
    /**
     * Get recent request history
     */
    getRecentHistory(limit = 20) {
        const history = Array.from(this.requestHistory.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, limit)
            .map(([key, data]) => ({
                key,
                ...data
            }));
        
        return history;
    }
    
    /**
     * Clear old request history
     */
    clearOldHistory(maxAge = 3600000) { // 1 hour
        const cutoff = Date.now() - maxAge;
        
        for (const [key, data] of this.requestHistory.entries()) {
            if (data.timestamp < cutoff) {
                this.requestHistory.delete(key);
            }
        }
    }
    
    /**
     * Display request manager status
     */
    displayStatus() {
        const stats = this.getRequestStats();
        
        console.log(`\n${chalk.blue('📊 REQUEST MANAGER STATUS')}`);
        console.log('='.repeat(50));
        console.log(`Active Requests: ${stats.activeRequests}`);
        console.log(`Total History: ${stats.totalHistory}`);
        
        console.log('\nRate Limits:');
        Object.entries(stats.rateLimits).forEach(([exchange, limit]) => {
            const color = limit.remaining > 0 ? chalk.green : chalk.red;
            console.log(`  ${exchange}: ${color(`${limit.current}/${limit.max}`)}`);
        });
        
        console.log('\nLast Updates:');
        Object.entries(stats.lastUpdates).forEach(([exchange, update]) => {
            const age = Math.round(update.age / 1000);
            const color = age < 60 ? chalk.green : age < 300 ? chalk.yellow : chalk.red;
            console.log(`  ${exchange}: ${color(`${age}s ago`)}`);
        });
    }
}

// Create singleton instance
const requestManager = new RequestManager();

export default requestManager;
