/**
 * Central Data Manager - Enhanced DEX Calculations
 * 
 * این ماژول تمام دیتا و محاسبات را متمرکز می‌کند:
 * 1. یکبار خواندن قیمت‌ها از exchanges
 * 2. محاسبه arbitrage opportunities با ترتیب صحیح DEX
 * 3. ارسال یکسان دیتا به terminal و UI
 * 4. مدیریت cache و بهینه‌سازی
 */

import config from "../config/config.js";
import { lbankPriceService, kcexPuppeteerService, xtPuppeteerService, dexscreenerPuppeteerService, dexscreenerApiService } from "../services/index.js";
import { CalculationUtils, FormattingUtils } from "../utils/index.js";
import exchangeManager from "../exchanges/exchangeManager.js";

class DataManager {
    constructor() {
        // Single source of truth for all data
        this.currentData = {
            exchanges: {},
            arbitrageOpportunities: [],
            timestamp: null,
            isUpdating: false
        };

        // Track previous data for change detection
        this.previousData = {
            lbank: null,
            mexc: null,
            kcex: null,
            xt: null,
            dexscreener: null
        };

        // Track previous comparison results
        this.previousComparisons = new Map();

        // Error tracking
        this.errorMessagesShown = {
            mexc: false,
            kcex: false,
            xt: false,
            lbank: false,
            dexscreener: false
        };

        // Subscribers for data updates
        this.subscribers = [];
    }

    /**
     * Subscribe to data updates
     * @param {function} callback - Function to call when data updates
     */
    subscribe(callback) {
        this.subscribers.push(callback);
    }

    /**
     * Notify all subscribers of data updates
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.currentData);
            } catch (error) {
                console.error('Error notifying subscriber:', error);
            }
        });
    }

    /**
     * Check if data is new (different from previous)
     */
    isNewData(exchangeId, newData) {
        const prev = this.previousData[exchangeId];
        if (!prev) return true;
        
        // For DEX exchanges, only compare bid prices
        if (newData.isDEX) {
            if (newData.bid !== prev.bid) {
                this.previousData[exchangeId] = { ...newData };
                return true;
            }
        } else {
            // For regular exchanges, compare both bid and ask prices
            if (newData.bid !== prev.bid || newData.ask !== prev.ask) {
                this.previousData[exchangeId] = { ...newData };
                return true;
            }
        }
        return false;
    }

    /**
     * Check if comparison result is new
     */
    isNewComparison(key, result) {
        const prev = this.previousComparisons.get(key);
        
        if (!prev || Math.abs(prev - result) > 0.001) {
            this.previousComparisons.set(key, result);
            return true;
        }
        return false;
    }

