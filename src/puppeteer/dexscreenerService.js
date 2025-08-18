/**
 * DexScreener+ Puppeteer Service for DEX Integration
 * 
 * This module handles web scraping of DexScreener using Puppeteer
 * to extract real-time bid price data from the web interface.
 * 
 * Features:
 * - Automated browser control for price extraction
 * - XPath-based element selection for bid prices only (DEX)
 * - 100ms interval price updates
 * - Error handling and retry logic
 * - Integration with existing arbitrage system
 * - DEX-specific logic (bid-only, no ask prices)
 */

import puppeteer from 'puppeteer';
import { FormattingUtils } from '../Arbitrage Logic/utils/index.js';
import logger from '../Arbitrage Logic/logging/logger.js';
import config from '../Arbitrage Logic/config/config.js';
import chalk from 'chalk';

class DexScreenerPuppeteerService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.priceData = {
            bid: null,
            ask: null, // Always null for DEX
            timestamp: Date.now(),
            exchangeId: 'dexscreener',
            symbol: 'ETH/USDT',
            error: null,
            isDEX: true
        };

        // Track previous prices to detect changes
        this.previousPrices = {
            bid: null,
            ask: null
        };

        // Load configuration from config file
        this.url = config.dexscreener.url;
        this.updateInterval = config.dexscreener.updateInterval;
        this.selectors = config.dexscreener.selectors;
        this.browserConfig = config.dexscreener.browser;
        this.isDEX = config.dexscreener.isDEX;
    }

    /**
     * Initialize Puppeteer browser and navigate to DexScreener
     */
    async initialize() {
        try {
            if (!config.dexscreener.enabled) {
                console.log('⚠️ DexScreener+ Puppeteer service disabled by config');
                return false;
            }
            console.log('🚀 Initializing DexScreener+ Puppeteer service...');

            // Launch browser with settings from config
            this.browser = await puppeteer.launch(this.browserConfig);

            // Create new page
            this.page = await this.browser.newPage();

            // Set viewport and user agent
            await this.page.setViewport({ width: 1920, height: 1080 });
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Increase default timeouts to handle heavy pages and challenges
            await this.page.setDefaultNavigationTimeout(120000);
            await this.page.setDefaultTimeout(120000);

            // Navigate to DexScreener
            console.log(`🌐 Navigating to DexScreener+: ${this.url}`);
            await this.page.goto(this.url, {
                waitUntil: 'networkidle2',
                timeout: 120000
            });

            // Wait for page to load completely and bypass Cloudflare
            console.log('⏳ Waiting for page to load and bypass Cloudflare...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            // Check if we're still on Cloudflare page
            const pageTitle = await this.page.title();
            if (pageTitle.includes('Just a moment') || pageTitle.includes('Checking your browser')) {
                console.log('🛡️ Cloudflare detected, waiting longer...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            }

            console.log('✅ DexScreener+ Puppeteer service initialized successfully');
            return true;

        } catch (error) {
            console.error(`❌ Failed to initialize DexScreener+ Puppeteer service: ${error.message}`);
            await this.cleanup();
            return false;
        }
    }

    /**
     * Extract bid price data from the page using XPath selector
     * Note: DexScreener is a DEX, so it only has bid prices (no ask prices)
     */
    async extractPrices() {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            if (!config.dexscreener.enabled) {
                return {...this.priceData, bid: null, ask: null, error: null };
            }

            let bidPrice = null;
            
            // Check if page is still loading or blocked by Cloudflare
            const pageTitle = await this.page.title();
            if (pageTitle.includes('Just a moment') || pageTitle.includes('Checking your browser')) {
                console.log('🛡️ Still on Cloudflare page, waiting...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                return {
                    bid: null,
                    ask: null,
                    timestamp: Date.now(),
                    exchangeId: 'dexscreener',
                    symbol: 'ETH/USDT',
                    error: 'Cloudflare protection active',
                    isDEX: true
                };
            }

            // Extract bid price using XPath selector
            if (this.selectors.bidPrice) {
                try {
                    // Try different methods to find the element
                    let bidElement = null;
                    
                    // Method 1: Try XPath with evaluate
                    try {
                        const elements = await this.page.evaluateHandle((xpath) => {
                            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                            return result.snapshotLength > 0 ? result.snapshotItem(0) : null;
                        }, this.selectors.bidPrice);
                        
                        if (elements && !(await elements.evaluate(el => el === null))) {
                            bidElement = elements;
                        }
                    } catch (xpathError) {
                        console.log(`⚠️ XPath method failed: ${xpathError.message}`);
                    }
                    
                    // Method 2: Try CSS selector as fallback
                    if (!bidElement) {
                        try {
                            // Convert XPath to a simpler CSS selector for testing
                            const cssSelector = '[data-testid="price"] span, .price span, span[class*="price"]';
                            bidElement = await this.page.$(cssSelector);
                        } catch (cssError) {
                            console.log(`⚠️ CSS method failed: ${cssError.message}`);
                        }
                    }
                    
                    if (bidElement) {
                        const bidText = await this.page.evaluate(el => el.textContent, bidElement);
                        if (bidText) {
                            // Clean and parse the bid price
                            const cleanedBid = bidText.replace(/[^\d.,]/g, '').replace(',', '.');
                            bidPrice = parseFloat(cleanedBid);
                            
                            if (isNaN(bidPrice)) {
                                throw new Error(`Invalid bid price format: ${bidText}`);
                            }
                        }
                    } else {
                        console.log(`⚠️ No elements found with selector: ${this.selectors.bidPrice}`);
                        
                        // Debug: Let's see what's on the page
                        const pageContent = await this.page.content();
                        console.log(`⚠️ Page title: ${await this.page.title()}`);
                        console.log(`⚠️ Page URL: ${this.page.url()}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Failed to extract bid price: ${error.message}`);
                }
            }

            // Update price data
            const newPriceData = {
                bid: bidPrice,
                ask: null, // DEX has no ask price
                timestamp: Date.now(),
                exchangeId: 'dexscreener',
                symbol: 'ETH/USDT',
                error: null,
                isDEX: true
            };

            // Check if prices have changed
            const hasChanged = this.previousPrices.bid !== bidPrice;
            
            if (hasChanged) {
                this.previousPrices.bid = bidPrice;
                this.priceData = newPriceData;
                
                if (bidPrice !== null) {
                    console.log(`📊 DexScreener+ (DEX): Bid=${chalk.white(FormattingUtils.formatPrice(bidPrice))} | Ask=N/A (DEX) | Time=${new Date().toLocaleTimeString()}`);
                }
            }

            return newPriceData;

        } catch (error) {
            console.error(`❌ Error extracting DexScreener+ prices: ${error.message}`);
            return {
                bid: null,
                ask: null,
                timestamp: Date.now(),
                exchangeId: 'dexscreener',
                symbol: 'ETH/USDT',
                error: error.message,
                isDEX: true
            };
        }
    }

    /**
     * Start continuous price monitoring
     */
    async startMonitoring() {
        if (this.isRunning) {
            console.log('⚠️ DexScreener+ monitoring already running');
            return;
        }

        if (!await this.initialize()) {
            return;
        }

        this.isRunning = true;
        console.log('🔄 Starting DexScreener+ price monitoring...');

        while (this.isRunning && config.dexscreener.enabled) {
            try {
                await this.extractPrices();
                await new Promise(resolve => setTimeout(resolve, this.updateInterval));
            } catch (error) {
                console.error(`❌ DexScreener+ monitoring error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    /**
     * Stop price monitoring
     */
    async stopMonitoring() {
        this.isRunning = false;
        console.log('⏹️ Stopping DexScreener+ price monitoring...');
        await this.cleanup();
    }

    /**
     * Clean up browser resources
     */
    async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        } catch (error) {
            console.error(`❌ Error cleaning up DexScreener+ resources: ${error.message}`);
        }
    }

    /**
     * Get current price data
     */
    getCurrentPrices() {
        return this.priceData;
    }

    /**
     * Check if service is running
     */
    isServiceRunning() {
        return this.isRunning;
    }
}

// Create singleton instance
const dexscreenerPuppeteerService = new DexScreenerPuppeteerService();

export default dexscreenerPuppeteerService;
