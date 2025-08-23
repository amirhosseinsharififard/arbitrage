/**
 * Puppeteer Logic for KCEX Exchange Integration
 * 
 * This module handles web scraping of KCEX exchange using Puppeteer
 * to extract real-time price data from the web interface.
 * 
 * Features:
 * - Automated browser control for price extraction
 * - XPath-based element selection for buy/sell prices
 * - 100ms interval price updates
 * - Error handling and retry logic
 * - Integration with existing arbitrage system
 */

import puppeteer from 'puppeteer';
import { FormattingUtils } from '../Arbitrage Logic/utils/index.js';
import logger from '../Arbitrage Logic/logging/logger.js';
import config from '../Arbitrage Logic/config/config.js';

class KCEXPuppeteerService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.priceData = {
            bid: null,
            ask: null,
            timestamp: Date.now(),
            exchangeId: 'kcex',
            symbol: 'BTC/USDT',
            error: null
        };

        // Track previous prices to detect changes
        this.previousPrices = {
            bid: null,
            ask: null
        };

        // Load configuration from config file
        this.url = config.kcex.url;
        this.updateInterval = config.kcex.updateInterval;
        this.selectors = config.kcex.selectors;
        this.browserConfig = config.kcex.browser;
        
        // Dynamic config for multi-currency support
        this.currentConfig = null;
    }

    /**
     * Set dynamic configuration for multi-currency support
     */
    setConfig(currencyConfig) {
        this.currentConfig = currencyConfig;
        if (currencyConfig && currencyConfig.exchanges && currencyConfig.exchanges.kcex) {
            const kcexConfig = currencyConfig.exchanges.kcex;
            this.url = kcexConfig.url || config.kcex.url;
            this.selectors = kcexConfig.selectors || config.kcex.selectors;
            this.updateInterval = kcexConfig.updateInterval || config.kcex.updateInterval;
            this.browserConfig = kcexConfig.browser || config.kcex.browser;
            
            // Update symbol in URL
            if (this.url && kcexConfig.symbol) {
                this.url = this.url.replace('{SYMBOL}', kcexConfig.symbol);
            }
        }
    }

    /**
     * Initialize Puppeteer browser and navigate to KCEX
     */
    async initialize() {
        try {
            if (!config.kcex.enabled) {
                console.log('⚠️ KCEX Puppeteer service disabled by config');
                return false;
            }
            console.log('🚀 Initializing KCEX Puppeteer service...');

            // Launch browser with settings from config
            this.browser = await puppeteer.launch(this.browserConfig);

            // Create new page
            this.page = await this.browser.newPage();

            // Set viewport and user agent
            await this.page.setViewport({ width: 1920, height: 1080 });
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Increase default timeouts to handle heavy pages and potential challenges
            await this.page.setDefaultNavigationTimeout(120000);
            await this.page.setDefaultTimeout(120000);

            // Navigate to KCEX exchange
            console.log(`🌐 Navigating to KCEX: ${this.url}`);
            await this.page.goto(this.url, {
                waitUntil: 'domcontentloaded',
                timeout: 120000
            });

            // Wait for page to load completely
            await new Promise(resolve => setTimeout(resolve, 5000));

            console.log('✅ KCEX Puppeteer service initialized successfully');
            return true;

        } catch (error) {
            console.error(`❌ Failed to initialize KCEX Puppeteer service: ${error.message}`);
            await this.cleanup();
            return false;
        }
    }

    /**
     * Extract price data from the page using XPath selectors
     */
    async extractPrices() {
        try {
            if (!this.page) {
                throw new Error('Page not initialized');
            }
            if (!config.kcex.enabled) {
                return {...this.priceData, bid: null, ask: null, error: null };
            }

            // Extract bid price
            const bidText = await this.page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, this.selectors.bidPrice);
            const bidPrice = this.parsePrice(bidText);

            // Extract ask price
            const askText = await this.page.evaluate((xpath) => {
                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                return element ? element.textContent : null;
            }, this.selectors.askPrice);
            const askPrice = this.parsePrice(askText);

            // Check if prices have changed
            const pricesChanged = (this.previousPrices.bid !== bidPrice || this.previousPrices.ask !== askPrice);

            // Update price data
            this.priceData = {
                bid: bidPrice,
                ask: askPrice,
                timestamp: Date.now(),
                exchangeId: 'kcex',
                symbol: 'BTC/USDT',
                error: null
            };

            // Log only if prices have changed and verbose mode
            if (bidPrice && askPrice && pricesChanged) {
                if (config.logSettings && config.logSettings.enableDetailedLogging && !(config.display && config.display.conciseOutput)) {
                    console.log(`${FormattingUtils.label('KCEX')} Bid=${FormattingUtils.formatPrice(bidPrice)} | Ask=${FormattingUtils.formatPrice(askPrice)}`);
                }
                // Update previous prices
                this.previousPrices.bid = bidPrice;
                this.previousPrices.ask = askPrice;
            }

            return this.priceData;

        } catch (error) {
            console.error(`❌ Failed to extract prices from KCEX: ${error.message}`);
            this.priceData.error = error.message;
            return this.priceData;
        }
    }

    /**
     * Parse price string to number
     */
    parsePrice(priceText) {
        if (!priceText) return null;

        // Remove any non-numeric characters except decimal point
        const cleanPrice = priceText.toString().replace(/[^\d.]/g, '');
        const price = parseFloat(cleanPrice);

        return isNaN(price) ? null : price;
    }

    /**
     * Start continuous price monitoring
     */
    async startPriceMonitoring() {
        if (this.isRunning) {
            console.log('⚠️ Price monitoring already running');
            return;
        }
        if (!config.kcex.enabled) {
            console.log('⚠️ KCEX monitoring skipped (disabled)');
            return;
        }

        this.isRunning = true;
        console.log(`🔄 Starting KCEX price monitoring (${this.updateInterval}ms interval)`);

        while (this.isRunning) {
            try {
                await this.extractPrices();
                await new Promise(resolve => setTimeout(resolve, this.updateInterval));
            } catch (error) {
                console.error(`❌ Error in price monitoring loop: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            }
        }
    }

    /**
     * Stop price monitoring
     */
    stopPriceMonitoring() {
        this.isRunning = false;
        console.log('⏹️ Stopped KCEX price monitoring');
    }

    /**
     * Get current price data
     */
    getCurrentPrices() {
        return this.priceData;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            this.stopPriceMonitoring();

            if (this.page) {
                await this.page.close();
                this.page = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            console.log('🧹 KCEX Puppeteer service cleaned up');
        } catch (error) {
            console.error(`❌ Error during cleanup: ${error.message}`);
        }
    }

    /**
     * Check if service is healthy
     */
    isHealthy() {
        if (!config.kcex.enabled) return true;
        return this.browser && this.page && !this.priceData.error;
    }
}

// Create singleton instance
const kcexPuppeteerService = new KCEXPuppeteerService();

export default kcexPuppeteerService;