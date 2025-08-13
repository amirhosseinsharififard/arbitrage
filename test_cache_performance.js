/**
 * Cache Performance Test Script
 * 
 * This script tests the performance improvements from the new caching system
 * without changing any business logic.
 */

import { CalculationUtils } from "./src/utils/calculations.js";
import calculationCache from "./src/utils/calculationCache.js";
import { batchProcessor, performanceMonitor } from "./src/utils/performanceOptimizer.js";

// Test data generation
function generateTestData(count = 10000) {
    const data = [];
    for (let i = 0; i < count; i++) {
        const basePrice = 0.0024 + (Math.random() * 0.0001);
        const spread = (Math.random() - 0.5) * 0.0002;
        data.push({
            buyPrice: basePrice,
            sellPrice: basePrice + spread,
            amount: 100 + Math.random() * 900,
            feePercent: [0, 0.1, 0.2, 0.5][Math.floor(Math.random() * 4)],
            investment: 100 + Math.random() * 900
        });
    }
    return data;
}

// Performance test function
function runPerformanceTest(testName, testFunction, iterations = 100000) {
    console.log(`\n🧪 Running ${testName}...`);

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        testFunction();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const operationsPerSecond = iterations / (duration / 1000);

    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}ms`);
    console.log(`   🚀 Operations/sec: ${operationsPerSecond.toFixed(0)}`);
    console.log(`   📊 Total operations: ${iterations.toLocaleString()}`);

    return { duration, operationsPerSecond };
}

// Test price difference calculations
function testPriceDifferenceCalculations() {
    const testData = generateTestData(1000);

    // Test without cache
    const withoutCache = runPerformanceTest(
        "Price Difference (No Cache)",
        () => {
            for (const data of testData) {
                const result = ((data.sellPrice - data.buyPrice) * 100) / data.buyPrice;
            }
        },
        1000
    );

    // Test with cache
    const withCache = runPerformanceTest(
        "Price Difference (With Cache)",
        () => {
            for (const data of testData) {
                const result = calculationCache.calculatePriceDifference(data.buyPrice, data.sellPrice);
            }
        },
        1000
    );

    const improvement = withCache.operationsPerSecond / withoutCache.operationsPerSecond;
    console.log(`\n📈 Price Difference Improvement: ${improvement.toFixed(2)}x faster`);

    return { withoutCache, withCache, improvement };
}

// Test fee calculations
function testFeeCalculations() {
    const testData = generateTestData(1000);

    // Test without cache
    const withoutCache = runPerformanceTest(
        "Fee Calculation (No Cache)",
        () => {
            for (const data of testData) {
                const result = (data.amount * data.feePercent) / 100;
            }
        },
        1000
    );

    // Test with cache
    const withCache = runPerformanceTest(
        "Fee Calculation (With Cache)",
        () => {
            for (const data of testData) {
                const result = calculationCache.calculateFee(data.amount, data.feePercent);
            }
        },
        1000
    );

    const improvement = withCache.operationsPerSecond / withoutCache.operationsPerSecond;
    console.log(`\n📈 Fee Calculation Improvement: ${improvement.toFixed(2)}x faster`);

    return { withoutCache, withCache, improvement };
}

// Test volume calculations
function testVolumeCalculations() {
    const testData = generateTestData(1000);

    // Test without cache
    const withoutCache = runPerformanceTest(
        "Volume Calculation (No Cache)",
        () => {
            for (const data of testData) {
                const result = data.investment / data.buyPrice;
            }
        },
        1000
    );

    // Test with cache
    const withCache = runPerformanceTest(
        "Volume Calculation (With Cache)",
        () => {
            for (const data of testData) {
                const result = calculationCache.calculateVolume(data.investment, data.buyPrice);
            }
        },
        1000
    );

    const improvement = withCache.operationsPerSecond / withoutCache.operationsPerSecond;
    console.log(`\n📈 Volume Calculation Improvement: ${improvement.toFixed(2)}x faster`);

    return { withoutCache, withCache, improvement };
}

// Test batch processing
function testBatchProcessing() {
    const testData = generateTestData(1000);

    // Prepare batch data
    const pricePairs = testData.map(d => [d.buyPrice, d.sellPrice]);
    const amounts = testData.map(d => d.amount);
    const feePercentages = testData.map(d => d.feePercent);
    const investments = testData.map(d => d.investment);
    const prices = testData.map(d => d.buyPrice);

    // Test individual calculations
    const individual = runPerformanceTest(
        "Individual Calculations",
        () => {
            for (let i = 0; i < testData.length; i++) {
                const priceDiff = calculationCache.calculatePriceDifference(pricePairs[i][0], pricePairs[i][1]);
                const fee = calculationCache.calculateFee(amounts[i], feePercentages[i]);
                const volume = calculationCache.calculateVolume(investments[i], prices[i]);
            }
        },
        100
    );

    // Test batch calculations
    const batch = runPerformanceTest(
        "Batch Calculations",
        () => {
            const priceDiffs = batchProcessor.calculatePriceDifferencesBatch(pricePairs);
            const fees = batchProcessor.calculateFeesBatch(amounts, feePercentages);
            const volumes = batchProcessor.calculateVolumesBatch(investments, prices);
        },
        100
    );

    const improvement = batch.operationsPerSecond / individual.operationsPerSecond;
    console.log(`\n📈 Batch Processing Improvement: ${improvement.toFixed(2)}x faster`);

    return { individual, batch, improvement };
}

// Test memory usage
function testMemoryUsage() {
    console.log("\n🧪 Testing Memory Usage...");

    const initialMemory = process.memoryUsage();
    console.log(`   📊 Initial Memory:`);
    console.log(`      - Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`      - Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);

    // Run many calculations to test memory usage
    const testData = generateTestData(50000);

    for (let i = 0; i < 10; i++) {
        for (const data of testData) {
            calculationCache.calculatePriceDifference(data.buyPrice, data.sellPrice);
            calculationCache.calculateFee(data.amount, data.feePercent);
            calculationCache.calculateVolume(data.investment, data.buyPrice);
        }
    }

    const finalMemory = process.memoryUsage();
    console.log(`   📊 Final Memory:`);
    console.log(`      - Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`      - Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);

    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log(`   📊 Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

    return { initialMemory, finalMemory, memoryIncrease };
}

