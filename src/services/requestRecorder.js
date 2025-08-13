/**
 * Request Recorder Service - Network request logging and monitoring
 * 
 * This module provides comprehensive request tracking including:
 * 1. API request/response logging
 * 2. Performance monitoring and timing
 * 3. Error tracking and analysis
 * 4. Request statistics and metrics
 * 5. Debugging and troubleshooting support
 * 
 * All network requests are logged for monitoring, debugging,
 * and performance analysis purposes.
 */

import logger from "../logging/logger.js";
import config from "../config/config.js";

/**
 * Main Request Recorder class for tracking network requests
 * 
 * Features:
 * - Request/response logging
 * - Performance timing
 * - Error tracking
 * - Statistics collection
 * - Configurable logging levels
 */
class RequestRecorder {
    /**
     * Initialize the request recorder
     * 
     * Sets up internal state and prepares for request tracking.
     */
    constructor() {
        // Track request statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0,
            averageResponseTime: 0
        };

        // Enable/disable based on configuration
        this.enabled = config.logSettings.enableErrorLogging;
    }

    /**
     * Record a network request
     * 
     * Logs request details including method, URL, headers, and body.
     * Useful for debugging API issues and monitoring system behavior.
     * 
     * @param {object} requestData - Request information to log
     * @param {string} requestData.method - HTTP method (GET, POST, etc.)
     * @param {string} requestData.url - Request URL
     * @param {object} requestData.headers - Request headers
     * @param {*} requestData.body - Request body data
     * @param {string} requestData.exchangeId - Exchange identifier
     * @param {string} requestData.symbol - Trading symbol
     */
    recordRequest(requestData) {
        if (!this.enabled) return;

        try {
            // Log request to logger service
            logger.logRequest({
                type: 'REQUEST',
                method: requestData.method || 'UNKNOWN',
                url: requestData.url || 'UNKNOWN',
                headers: requestData.headers || {},
                body: requestData.body || null,
                exchangeId: requestData.exchangeId || 'UNKNOWN',
                symbol: requestData.symbol || 'UNKNOWN',
                timestamp: new Date().toISOString()
            });

            // Update statistics
            this.stats.totalRequests++;

        } catch (error) {
            // Silently handle logging errors to prevent system disruption
            console.error(`Failed to record request: ${error.message}`);
        }
    }

    /**
     * Record a network response
     * 
     * Logs response details including status, headers, body, and timing.
     * Tracks performance metrics and error conditions.
     * 
     * @param {object} responseData - Response information to log
     * @param {number} responseData.status - HTTP status code
     * @param {object} responseData.headers - Response headers
     * @param {*} responseData.body - Response body data
     * @param {number} responseData.responseTime - Response time in milliseconds
     * @param {string} responseData.exchangeId - Exchange identifier
     * @param {string} responseData.symbol - Trading symbol
     * @param {Error} responseData.error - Error object if request failed
     */
    recordResponse(responseData) {
        if (!this.enabled) return;

        try {
            // Log response to logger service
            logger.logRequest({
                type: 'RESPONSE',
                status: responseData.status || 'UNKNOWN',
                headers: responseData.headers || {},
                body: responseData.body || null,
                responseTime: responseData.responseTime || 0,
                exchangeId: responseData.exchangeId || 'UNKNOWN',
                symbol: responseData.symbol || 'UNKNOWN',
                error: responseData.error ? responseData.error.message : null,
                timestamp: new Date().toISOString()
            });

            // Update statistics
            if (responseData.error || (responseData.status && responseData.status >= 400)) {
                this.stats.failedRequests++;
            } else {
                this.stats.successfulRequests++;
            }

            // Update response time statistics
            if (responseData.responseTime) {
                this.stats.totalResponseTime += responseData.responseTime;
                this.stats.averageResponseTime = this.stats.totalResponseTime /
                    (this.stats.successfulRequests + this.stats.failedRequests);
            }

        } catch (error) {
            // Silently handle logging errors to prevent system disruption
            console.error(`Failed to record response: ${error.message}`);
        }
    }

    /**
     * Record a complete request/response cycle
     * 
     * Convenience method to record both request and response in one call.
     * Automatically calculates response time and handles error conditions.
     * 
     * @param {object} cycleData - Complete request/response cycle data
     * @param {object} cycleData.request - Request data
     * @param {object} cycleData.response - Response data
     * @param {number} cycleData.startTime - Request start timestamp
     * @param {number} cycleData.endTime - Response end timestamp
     */
    recordRequestCycle(cycleData) {
        if (!this.enabled) return;

        try {
            const { request, response, startTime, endTime } = cycleData;

            // Calculate response time
            const responseTime = endTime - startTime;

            // Record request
            this.recordRequest(request);

            // Record response with timing
            this.recordResponse({
                ...response,
                responseTime: responseTime
            });

        } catch (error) {
            console.error(`Failed to record request cycle: ${error.message}`);
        }
    }

    /**
     * Record an error that occurred during a request
     * 
     * Logs error details for debugging and monitoring purposes.
     * Tracks error frequency and types for system health monitoring.
     * 
     * @param {object} errorData - Error information to log
     * @param {Error} errorData.error - Error object
     * @param {string} errorData.exchangeId - Exchange identifier
     * @param {string} errorData.symbol - Trading symbol
     * @param {string} errorData.operation - Operation being performed
     * @param {object} errorData.context - Additional context information
     */
    recordError(errorData) {
        if (!this.enabled) return;

        try {
            logger.logRequest({
                type: 'ERROR',
                error: errorData.error.message || 'Unknown error',
                stack: errorData.error.stack || null,
                exchangeId: errorData.exchangeId || 'UNKNOWN',
                symbol: errorData.symbol || 'UNKNOWN',
                operation: errorData.operation || 'UNKNOWN',
                context: errorData.context || {},
                timestamp: new Date().toISOString()
            });

            // Update error statistics
            this.stats.failedRequests++;

        } catch (error) {
            console.error(`Failed to record error: ${error.message}`);
        }
    }

    /**
     * Get current request statistics
     * 
     * Returns comprehensive statistics about recorded requests
     * including counts, success rates, and performance metrics.
     * 
     * @returns {object} Current request statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalRequests > 0 ?
                (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0,
            failureRate: this.stats.totalRequests > 0 ?
                (this.stats.failedRequests / this.stats.totalRequests) * 100 : 0
        };
    }

    /**
     * Reset request statistics
     * 
     * Clears all accumulated statistics to start fresh.
     * Useful for periodic reporting or debugging sessions.
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0,
            averageResponseTime: 0
        };
    }

    /**
     * Enable or disable request recording
     * 
     * Allows dynamic control of request recording functionality.
     * Useful for performance tuning or debugging scenarios.
     * 
     * @param {boolean} enabled - Whether to enable request recording
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    /**
     * Check if request recording is enabled
     * 
     * Returns the current enabled state of the request recorder.
     * 
     * @returns {boolean} True if request recording is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}

// Create singleton instance for use throughout the system
const requestRecorder = new RequestRecorder();

export default requestRecorder;
export { RequestRecorder };