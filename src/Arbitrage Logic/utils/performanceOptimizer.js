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
            dataUpdateTimes: new Map(),
            lastUpdateTime: Date.now(),
            totalUpdates: 0,
            averageUpdateTime: 0
        };

        this.monitoringInterval = null;
        this.startMonitoring();
    }

    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(() => {
            this.recordMetrics();
        }, 5000); // Record metrics every 5 seconds
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

    // NEW: Track data update performance
    recordDataUpdate(exchangeId, updateTime) {
        if (!this.metrics.dataUpdateTimes.has(exchangeId)) {
            this.metrics.dataUpdateTimes.set(exchangeId, []);
        }

        this.metrics.dataUpdateTimes.get(exchangeId).push(updateTime);
        this.metrics.totalUpdates++;

        // Calculate running average
        const allTimes = Array.from(this.metrics.dataUpdateTimes.values()).flat();
        this.metrics.averageUpdateTime = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

        // Keep only last 100 measurements per exchange
        if (this.metrics.dataUpdateTimes.get(exchangeId).length > 100) {
            this.metrics.dataUpdateTimes.get(exchangeId).shift();
        }

        // Log performance warnings if update time exceeds 50ms
        if (updateTime > 50) {
            console.warn(`⚠️ Slow data update detected: ${exchangeId} took ${updateTime}ms (target: <50ms)`);
        }
    }

    recordMetrics() {
        const memUsage = process.memoryUsage();

        console.log('\n📊 Performance Metrics:');
        console.log(`Memory Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        console.log(`Average Data Update Time: ${this.metrics.averageUpdateTime.toFixed(2)}ms`);
        console.log(`Total Updates: ${this.metrics.totalUpdates}`);

        // Display exchange-specific performance
        for (const [exchangeId, times] of this.metrics.dataUpdateTimes) {
            if (times.length > 0) {
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                const maxTime = Math.max(...times);
                const minTime = Math.min(...times);
                const performance = avgTime <= 50 ? '🟢' : avgTime <= 100 ? '🟡' : '🔴';
                console.log(`${performance} ${exchangeId}: avg=${avgTime.toFixed(1)}ms, min=${minTime}ms, max=${maxTime}ms`);
            }
        }

        console.log('='.repeat(60));
    }

    getPerformanceStats() {
        return {
            averageUpdateTime: this.metrics.averageUpdateTime,
            totalUpdates: this.metrics.totalUpdates,
            exchangePerformance: Object.fromEntries(
                Array.from(this.metrics.dataUpdateTimes.entries()).map(([exchange, times]) => [
                    exchange,
                    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
                ])
            )
        };
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