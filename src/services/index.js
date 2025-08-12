/**
 * Services module index - Central export point for all service modules
 * 
 * This module provides access to:
 * 1. Price Service - Real-time price data management
 * 2. Request Recorder - Network request logging and monitoring
 * 3. Request Capture - API request/response interception
 * 
 * All services are organized by functionality and exported
 * for easy access throughout the system.
 */

// Import service modules
import priceService from './priceService.js';
import requestRecorder from './requestRecorder.js';
import requestCapture from './requestCapture.js';

// Export all service modules
export {
    priceService,
    requestRecorder,
    requestCapture
};

// Export individual services for direct access
export { default as PriceService }
from './priceService.js';
export { default as RequestRecorder }
from './requestRecorder.js';
export { default as RequestCapture }
from './requestCapture.js';