/**
 * Services module index - Central export point for all service modules
 * 
 * This module provides access to:
 * 1. Ourbit Price Service - Real-time price data management via Puppeteer
 * 2. Request Recorder - Network request logging and monitoring
 * 3. Request Capture - API request/response interception
 * 
 * All services are organized by functionality and exported
 * for easy access throughout the system.
 */

// Import service modules
import ourbitPriceService from './ourbitPriceService.js';
import requestRecorder from './requestRecorder.js';
import requestCapture from './requestCapture.js';
import kcexPuppeteerService from '../Puppeteer Logic/kcexService.js';

// Export all service modules
export {
    ourbitPriceService,
    requestRecorder,
    requestCapture,
    kcexPuppeteerService
};

// Export individual services for direct access
export { default as OurbitPriceService }
from './ourbitPriceService.js';
export { default as RequestRecorder }
from './requestRecorder.js';
export { default as RequestCapture }
from './requestCapture.js';
export { default as KCEXPuppeteerService }
from '../Puppeteer Logic/kcexService.js';