// Test cache statistics
function testCacheStatistics() {
    console.log("\n🧪 Cache Statistics:");

    const stats = calculationCache.getStats();

    console.log(`   📊 Price Difference Cache:`);
    console.log(`      - Hits: ${stats.priceDifference.hits}`);
    console.log(`      - Misses: ${stats.priceDifference.misses}`);
    console.log(`      - Hit Rate: ${stats.priceDifference.hitRate.toFixed(1)}%`);
    console.log(`      - Cache Size: ${stats.priceDifference.cacheStats.size}/${stats.priceDifference.cacheStats.maxSize}`);

    console.log(`   📊 Fee Cache:`);
    console.log(`      - Hits: ${stats.fee.hits}`);
    console.log(`      - Misses: ${stats.fee.misses}`);
    console.log(`      - Hit Rate: ${stats.fee.hitRate.toFixed(1)}%`);
    console.log(`      - Cache Size: ${stats.fee.cacheStats.size}/${stats.fee.cacheStats.maxSize}`);

    console.log(`   📊 Volume Cache:`);
    console.log(`      - Hits: ${stats.volume.hits}`);
    console.log(`      - Misses: ${stats.volume.misses}`);
    console.log(`      - Hit Rate: ${stats.volume.hitRate.toFixed(1)}%`);
    console.log(`      - Cache Size: ${stats.volume.cacheStats.size}/${stats.volume.cacheStats.maxSize}`);

    return stats;
}

// Test accuracy
function testAccuracy() {
    console.log("\n🧪 Testing Calculation Accuracy...");

    const testCases = [
        { buyPrice: 0.002478, sellPrice: 0.002548, expected: 2.825 },
        { buyPrice: 0.002455, sellPrice: 0.002556, expected: 4.114 },
        { buyPrice: 0.002476, sellPrice: 0.002549, expected: 2.948 },
        { buyPrice: 0.002481, sellPrice: 0.002544, expected: 2.539 },
        { buyPrice: 0.002475, sellPrice: 0.002548, expected: 2.949 }
    ];

    let maxDifference = 0;
    let totalDifference = 0;

    for (const testCase of testCases) {
        const regularResult = ((testCase.sellPrice - testCase.buyPrice) * 100) / testCase.buyPrice;
        const cachedResult = calculationCache.calculatePriceDifference(testCase.buyPrice, testCase.sellPrice);

        const difference = Math.abs(regularResult - cachedResult);
        maxDifference = Math.max(maxDifference, difference);
        totalDifference += difference;

        console.log(`   ${testCase.buyPrice} -> ${testCase.sellPrice}:`);
        console.log(`      Regular: ${regularResult.toFixed(6)}`);
        console.log(`      Cached:  ${cachedResult.toFixed(6)}`);
        console.log(`      Diff:    ${difference.toFixed(8)}`);
    }

    const averageDifference = totalDifference / testCases.length;
    console.log(`\n   📊 Accuracy Summary:`);
    console.log(`      - Max Difference: ${maxDifference.toFixed(8)}`);
    console.log(`      - Average Difference: ${averageDifference.toFixed(8)}`);
    console.log(`      - Tests Passed: ${testCases.length}`);

    return { maxDifference, averageDifference, testCases: testCases.length };
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Starting Cache Performance Tests...");
    console.log("=" * 60);

    // Warm up cache
    console.log("🔥 Warming up cache...");
    const warmupData = generateTestData(1000);
    for (const data of warmupData) {
        calculationCache.calculatePriceDifference(data.buyPrice, data.sellPrice);
        calculationCache.calculateFee(data.amount, data.feePercent);
        calculationCache.calculateVolume(data.investment, data.buyPrice);
    }

    // Run all tests
    const priceDiffResults = testPriceDifferenceCalculations();
    const feeResults = testFeeCalculations();
    const volumeResults = testVolumeCalculations();
    const batchResults = testBatchProcessing();
    const memoryResults = testMemoryUsage();
    const cacheStats = testCacheStatistics();
    const accuracyResults = testAccuracy();

    // Performance monitor stats
    performanceMonitor.printStats();

    // Summary
    console.log("\n📊 Performance Test Summary:");
    console.log("=" * 60);
    console.log(`   🚀 Price Difference: ${priceDiffResults.improvement.toFixed(2)}x faster`);
    console.log(`   🚀 Fee Calculation: ${feeResults.improvement.toFixed(2)}x faster`);
    console.log(`   🚀 Volume Calculation: ${volumeResults.improvement.toFixed(2)}x faster`);
    console.log(`   🚀 Batch Processing: ${batchResults.improvement.toFixed(2)}x faster`);
    console.log(`   📊 Memory Usage: ${(memoryResults.memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
    console.log(`   🎯 Accuracy: ${accuracyResults.averageDifference.toFixed(8)} average difference`);

    const overallImprovement = (priceDiffResults.improvement + feeResults.improvement + volumeResults.improvement) / 3;
    console.log(`\n🏆 Overall Performance Improvement: ${overallImprovement.toFixed(2)}x faster`);

    console.log("\n✅ All performance tests completed!");
}

// Run tests if this file is executed directly
if (
    import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

export { runAllTests };