/**
 * Performance Optimization Utilities
 * 
 * This module provides performance optimization features:
 * 1. Memory management and garbage collection
 * 2. Request batching and optimization
 * 3. Cache warming and preloading
 * 4. Performance monitoring and metrics
 * 5. Resource usage optimization
 */

import config from "../config/config.js";

/**
 * Performance Optimizer class for system-wide optimizations
 */
class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            memoryUsage: [],
            responseTimes: [],
            cacheHitRate: 0,
            requestsPerSecond: 0
        };

        this.isOptimizing = false;
        this.optimizationInterval = null;
    }

    /**
     * Start performance optimization
     */
    startOptimization() {
        if (this.isOptimizing) return;

        this.isOptimizing = true;
        console.log("🚀 Starting performance optimization...");

        // Start memory monitoring
        this.startMemoryMonitoring();

        // Start performance metrics collection
        this.startMetricsCollection();

        // Enable garbage collection optimization
        this.optimizeGarbageCollection();
    }

    /**
     * Stop performance optimization
     */
    stopOptimization() {
        if (!this.isOptimizing) return;

        this.isOptimizing = false;
        console.log("⏹️ Stopping performance optimization...");

        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
            this.optimizationInterval = null;
        }
    }

    /**
     * Start memory usage monitoring
     */
    startMemoryMonitoring() {
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            });

            // Keep only last 100 measurements
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }

            // Trigger garbage collection if memory usage is high
            if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
                this.forceGarbageCollection();
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Start performance metrics collection
     */
    startMetricsCollection() {
        this.optimizationInterval = setInterval(() => {
            this.updatePerformanceMetrics();
        }, 10000); // Update every 10 seconds
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const memUsage = process.memoryUsage();
        const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        console.log(`📊 Performance Metrics:`);
        console.log(`   - Memory Usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB (${heapUsagePercent.toFixed(1)}%)`);
        console.log(`   - Cache Hit Rate: ${this.metrics.cacheHitRate.toFixed(1)}%`);
        console.log(`   - Requests/sec: ${this.metrics.requestsPerSecond.toFixed(1)}`);
    }

    /**
     * Optimize garbage collection
     */
    optimizeGarbageCollection() {
        // Set garbage collection flags for better performance
        if (global.gc) {
            // Force garbage collection every 30 seconds if available
            setInterval(() => {
                global.gc();
            }, 30000);
        }
    }

    /**
     * Force garbage collection
     */
    forceGarbageCollection() {
        if (global.gc) {
            global.gc();
            console.log("🧹 Forced garbage collection");
        }
    }

    /**
     * Batch multiple requests for better performance
     */
    async batchRequests(requests) {
        const batchSize = config.performance.maxConcurrentRequests;
        const results = [];

        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch);
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Warm up cache with frequently accessed data
     */
    async warmCache(cacheFunction, keys) {
        console.log("🔥 Warming up cache...");

        const warmPromises = keys.map(key => cacheFunction(key).catch(err => {
            console.warn(`Cache warm failed for key ${key}: ${err.message}`);
            return null;
        }));

        await Promise.allSettled(warmPromises);
        console.log("✅ Cache warming completed");
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            currentMemoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Optimize for high-frequency trading
     */
    optimizeForHFT() {
        console.log("⚡ Optimizing for high-frequency trading...");

        // Reduce interval for faster response
        if (config.intervalMs > 50) {
            console.log("⚠️ Consider reducing intervalMs to 50ms or less for HFT");
        }

        // Enable all performance features
        config.performance.enableBatchProcessing = true;
        config.performance.enableCompression = true;
        config.performance.enableConnectionPooling = true;

        console.log("✅ HFT optimization applied");
    }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;