    /**
     * Fetch all exchange prices - SINGLE DATA FETCH
     */
    async fetchAllExchangeData(symbols) {
        if (this.currentData.isUpdating) {
            return this.currentData; // Return cached data if update in progress
        }

        this.currentData.isUpdating = true;

        try {
            const exchangePromises = [];

            // Fetch LBank data
            if (config.exchanges.lbank && config.exchanges.lbank.enabled !== false) {
                exchangePromises.push(this.fetchLBankData(symbols));
            }

            // Fetch MEXC data
            if (config.exchanges.mexc && config.exchanges.mexc.enabled !== false) {
                exchangePromises.push(this.fetchMEXCData(symbols));
            }

            // Fetch KCEX data
            if (config.kcex.enabled) {
                exchangePromises.push(this.fetchKCEXData());
            }

            // Fetch XT data
            if (config.xt.enabled) {
                exchangePromises.push(this.fetchXTData(symbols));
            }

            // Fetch DexScreener data
            if (config.dexscreener.enabled) {
                exchangePromises.push(this.fetchDexScreenerData(symbols));
            }

            // Wait for all exchanges to fetch data
            const results = await Promise.allSettled(exchangePromises);

            // Update current data
            this.currentData.exchanges = {};
            let hasDataChanged = false;

            // Process results
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const exchangeData = result.value;
                    if (this.isNewData(exchangeData.id, exchangeData)) {
                        hasDataChanged = true;
                    }
                    
                    // Add to current data with normalized format
                    this.currentData.exchanges[exchangeData.id] = {
                        name: exchangeData.name,
                        bid: exchangeData.bid,
                        ask: exchangeData.ask,
                        symbol: 'DEBT/USDT', // Normalize symbol
                        isDEX: exchangeData.isDEX || false,
                        timestamp: exchangeData.timestamp
                    };
                }
            });

            // Only calculate arbitrage opportunities if data changed
            if (hasDataChanged) {
                this.currentData.arbitrageOpportunities = this.calculateArbitrageOpportunities();
                this.currentData.timestamp = Date.now();

                // Notify all subscribers
                this.notifySubscribers();
            }

            return this.currentData;

        } catch (error) {
            console.error('Error fetching exchange data:', error);
            return this.currentData;
        } finally {
            this.currentData.isUpdating = false;
        }
    }

    /**
     * Fetch LBank data
     */
    async fetchLBankData(symbols) {
        try {
            const lbankSymbol = (symbols && symbols.lbank) || (config.symbols && config.symbols.lbank) || 'DAM/USDT:USDT';
            const data = await lbankPriceService.getPrice('lbank', lbankSymbol);
            
            return {
                id: 'lbank',
                name: 'LBank',
                bid: data.bid,
                ask: data.ask,
                timestamp: data.timestamp,
                symbol: data.symbol
            };
        } catch (error) {
            if (!this.errorMessagesShown.lbank) {
                console.log(`⚠️ LBank price fetch failed: ${error.message}`);
                this.errorMessagesShown.lbank = true;
            }
            return null;
        }
    }

    /**
     * Fetch MEXC data
     */
    async fetchMEXCData(symbols) {
        try {
            const mexcSymbol = (symbols && symbols.mexc) || (config.symbols && config.symbols.mexc) || 'ETH/USDT:USDT';
            const data = await exchangeManager.getMexcPrice(mexcSymbol);
            
            return {
                id: 'mexc',
                name: 'MEXC',
                bid: data.bid,
                ask: data.ask,
                timestamp: data.timestamp,
                symbol: data.symbol
            };
        } catch (error) {
            if (!this.errorMessagesShown.mexc) {
                console.log(`⚠️ MEXC futures price fetch failed: ${error.message}`);
                this.errorMessagesShown.mexc = true;
            }
            return null;
        }
    }

    /**
     * Fetch KCEX data
     */
    async fetchKCEXData() {
        try {
            if (!kcexPuppeteerService.browser || !kcexPuppeteerService.page) {
                await kcexPuppeteerService.initialize();
            }
            const data = await kcexPuppeteerService.extractPrices();
            
            return {
                id: 'kcex',
                name: 'KCEX',
                bid: data.bid,
                ask: data.ask,
                timestamp: data.timestamp,
                symbol: data.symbol
            };
        } catch (error) {
            if (!this.errorMessagesShown.kcex) {
                console.log(`⚠️ KCEX price fetch failed: ${error.message}`);
                this.errorMessagesShown.kcex = true;
            }
            return null;
        }
    }

    /**
     * Fetch XT data
     */
    async fetchXTData(symbols) {
        try {
            if (!xtPuppeteerService.browser || !xtPuppeteerService.page) {
                await xtPuppeteerService.initialize();
            }
            const data = await xtPuppeteerService.extractPrices();
            
            return {
                id: 'xt',
                name: 'XT',
                bid: data.bid,
                ask: data.ask,
                timestamp: data.timestamp,
                symbol: data.symbol
            };
        } catch (error) {
            if (!this.errorMessagesShown.xt) {
                console.log(`⚠️ XT price fetch failed: ${error.message}`);
                this.errorMessagesShown.xt = true;
            }
            return null;
        }
    }

    /**
     * Fetch DexScreener data
     */
    async fetchDexScreenerData(symbols) {
        try {
            let data;
            if (config.dexscreener.useApi) {
                data = await dexscreenerApiService.getBidPriceByToken(config.dexscreener.contractAddress, config.dexscreener.network);
            } else {
                if (!dexscreenerPuppeteerService.browser || !dexscreenerPuppeteerService.page) {
                    await dexscreenerPuppeteerService.initialize();
                }
                data = await dexscreenerPuppeteerService.extractPrices();
            }
            
            return {
                id: 'dexscreener',
                name: 'DexScreener',
                bid: data.bid,
                ask: data.ask,
                timestamp: data.timestamp,
                symbol: data.symbol,
                isDEX: true
            };
        } catch (error) {
            if (!this.errorMessagesShown.dexscreener) {
                console.log(`⚠️ DexScreener+ price fetch failed: ${error.message}`);
                this.errorMessagesShown.dexscreener = true;
            }
            return null;
        }
    }

    /**
     * Calculate all arbitrage opportunities - ENHANCED DEX ORDER
     */
    calculateArbitrageOpportunities() {
        const opportunities = [];
        const exchanges = Object.values(this.currentData.exchanges);

        // Compare all exchange pairs with enhanced DEX handling
        for (let i = 0; i < exchanges.length; i++) {
            for (let j = i + 1; j < exchanges.length; j++) {
                const exchangeA = exchanges[i];
                const exchangeB = exchanges[j];

                // Handle DEX exchanges (bid-only)
                if (exchangeA.isDEX && exchangeB.isDEX) {
                    // Both are DEX - skip comparison (no DEX to DEX in terminal)
                    continue;
                } else if (exchangeA.isDEX) {
                    // A is DEX, B is regular exchange
                    // DEX Bid -> Exchange Ask (like terminal: DEX $0.000871 / $0.000868)
                    if (exchangeA.bid != null && exchangeB.ask != null) {
                        const percentage = CalculationUtils.calculatePriceDifference(exchangeB.ask, exchangeA.bid);
                        const key = `${exchangeA.id}-bid-${exchangeB.id}-ask`;
                        
                        if (this.isNewComparison(key, percentage)) {
                            opportunities.push({
                                type: 'DEX',
                                fromExchange: exchangeA.id,
                                toExchange: exchangeB.id,
                                fromPrice: exchangeA.bid,
                                toPrice: exchangeB.ask,
                                percentage: percentage,
                                direction: `DEX ${exchangeA.name}(Bid) -> ${exchangeB.name}(Ask)`,
                                timestamp: Date.now(),
                                order: 2 // Second in DEX order
                            });
                        }
                    }
                } else if (exchangeB.isDEX) {
                    // B is DEX, A is regular exchange
                    // Exchange Bid -> DEX Bid (FIRST: DEX Bid -> Exchange Bid)
                    if (exchangeA.bid != null && exchangeB.bid != null) {
                        const percentage = CalculationUtils.calculatePriceDifference(exchangeB.bid, exchangeA.bid);
                        const key = `${exchangeA.id}-bid-${exchangeB.id}-bid`;
                        
                        if (this.isNewComparison(key, percentage)) {
                            opportunities.push({
                                type: 'DEX',
                                fromExchange: exchangeA.id,
                                toExchange: exchangeB.id,
                                fromPrice: exchangeA.bid,
                                toPrice: exchangeB.bid,
                                percentage: percentage,
                                direction: `${exchangeA.name}(Bid) -> DEX ${exchangeB.name}(Bid)`,
                                timestamp: Date.now(),
                                order: 1 // First in DEX order
                            });
                        }
                    }

                    // Exchange Ask -> DEX Bid (SECOND: DEX Bid -> Exchange Ask)
                    if (exchangeA.ask != null && exchangeB.bid != null) {
                        const percentage = CalculationUtils.calculatePriceDifference(exchangeB.bid, exchangeA.ask);
                        const key = `${exchangeA.id}-ask-${exchangeB.id}-bid`;
                        
                        if (this.isNewComparison(key, percentage)) {
                            opportunities.push({
                                type: 'DEX',
                                fromExchange: exchangeA.id,
                                toExchange: exchangeB.id,
                                fromPrice: exchangeA.ask,
                                toPrice: exchangeB.bid,
                                percentage: percentage,
                                direction: `${exchangeA.name}(Ask) -> DEX ${exchangeB.name}(Bid)`,
                                timestamp: Date.now(),
                                order: 2 // Second in DEX order
                            });
                        }
                    }
                } else {
                    // Both are regular exchanges
                    // A ask -> B bid (like terminal: MEXC(Ask) -> LBANK(Bid))
                    if (exchangeA.ask != null && exchangeB.bid != null) {
                        const percentage = CalculationUtils.calculatePriceDifference(exchangeA.ask, exchangeB.bid);
                        const key = `${exchangeA.id}-ask-${exchangeB.id}-bid`;
                        
                        if (this.isNewComparison(key, percentage)) {
                            opportunities.push({
                                type: 'CEX',
                                fromExchange: exchangeA.id,
                                toExchange: exchangeB.id,
                                fromPrice: exchangeA.ask,
                                toPrice: exchangeB.bid,
                                percentage: percentage,
                                direction: `${exchangeA.name}(Ask) -> ${exchangeB.name}(Bid)`,
                                timestamp: Date.now()
                            });
                        }
                    }

                    // B ask -> A bid (like terminal: LBANK(Ask) -> MEXC(Bid))
                    if (exchangeB.ask != null && exchangeA.bid != null) {
                        const percentage = CalculationUtils.calculatePriceDifference(exchangeB.ask, exchangeA.bid);
                        const key = `${exchangeB.id}-ask-${exchangeA.id}-bid`;
                        
                        if (this.isNewComparison(key, percentage)) {
                            opportunities.push({
                                type: 'CEX',
                                fromExchange: exchangeB.id,
                                toExchange: exchangeA.id,
                                fromPrice: exchangeB.ask,
                                toPrice: exchangeA.bid,
                                percentage: percentage,
                                direction: `${exchangeB.name}(Ask) -> ${exchangeA.name}(Bid)`,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        }

        // Sort opportunities: DEX first (by order), then CEX
        return opportunities.sort((a, b) => {
            if (a.type === 'DEX' && b.type === 'CEX') return -1;
            if (a.type === 'CEX' && b.type === 'DEX') return 1;
            if (a.type === 'DEX' && b.type === 'DEX') {
                return (a.order || 0) - (b.order || 0);
            }
            return 0;
        });
    }

    /**
     * Get current data for terminal display
     */
    getTerminalData() {
        const logLines = [];
        
        // Add timestamp
        logLines.push(`🕐 ${new Date().toLocaleTimeString()}`);
        
        // Add arbitrage opportunities
        this.currentData.arbitrageOpportunities.forEach(opportunity => {
            const emoji = opportunity.type === 'DEX' ? '🟢' : '📈';
            const formattedPercentage = FormattingUtils.formatPercentageColored(opportunity.percentage);
            logLines.push(`${emoji} ${opportunity.direction} => ${formattedPercentage}`);
        });

        return logLines.join('\n');
    }

    /**
     * Get current data for web interface
     */
    getWebInterfaceData() {
        return {
            exchanges: this.currentData.exchanges,
            arbitrageOpportunities: this.currentData.arbitrageOpportunities,
            timestamp: this.currentData.timestamp,
            config: {
                exchanges: Object.keys(this.currentData.exchanges),
                symbol: 'DEBT/USDT'
            }
        };
    }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
