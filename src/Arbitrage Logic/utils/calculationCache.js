/**
 * Smart Calculation Cache System
 * 
 * This module provides intelligent caching for repetitive calculations:
 * 1. Price difference calculations
 * 2. Fee calculations
 * 3. Volume calculations
 * 4. Profit/loss calculations
 * 5. Order book calculations
 * 
 * Features:
 * - LRU (Least Recently Used) cache eviction
 * - Memory usage monitoring
 * - Cache hit rate tracking
 * - Automatic cache warming
 * - Performance metrics
 */

// LRU Cache implementation for optimal memory usage
class LRUCache {
    constructor(maxSize = 10000) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
    }

    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return null;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            // Update existing
            this.cache.set(key, value);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            this.accessOrder.push(key);
        } else {
            // Add new
            if (this.cache.size >= this.maxSize) {
                // Remove least recently used
                const lruKey = this.accessOrder.shift();
                this.cache.delete(lruKey);
            }
            this.cache.set(key, value);
            this.accessOrder.push(key);
        }
    }

    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    size() {
        return this.cache.size;
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: (this.cache.size / this.maxSize) * 100
        };
    }
}

// Main calculation cache manager
class CalculationCache {
    constructor() {
        // Separate caches for different calculation types
        this.priceDifferenceCache = new LRUCache(5000);
        this.feeCache = new LRUCache(2000);
        this.volumeCache = new LRUCache(2000);
        this.profitCache = new LRUCache(3000);
        this.orderBookCache = new LRUCache(1000);

        // Performance tracking
        this.stats = {
            priceDifferenceHits: 0,
            priceDifferenceMisses: 0,
            feeHits: 0,
            feeMisses: 0,
            volumeHits: 0,
            volumeMisses: 0,
            profitHits: 0,
            profitMisses: 0,
            orderBookHits: 0,
            orderBookMisses: 0
        };

        // Cache warming data
        this.commonPriceRanges = this.generateCommonPriceRanges();
        this.commonFeePercentages = [0, 0.1, 0.2, 0.5, 1, 2, 5];
        this.commonVolumes = [100, 500, 1000, 5000, 10000, 50000, 100000];

        // Start cache warming
        this.warmCache();
    }

    // Generate common price ranges for cache warming
    generateCommonPriceRanges() {
        const ranges = [];
        const basePrice = 0.0024;
        const step = 0.0001;

        for (let i = 0; i < 100; i++) {
            const buyPrice = basePrice + (i * step);
            for (let j = 1; j <= 20; j++) {
                const sellPrice = buyPrice + (j * step * 0.1);
                ranges.push([buyPrice, sellPrice]);
            }
        }

        return ranges;
    }

    // Warm up cache with common calculations
    warmCache() {
        console.log("🔥 Warming up calculation cache...");

        // Warm price difference cache
        for (const [buyPrice, sellPrice] of this.commonPriceRanges) {
            const key = this.generatePriceDifferenceKey(buyPrice, sellPrice);
            const result = ((sellPrice - buyPrice) * 100) / buyPrice;
            this.priceDifferenceCache.set(key, result);
        }

        // Warm fee cache
        for (const feePercent of this.commonFeePercentages) {
            for (const amount of this.commonVolumes) {
                const key = this.generateFeeKey(amount, feePercent);
                const result = (amount * feePercent) / 100;
                this.feeCache.set(key, result);
            }
        }

        // Warm volume cache
        for (const investment of this.commonVolumes) {
            for (const price of[0.0024, 0.0025, 0.0026, 0.0027, 0.0028]) {
                const key = this.generateVolumeKey(investment, price);
                const result = investment / price;
                this.volumeCache.set(key, result);
            }
        }

        console.log("✅ Cache warming completed");
    }

    // Generate cache keys
    generatePriceDifferenceKey(buyPrice, sellPrice) {
        return `pd_${buyPrice.toFixed(6)}_${sellPrice.toFixed(6)}`;
    }

    generateFeeKey(amount, feePercent) {
        return `fee_${amount}_${feePercent}`;
    }

    generateVolumeKey(investment, price) {
        return `vol_${investment}_${price.toFixed(6)}`;
    }

    generateProfitKey(buyPrice, sellPrice, volume, buyFee, sellFee) {
        return `profit_${buyPrice.toFixed(6)}_${sellPrice.toFixed(6)}_${volume}_${buyFee}_${sellFee}`;
    }

    generateOrderBookKey(orders, targetVolume) {
        const ordersHash = JSON.stringify(orders.slice(0, 5)); // Use first 5 orders for hash
        return `ob_${ordersHash}_${targetVolume}`;
    }

    // Cached price difference calculation
    calculatePriceDifference(buyPrice, sellPrice) {
        const key = this.generatePriceDifferenceKey(buyPrice, sellPrice);
        const cached = this.priceDifferenceCache.get(key);

        if (cached !== null) {
            this.stats.priceDifferenceHits++;
            return cached;
        }

        this.stats.priceDifferenceMisses++;
        const result = ((sellPrice - buyPrice) * 100) / buyPrice;
        this.priceDifferenceCache.set(key, result);
        return result;
    }

    // Cached fee calculation
    calculateFee(amount, feePercent) {
        const key = this.generateFeeKey(amount, feePercent);
        const cached = this.feeCache.get(key);

        if (cached !== null) {
            this.stats.feeHits++;
            return cached;
        }

        this.stats.feeMisses++;
        const result = (amount * feePercent) / 100;
        this.feeCache.set(key, result);
        return result;
    }

