import config from "../config/config.js";
import logger from "../logging/logger.js";

/**
 * Wraps a function with retry logic for handling transient failures
 * @param {Function} fn - Function to retry
 * @param {Array} args - Arguments to pass to the function
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Promise} Promise that resolves with function result or rejects after max retries
 */
export async function retryWrapper(fn, args = [], maxRetries = config.errorHandling.maxRetries, delayMs = config.errorHandling.defaultRetryDelay) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn(...args);
        } catch (error) {
            let errorMsg = error.message || error.toString();

            if (config.errorHandling.enableErrorLogging) {
                console.error(`Attempt ${attempt} failed with error: ${errorMsg}`);
            }

            if (attempt < maxRetries) {
                console.log(`Retrying attempt ${attempt + 1} after ${delayMs} ms...`);
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                console.error("Maximum retry attempts reached. Operation failed.");
                
                // Log error with developer contact information
                await logger.logErrorWithContact(
                    'RETRY_FAILED',
                    `Function failed after ${maxRetries} attempts`,
                    {
                        functionName: fn.name || 'Anonymous',
                        arguments: args,
                        attempts: maxRetries,
                        finalError: errorMsg
                    },
                    'ERROR'
                );
                
                throw error;
            }
        }
    }
}

/**
 * Handle critical system errors with developer contact
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where the error occurred
 * @param {object} additionalData - Additional data for debugging
 */
export async function handleCriticalError(error, context = 'Unknown', additionalData = {}) {
    const errorDetails = {
        context,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
        ...additionalData
    };

    // Log error with developer contact
    await logger.logErrorWithContact(
        'CRITICAL_ERROR',
        `Critical error in ${context}: ${error.message}`,
        errorDetails,
        'CRITICAL'
    );

    // Display contact information prominently
    console.error('\n🚨 CRITICAL SYSTEM ERROR 🚨');
    console.error('=====================================');
    console.error(`❌ Error: ${error.message}`);
    console.error(`📍 Context: ${context}`);
    console.error('\n📞 Contact developer for immediate technical support:');
    console.error('👤 Amir Sharifi');
    console.error('📱 +98 917 238 4087');
    console.error('💬 Call for quick problem resolution');
    console.error('=====================================\n');
}