/**
 * System Monitor for displaying status of all managers and system health
 * Provides real-time monitoring of request management and data updates
 */

import chalk from 'chalk';
import requestManager from './requestManager.js';
import dataUpdateManager from './dataUpdateManager.js';

class SystemMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitorInterval = null;
        this.updateInterval = 10000; // 10 seconds
    }
    
    /**
     * Start system monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('⚠️ System monitoring already active');
            return;
        }
        
        this.isMonitoring = true;
        console.log('🚀 Starting system monitoring...');
        
        // Display initial status
        this.displaySystemStatus();
        
        // Start periodic monitoring
        this.monitorInterval = setInterval(() => {
            this.displaySystemStatus();
        }, this.updateInterval);
    }
    
    /**
     * Stop system monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        
        this.isMonitoring = false;
        console.log('⏹️ System monitoring stopped');
    }
    
    /**
     * Display comprehensive system status
     */
    displaySystemStatus() {
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\n${chalk.magenta('🔍 SYSTEM MONITOR')} ${chalk.gray(`[${timestamp}]`)}`);
        console.log('='.repeat(60));
        
        // Display request manager status
        requestManager.displayStatus();
        
        // Display data update manager status
        dataUpdateManager.displayStatus();
        
        // Display system health
        this.displaySystemHealth();
        
        console.log('='.repeat(60));
    }
    
    /**
     * Display system health metrics
     */
    displaySystemHealth() {
        const requestStats = requestManager.getRequestStats();
        const updateStats = dataUpdateManager.getUpdateStats();
        
        // Calculate health metrics
        const totalRequests = requestStats.totalHistory || 0;
        const successfulRequests = updateStats.successfulUpdates || 0;
        const failedRequests = updateStats.failedUpdates || 0;
        
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(1) : 0;
        const cacheHitRate = (updateStats.cacheHits + updateStats.cacheMisses) > 0 ? 
            (updateStats.cacheHits / (updateStats.cacheHits + updateStats.cacheMisses) * 100).toFixed(1) : 0;
        
        console.log(`\n${chalk.yellow('🏥 SYSTEM HEALTH')}`);
        console.log('-'.repeat(30));
        
        // Success rate
        const successColor = successRate >= 90 ? chalk.green : successRate >= 70 ? chalk.yellow : chalk.red;
        console.log(`Success Rate: ${successColor(`${successRate}%`)}`);
        
        // Cache hit rate
        const cacheColor = cacheHitRate >= 80 ? chalk.green : cacheHitRate >= 50 ? chalk.yellow : chalk.red;
        console.log(`Cache Hit Rate: ${cacheColor(`${cacheHitRate}%`)}`);
        
        // Active requests
        const activeColor = requestStats.activeRequests > 0 ? chalk.yellow : chalk.green;
        console.log(`Active Requests: ${activeColor(requestStats.activeRequests)}`);
        
        // Queue status
        const queueColor = updateStats.queueSize > 10 ? chalk.red : updateStats.queueSize > 5 ? chalk.yellow : chalk.green;
        console.log(`Update Queue: ${queueColor(updateStats.queueSize)}`);
        
        // Processing status
        const processingColor = updateStats.processingSize > 3 ? chalk.red : chalk.green;
        console.log(`Processing: ${processingColor(updateStats.processingSize)}`);
    }
    
    /**
     * Display detailed request history
     */
    displayRequestHistory(limit = 10) {
        const history = requestManager.getRecentHistory(limit);
        
        console.log(`\n${chalk.blue('📋 RECENT REQUEST HISTORY')}`);
        console.log('-'.repeat(40));
        
        history.forEach((request, index) => {
            const status = request.success ? chalk.green('✅') : chalk.red('❌');
            const duration = `${request.duration}ms`;
            const time = new Date(request.timestamp).toLocaleTimeString();
            
            console.log(`${index + 1}. ${status} ${request.exchangeId} - ${duration} [${time}]`);
            
            if (!request.success && request.error) {
                console.log(`   Error: ${chalk.red(request.error)}`);
            }
        });
    }
    
    /**
     * Display exchange-specific statistics
     */
    displayExchangeStats() {
        const requestStats = requestManager.getRequestStats();
        const updateStats = dataUpdateManager.getUpdateStats();
        
        console.log(`\n${chalk.cyan('📊 EXCHANGE STATISTICS')}`);
        console.log('-'.repeat(40));
        
        // Rate limits
        console.log('Rate Limits:');
        Object.entries(requestStats.rateLimits).forEach(([exchange, limit]) => {
            const usage = (limit.current / limit.max * 100).toFixed(1);
            const color = usage >= 80 ? chalk.red : usage >= 50 ? chalk.yellow : chalk.green;
            console.log(`  ${exchange}: ${color(`${limit.current}/${limit.max} (${usage}%)`)}`);
        });
        
        // Last updates
        console.log('\nLast Updates:');
        Object.entries(requestStats.lastUpdates).forEach(([exchange, update]) => {
            const age = Math.round(update.age / 1000);
            const color = age < 60 ? chalk.green : age < 300 ? chalk.yellow : chalk.red;
            console.log(`  ${exchange}: ${color(`${age}s ago`)}`);
        });
    }
    
    /**
     * Get system summary for web interface
     */
    getSystemSummary() {
        const requestStats = requestManager.getRequestStats();
        const updateStats = dataUpdateManager.getUpdateStats();
        
        const totalRequests = requestStats.totalHistory || 0;
        const successfulRequests = updateStats.successfulUpdates || 0;
        const failedRequests = updateStats.failedUpdates || 0;
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(1) : 0;
        
        return {
            timestamp: new Date().toISOString(),
            requestManager: {
                activeRequests: requestStats.activeRequests,
                totalHistory: requestStats.totalHistory,
                rateLimits: requestStats.rateLimits
            },
            dataUpdateManager: {
                totalUpdates: updateStats.totalUpdates,
                successfulUpdates: updateStats.successfulUpdates,
                failedUpdates: updateStats.failedUpdates,
                cacheHits: updateStats.cacheHits,
                cacheMisses: updateStats.cacheMisses,
                queueSize: updateStats.queueSize,
                processingSize: updateStats.processingSize,
                cacheSize: updateStats.cacheSize
            },
            systemHealth: {
                successRate: parseFloat(successRate),
                cacheHitRate: (updateStats.cacheHits + updateStats.cacheMisses) > 0 ? 
                    (updateStats.cacheHits / (updateStats.cacheHits + updateStats.cacheMisses) * 100).toFixed(1) : 0,
                isHealthy: parseFloat(successRate) >= 80 && updateStats.queueSize < 10
            }
        };
    }
}

// Create singleton instance
const systemMonitor = new SystemMonitor();

export default systemMonitor;