    // Cached volume calculation
    calculateVolume(investment, price) {
        const key = this.generateVolumeKey(investment, price);
        const cached = this.volumeCache.get(key);

        if (cached !== null) {
            this.stats.volumeHits++;
            return cached;
        }

        this.stats.volumeMisses++;
        const result = investment / price;
        this.volumeCache.set(key, result);
        return result;
    }

    // Cached profit calculation
    calculateProfit(buyPrice, sellPrice, volume, buyFee, sellFee) {
        const key = this.generateProfitKey(buyPrice, sellPrice, volume, buyFee, sellFee);
        const cached = this.profitCache.get(key);

        if (cached !== null) {
            this.stats.profitHits++;
            return cached;
        }

        this.stats.profitMisses++;
        const grossProfit = (sellPrice - buyPrice) * volume;
        const buyFees = this.calculateFee(buyPrice * volume, buyFee);
        const sellFees = this.calculateFee(sellPrice * volume, sellFee);
        const result = grossProfit - buyFees - sellFees;
        this.profitCache.set(key, result);
        return result;
    }

    // Cached order book calculation
    calculateOrderBookVolume(orders, targetVolume) {
        const key = this.generateOrderBookKey(orders, targetVolume);
        const cached = this.orderBookCache.get(key);

        if (cached !== null) {
            this.stats.orderBookHits++;
            return cached;
        }

        this.stats.orderBookMisses++;

        let remainingVolume = targetVolume;
        let totalCost = 0;
        let totalVolume = 0;

        for (let i = 0; i < orders.length && remainingVolume > 0; i++) {
            const [price, volume] = orders[i];
            const fillVolume = Math.min(remainingVolume, volume);

            totalCost += fillVolume * price;
            totalVolume += fillVolume;
            remainingVolume -= fillVolume;
        }

        const result = {
            totalCost,
            averagePrice: totalVolume > 0 ? totalCost / totalVolume : 0,
            filledVolume: totalVolume,
            remainingVolume
        };

        this.orderBookCache.set(key, result);
        return result;
    }

    // Get cache statistics
    getStats() {
        const totalPriceDiff = this.stats.priceDifferenceHits + this.stats.priceDifferenceMisses;
        const totalFee = this.stats.feeHits + this.stats.feeMisses;
        const totalVolume = this.stats.volumeHits + this.stats.volumeMisses;
        const totalProfit = this.stats.profitHits + this.stats.profitMisses;
        const totalOrderBook = this.stats.orderBookHits + this.stats.orderBookMisses;

        return {
            priceDifference: {
                hits: this.stats.priceDifferenceHits,
                misses: this.stats.priceDifferenceMisses,
                hitRate: totalPriceDiff > 0 ? (this.stats.priceDifferenceHits / totalPriceDiff) * 100 : 0,
                cacheStats: this.priceDifferenceCache.getStats()
            },
            fee: {
                hits: this.stats.feeHits,
                misses: this.stats.feeMisses,
                hitRate: totalFee > 0 ? (this.stats.feeHits / totalFee) * 100 : 0,
                cacheStats: this.feeCache.getStats()
            },
            volume: {
                hits: this.stats.volumeHits,
                misses: this.stats.volumeMisses,
                hitRate: totalVolume > 0 ? (this.stats.volumeHits / totalVolume) * 100 : 0,
                cacheStats: this.volumeCache.getStats()
            },
            profit: {
                hits: this.stats.profitHits,
                misses: this.stats.profitMisses,
                hitRate: totalProfit > 0 ? (this.stats.profitHits / totalProfit) * 100 : 0,
                cacheStats: this.profitCache.getStats()
            },
            orderBook: {
                hits: this.stats.orderBookHits,
                misses: this.stats.orderBookMisses,
                hitRate: totalOrderBook > 0 ? (this.stats.orderBookHits / totalOrderBook) * 100 : 0,
                cacheStats: this.orderBookCache.getStats()
            },
            totalMemoryUsage: this.getTotalMemoryUsage()
        };
    }

    // Get total memory usage
    getTotalMemoryUsage() {
        const memUsage = process.memoryUsage();
        return {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
        };
    }

    // Clear all caches
    clearAll() {
        this.priceDifferenceCache.clear();
        this.feeCache.clear();
        this.volumeCache.clear();
        this.profitCache.clear();
        this.orderBookCache.clear();

        // Reset stats
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
    }

    // Optimize cache sizes based on usage patterns
    optimize() {
        const stats = this.getStats();

        // Adjust cache sizes based on hit rates
        if (stats.priceDifference.hitRate < 50) {
            this.priceDifferenceCache.maxSize = Math.max(1000, this.priceDifferenceCache.maxSize * 0.8);
        } else if (stats.priceDifference.hitRate > 90) {
            this.priceDifferenceCache.maxSize = Math.min(10000, this.priceDifferenceCache.maxSize * 1.2);
        }

        if (stats.fee.hitRate < 50) {
            this.feeCache.maxSize = Math.max(500, this.feeCache.maxSize * 0.8);
        } else if (stats.fee.hitRate > 90) {
            this.feeCache.maxSize = Math.min(5000, this.feeCache.maxSize * 1.2);
        }

        console.log("🔧 Cache optimization completed");
    }
}

// Create singleton instance
const calculationCache = new CalculationCache();

export default calculationCache;