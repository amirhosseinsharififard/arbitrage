/**
 * Performance Optimization Module
 * 
 * This module provides performance optimizations for repetitive operations:
 * 1. Batch processing for multiple calculations
 * 2. Memory pooling for object reuse
 * 3. Pre-computed lookup tables
 * 4. Optimized data structures
 * 5. Performance monitoring and metrics
 */

import calculationCache from "./calculationCache.js";

// Memory pool for frequently created objects
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.activeCount = 0;

        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    acquire() {
        this.activeCount++;
        return this.pool.pop() || this.createFn();
    }

    release(obj) {
        if (obj) {
            this.resetFn(obj);
            this.pool.push(obj);
            this.activeCount--;
        }
    }

    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeCount,
            totalCreated: this.pool.length + this.activeCount
        };
    }
}

// Pre-computed lookup tables for common calculations
class LookupTables {
    constructor() {
        this.percentageMultipliers = new Map();
        this.percentageDivisors = new Map();
        this.priceRanges = new Map();

        this.initializeTables();
    }

    initializeTables() {
        // Pre-compute percentage multipliers (0.1% to 100%)
        for (let i = 1; i <= 1000; i++) {
            const percent = i / 10;
            this.percentageMultipliers.set(percent, percent / 100);
            this.percentageDivisors.set(percent, 100 / percent);
        }

        // Pre-compute common price ranges
        const basePrice = 0.0024;
        for (let i = 0; i < 100; i++) {
            const price = basePrice + (i * 0.0001);
            this.priceRanges.set(price.toFixed(6), price);
        }
    }

    getPercentageMultiplier(percent) {
        return this.percentageMultipliers.get(percent) || (percent / 100);
    }

    getPercentageDivisor(percent) {
        return this.percentageDivisors.get(percent) || (100 / percent);
    }

    getPriceRange(price) {
        const key = price.toFixed(6);
        return this.priceRanges.get(key) || price;
    }
}

// Batch processor for multiple calculations
class BatchProcessor {
    constructor() {
        this.lookupTables = new LookupTables();
        this.priceObjectPool = new ObjectPool(
            () => ({ bid: 0, ask: 0, timestamp: 0 }),
            (obj) => {
                obj.bid = 0;
                obj.ask = 0;
                obj.timestamp = 0;
            }
        );
    }

    // Batch price difference calculations
    calculatePriceDifferencesBatch(pricePairs) {
        const results = new Array(pricePairs.length);

        for (let i = 0; i < pricePairs.length; i++) {
            const [buyPrice, sellPrice] = pricePairs[i];
            results[i] = calculationCache.calculatePriceDifference(buyPrice, sellPrice);
        }

        return results;
    }

    // Batch fee calculations
    calculateFeesBatch(amounts, feePercentages) {
        const results = new Array(amounts.length);

        for (let i = 0; i < amounts.length; i++) {
            results[i] = calculationCache.calculateFee(amounts[i], feePercentages[i]);
        }

        return results;
    }

    // Batch volume calculations
    calculateVolumesBatch(investments, prices) {
        const results = new Array(investments.length);

        for (let i = 0; i < investments.length; i++) {
            results[i] = calculationCache.calculateVolume(investments[i], prices[i]);
        }

        return results;
    }

    // Optimized order book processing
    processOrderBookBatch(orderBooks) {
        const results = [];

        for (const orderBook of orderBooks) {
            const bestBid = orderBook.bids && orderBook.bids[0] ? orderBook.bids[0] : null;
            const bestAsk = orderBook.asks && orderBook.asks[0] ? orderBook.asks[0] : null;

            results.push({
                bestBid: bestBid ? { price: bestBid[0], amount: bestBid[1] } : null,
                bestAsk: bestAsk ? { price: bestAsk[0], amount: bestAsk[1] } : null,
                spread: bestBid && bestAsk ? bestAsk[0] - bestBid[0] : null,
                spreadPercent: bestBid && bestAsk ?
                    ((bestAsk[0] - bestBid[0]) / bestBid[0]) * 100 : null
            });
        }

        return results;
    }

