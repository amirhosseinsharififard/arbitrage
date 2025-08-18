/**
 * Services module index - Central export point for all service modules
 * 
 * This module provides access to:
 * 1. Ourbit Price Service - Real-time price data management via Puppeteer
 * 2. LBank Price Service - Real-time price data management via CCXT
 * 3. KCEX/XT Puppeteer integrations
 * 
 * All services are organized by functionality and exported
 * for easy access throughout the system.
 */

// Import service modules
import ourbitPriceService from './ourbitPriceService.js';
import lbankPriceService from './lbankPriceService.js';
import kcexPuppeteerService from '../../puppeteer/kcexService.js';
import xtPuppeteerService from '../../puppeteer/xtService.js';
import dexscreenerPuppeteerService from '../../puppeteer/dexscreenerService.js';
import dexscreenerApiService from './dexscreenerApiService.js';

// Export all service modules
export { ourbitPriceService, lbankPriceService, kcexPuppeteerService, xtPuppeteerService, dexscreenerPuppeteerService, dexscreenerApiService };

// Export individual services for direct access (named)
export { default as OurbitPriceService }
from './ourbitPriceService.js';
export { default as LbankPriceService }
from './lbankPriceService.js';
export { default as KCEXPuppeteerService }
from '../../puppeteer/kcexService.js';
export { default as XTPuppeteerService }
from '../../puppeteer/xtService.js';
export { default as DexScreenerPuppeteerService }
from '../../puppeteer/dexscreenerService.js';