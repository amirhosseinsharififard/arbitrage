/**
 * Request Capture Service - API request/response interception
 * 
 * This module provides functionality for:
 * 1. Intercepting network requests and responses
 * 2. Capturing request/response data for analysis
 * 3. Monitoring API communication patterns
 * 4. Debugging exchange API interactions
 * 5. Performance analysis and optimization
 * 
 * Useful for understanding how the system communicates with
 * exchanges and identifying potential issues or optimizations.
 */

import requestRecorder from "./requestRecorder.js";

/**
 * Main Request Capture class for intercepting network traffic
 * 
 * Features:
 * - Request/response interception
 * - Data capture and logging
 * - Performance monitoring
 * - Error tracking
 * - Configurable capture levels
 */
class RequestCapture {
    /**
     * Initialize the request capture service
     * 
     * Sets up internal state and prepares for request interception.
     */
    constructor() {
        // Track capture state
        this.isCapturing = false;
        this.captureLevel = 'basic'; // 'basic', 'detailed', 'full'

        // Store captured requests for analysis
        this.capturedRequests = new Map();
        this.maxStoredRequests = 1000; // Limit memory usage
    }

    /**
     * Start capturing network requests
     
     * Enables request interception and begins logging all
     * network communication for the specified capture level.
     * 
     * @param {string} level - Capture level ('basic', 'detailed', 'full')
     */
    startCapture(level = 'basic') {
        if (this.isCapturing) {
            console.log('⚠️ Request capture is already active');
            return;
        }

        this.captureLevel = level;
        this.isCapturing = true;

        console.log(`🔍 Started request capture at ${level} level`);

        // Clear previous captures when starting new session
        this.capturedRequests.clear();
    }

    /**
     * Stop capturing network requests
     * 
     * Disables request interception and stops logging
     * network communication. Captured data is preserved.
     */
    stopCapture() {
        if (!this.isCapturing) {
            console.log('⚠️ Request capture is not active');
            return;
        }

        this.isCapturing = false;
        console.log('🛑 Stopped request capture');
    }

    /**
     * Capture a network request
     * 
     * Records request details based on the current capture level.
     * Stores request data for later analysis and debugging.
     * 
     * @param {object} requestData - Request information to capture
     * @param {string} requestData.id - Unique request identifier
     * @param {string} requestData.method - HTTP method
     * @param {string} requestData.url - Request URL
     * @param {object} requestData.headers - Request headers
     * @param {*} requestData.body - Request body
     * @param {string} requestData.exchangeId - Exchange identifier
     * @param {string} requestData.symbol - Trading symbol
     */
    captureRequest(requestData) {
        if (!this.isCapturing) return;

        try {
            const requestId = requestData.id || this.generateRequestId();
            const timestamp = Date.now();

            // Create capture record based on level
            let captureRecord = {
                id: requestId,
                timestamp: timestamp,
                method: requestData.method || 'UNKNOWN',
                url: requestData.url || 'UNKNOWN',
                exchangeId: requestData.exchangeId || 'UNKNOWN',
                symbol: requestData.symbol || 'UNKNOWN'
            };

            // Add detailed information for higher capture levels
            if (this.captureLevel === 'detailed' || this.captureLevel === 'full') {
                captureRecord.headers = requestData.headers || {};
                captureRecord.body = requestData.body || null;
            }

            // Store the captured request
            this.storeCapturedRequest(requestId, captureRecord);

            // Log to request recorder
            requestRecorder.recordRequest({
                ...requestData,
                id: requestId
            });

        } catch (error) {
            console.error(`Failed to capture request: ${error.message}`);
        }
    }

    /**
     * Capture a network response
     * 
     * Records response details and links them to the corresponding request.
     * Calculates response times and tracks success/failure rates.
     * 
     * @param {object} responseData - Response information to capture
     * @param {string} responseData.requestId - ID of the corresponding request
     * @param {number} responseData.status - HTTP status code
     * @param {object} responseData.headers - Response headers
     * @param {*} responseData.body - Response body
     * @param {Error} responseData.error - Error object if request failed
     * @param {number} responseData.responseTime - Response time in milliseconds
     */
    captureResponse(responseData) {
        if (!this.isCapturing) return;

        try {
            const { requestId } = responseData;
            if (!requestId) {
                console.warn('Response captured without request ID');
                return;
            }

            const timestamp = Date.now();

            // Create capture record based on level
            let captureRecord = {
                requestId: requestId,
                timestamp: timestamp,
                status: responseData.status || 'UNKNOWN',
                responseTime: responseData.responseTime || 0
            };

            // Add detailed information for higher capture levels
            if (this.captureLevel === 'detailed' || this.captureLevel === 'full') {
                captureRecord.headers = responseData.headers || {};
                captureRecord.body = responseData.body || null;
            }

            // Add error information if available
            if (responseData.error) {
                captureRecord.error = {
                    message: responseData.error.message,
                    stack: this.captureLevel === 'full' ? responseData.error.stack : null
                };
            }

            // Update the stored request with response data
            this.updateCapturedRequest(requestId, captureRecord);

            // Log to request recorder
            requestRecorder.recordResponse({
                ...responseData,
                requestId: requestId
            });

        } catch (error) {
            console.error(`Failed to capture response: ${error.message}`);
        }
    }