    // Memory-efficient price object creation
    createPriceObject(bid, ask, timestamp = Date.now()) {
        const priceObj = this.priceObjectPool.acquire();
        priceObj.bid = bid;
        priceObj.ask = ask;
        priceObj.timestamp = timestamp;
        return priceObj;
    }

    // Release price object back to pool
    releasePriceObject(priceObj) {
        this.priceObjectPool.release(priceObj);
    }

    // Get performance statistics
    getStats() {
        return {
            lookupTables: {
                percentageMultipliers: this.lookupTables.percentageMultipliers.size,
                percentageDivisors: this.lookupTables.percentageDivisors.size,
                priceRanges: this.lookupTables.priceRanges.size
            },
            objectPool: this.priceObjectPool.getStats(),
            calculationCache: calculationCache.getStats()
        };
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            operationCounts: new Map(),
            operationTimes: new Map(),
            memoryUsage: [],
            cacheStats: []
        };

        this.startTime = Date.now();
        this.monitoringInterval = null;
    }

    startMonitoring(intervalMs = 30000) {
        this.monitoringInterval = setInterval(() => {
            this.recordMetrics();
        }, intervalMs);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    recordOperation(operationName, duration) {
        if (!this.metrics.operationCounts.has(operationName)) {
            this.metrics.operationCounts.set(operationName, 0);
            this.metrics.operationTimes.set(operationName, []);
        }

        this.metrics.operationCounts.set(
            operationName,
            this.metrics.operationCounts.get(operationName) + 1
        );

        this.metrics.operationTimes.get(operationName).push(duration);

        // Keep only last 1000 measurements
        if (this.metrics.operationTimes.get(operationName).length > 1000) {
            this.metrics.operationTimes.get(operationName).shift();
        }
    }

    recordMetrics() {
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

        // Record cache stats
        this.metrics.cacheStats.push({
            timestamp: Date.now(),
            stats: calculationCache.getStats()
        });

        if (this.metrics.cacheStats.length > 100) {
            this.metrics.cacheStats.shift();
        }
    }

    getStats() {
        const stats = {};

        for (const [operation, count] of this.metrics.operationCounts) {
            const times = this.metrics.operationTimes.get(operation);
            const avgTime = times.length > 0 ?
                times.reduce((a, b) => a + b, 0) / times.length : 0;
            const minTime = times.length > 0 ? Math.min(...times) : 0;
            const maxTime = times.length > 0 ? Math.max(...times) : 0;

            stats[operation] = {
                count,
                avgTime,
                minTime,
                maxTime,
                totalTime: times.reduce((a, b) => a + b, 0)
            };
        }

        return {
            operations: stats,
            memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1],
            cacheStats: this.metrics.cacheStats[this.metrics.cacheStats.length - 1],
            uptime: Date.now() - this.startTime
        };
    }

    printStats() {
        const stats = this.getStats();
        console.log("\n📊 Performance Statistics:");
        console.log("=" * 50);

        for (const [operation, data] of Object.entries(stats.operations)) {
            console.log(`${operation}:`);
            console.log(`  Count: ${data.count}`);
            console.log(`  Avg Time: ${data.avgTime.toFixed(3)}ms`);
            console.log(`  Min Time: ${data.minTime.toFixed(3)}ms`);
            console.log(`  Max Time: ${data.maxTime.toFixed(3)}ms`);
        }

        if (stats.memoryUsage) {
            console.log(`\nMemory Usage:`);
            console.log(`  Heap Used: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            console.log(`  Heap Total: ${(stats.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
        }

        console.log(`\nUptime: ${(stats.uptime / 1000 / 60).toFixed(1)} minutes`);
    }
}

// Create singleton instances
const batchProcessor = new BatchProcessor();
const performanceMonitor = new PerformanceMonitor();

// Start monitoring
performanceMonitor.startMonitoring();

export {
    batchProcessor,
    performanceMonitor,
    ObjectPool,
    LookupTables,
    BatchProcessor,
    PerformanceMonitor
};