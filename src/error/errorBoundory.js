/**
 * Wraps a function with retry logic for handling transient failures
 * @param {Function} fn - Function to retry
 * @param {Array} args - Arguments to pass to the function
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} delayMs - Delay between retries in milliseconds
 * @returns {Promise} Promise that resolves with function result or rejects after max retries
 */
export async function retryWrapper(fn, args = [], maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn(...args);
        } catch (error) {
            let errorMsg = error.message || error.toString();

            console.error(`Attempt ${attempt} failed with error: ${errorMsg}`);

            if (attempt < maxRetries) {
                console.log(`Retrying attempt ${attempt + 1} after ${delayMs} ms...`);
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                console.error("Maximum retry attempts reached. Operation failed.");
                throw error;
            }
        }
    }
}