    /**
     * Store a captured request in memory
     * 
     * Stores request data with automatic cleanup to prevent
     * memory overflow. Limits the number of stored requests.
     * 
     * @param {string} requestId - Unique request identifier
     * @param {object} requestData - Request data to store
     */
    storeCapturedRequest(requestId, requestData) {
        // Clean up old requests if we're at the limit
        if (this.capturedRequests.size >= this.maxStoredRequests) {
            const oldestKey = this.capturedRequests.keys().next().value;
            this.capturedRequests.delete(oldestKey);
        }

        // Store the new request
        this.capturedRequests.set(requestId, {
            request: requestData,
            response: null,
            completed: false
        });
    }

    /**
     * Update a stored request with response data
     * 
     * Links response data to the corresponding request and
     * marks the request as completed.
     * 
     * @param {string} requestId - Unique request identifier
     * @param {object} responseData - Response data to store
     */
    updateCapturedRequest(requestId, responseData) {
        const stored = this.capturedRequests.get(requestId);
        if (stored) {
            stored.response = responseData;
            stored.completed = true;
            stored.totalTime = responseData.timestamp - stored.request.timestamp;
        }
    }

    /**
     * Generate a unique request identifier
     * 
     * Creates a unique identifier for tracking requests
     * through their lifecycle.
     * 
     * @returns {string} Unique request identifier
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get captured request data
     * 
     * Retrieves stored request/response data for analysis.
     * Can filter by completion status or exchange.
     * 
     * @param {object} filters - Optional filters for the data
     * @param {boolean} filters.completed - Filter by completion status
     * @param {string} filters.exchangeId - Filter by exchange
     * @param {number} filters.limit - Maximum number of results
     * @returns {Array} Array of captured request data
     */
    getCapturedRequests(filters = {}) {
        let results = Array.from(this.capturedRequests.values());

        // Apply filters
        if (filters.completed !== undefined) {
            results = results.filter(req => req.completed === filters.completed);
        }

        if (filters.exchangeId) {
            results = results.filter(req => req.request.exchangeId === filters.exchangeId);
        }

        // Apply limit
        if (filters.limit && filters.limit > 0) {
            results = results.slice(0, filters.limit);
        }

        return results;
    }

    /**
     * Get capture statistics
     * 
     * Returns comprehensive statistics about captured requests
     * including counts, completion rates, and performance metrics.
     * 
     * @returns {object} Capture statistics
     */
    getCaptureStats() {
        const total = this.capturedRequests.size;
        const completed = Array.from(this.capturedRequests.values())
            .filter(req => req.completed).length;

        const responseTimes = Array.from(this.capturedRequests.values())
            .filter(req => req.completed && req.totalTime)
            .map(req => req.totalTime);

        const avgResponseTime = responseTimes.length > 0 ?
            responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

        return {
            totalRequests: total,
            completedRequests: completed,
            pendingRequests: total - completed,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
            averageResponseTime: avgResponseTime,
            captureLevel: this.captureLevel,
            isActive: this.isCapturing
        };
    }

    /**
     * Clear captured request data
     * 
     * Removes all stored request/response data to free memory.
     * Useful for starting fresh capture sessions.
     */
    clearCapturedData() {
        this.capturedRequests.clear();
        console.log('🧹 Cleared captured request data');
    }

    /**
     * Export captured data for analysis
     * 
     * Exports captured request/response data in a format suitable
     * for external analysis tools or debugging.
     * 
     * @param {string} format - Export format ('json', 'csv')
     * @returns {string} Exported data in the specified format
     */
    exportCapturedData(format = 'json') {
        try {
            const data = Array.from(this.capturedRequests.values());

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                // Simple CSV export for basic analysis
                const headers = ['ID', 'Method', 'URL', 'Exchange', 'Status', 'ResponseTime'];
                const rows = data.map(req => [
                    req.request.id,
                    req.request.method,
                    req.request.url,
                    req.request.exchangeId,
                    req.response ? req.response.status : 'PENDING',
                    req.response ? req.response.responseTime : 'N/A'
                ]);

                return [headers, ...rows]
                    .map(row => row.join(','))
                    .join('\n');
            }

            throw new Error(`Unsupported export format: ${format}`);

        } catch (error) {
            console.error(`Failed to export captured data: ${error.message}`);
            return null;
        }
    }
}

// Create singleton instance for use throughout the system
const requestCapture = new RequestCapture();

export default requestCapture;
export { RequestCapture };