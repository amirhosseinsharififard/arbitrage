/**
 * Multi-Currency Configuration for Dynamic Arbitrage System
 * Supports multiple currencies with exchange-specific configurations.
 *
 * URL templates support placeholders:
 * - {SYMBOL}: combined pair symbol (e.g., AIOT_USDT or AIOT)
 * - {BASE}: base currency (e.g., AIOT)
 * - {QUOTE}: quote currency (e.g., USDT)
 *
 * You can override `url`, `selectors`, and other fields per-currency under
 * each `exchanges[exchangeId]` entry without changing application logic.
 */

// Base exchange configurations
const baseExchangeConfigs = {
    mexc: {
        id: "mexc",
        enabled: true,
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000,
        feesPercent: 0
    },
    lbank: {
        id: "lbank",
        enabled: true,
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000,
        feesPercent: 0
    },
    ourbit: {
        enabled: true,
        feesPercent: 0,
        url: "https://futures.ourbit.com/fa-IR/exchange/{SYMBOL}?type=linear_swap",
        updateInterval: 100,
        selectors: {
            bidPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[1]/div[1]/div[14]/div[1]/span",
            askPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span"
        },
        browser: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    },
    xt: {
        enabled: false,
        feesPercent: 0,
        url: "https://www.xt.com/en/futures/trade/{SYMBOL}_usdt",
        updateInterval: 100,
        selectors: {
            bidPrice: "/html/body/div[1]/div/div[3]/div/div[1]/div[4]/div[1]/div[3]/div[3]/div/div[1]/div/div[1]",
            askPrice: "/html/body/div[1]/div/div[3]/div/div[1]/div[4]/div[1]/div[3]/div[1]/div/div[10]/div/div[1]"
        },
        browser: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    },
    kcex: {
        enabled: true,
        feesPercent: 0,
        url: "https://www.kcex.com/futures/exchange/{SYMBOL}_USDT",
        updateInterval: 100,
        selectors: {
            bidPrice: "/html/body/div[2]/section/div[1]/div[6]/div[2]/div/div/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span",
            askPrice: "/html/body/div[2]/section/div[1]/div[6]/div[2]/div/div/div[2]/div[2]/div[1]/div[1]/div[14]/div[1]/span"
        },
        browser: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    }
};

// DEX configurations
const dexConfigs = {
    dexscreener: {
        enabled: true,
        feesPercent: 0,
        useApi: true,
        updateInterval: 100,
        browser: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        },
        isDEX: true
    }
};

// Currency definitions with exchange-specific symbols and configurations
const currencies = {
    // AIOT: {
    //     name: "AIOT",
    //     baseCurrency: "AIOT",
    //     quoteCurrency: "USDT",
    //     exchanges: {
    //         mexc: {
    //             symbol: "AIOT/USDT:USDT",
    //             enabled: true
    //         },
    //         lbank: {
    //             symbol: "AIOT/USDT:USDT",
    //             enabled: true
    //         },
    //         ourbit: {
    //             symbol: "AIOT_USDT",
    //             enabled: true,
    //             url: "https://futures.ourbit.com/fa-IR/exchange/AIOT_USDT?type=linear_swap"
    //         },
    //         xt: {
    //             symbol: "AIOT",
    //             enabled: false,
    //             url: "https://www.xt.com/en/futures/trade/AIOT_usdt"
    //         },
    //         kcex: {
    //             symbol: "AIOT",
    //             enabled: false,
    //             url: "https://www.kcex.com/futures/exchange/AIOT_USDT"
    //         }
    //     },
    //     dex: {
    //         dexscreener: {
    //             enabled: true,
    //             contractAddress: "0xb433ae7e7011a2fb9a4bbb86140e0f653dcfcfba",
    //             network: "bsc",
    //             symbol: "AIOT/USDT",
    //             url: "https://dexscreener.com/bsc/0xb433ae7e7011a2fb9a4bbb86140e0f653dcfcfba",
    //             selectors: {
    //                 bidPrice: "//*[@id=\"root\"]/div/main/div/div/div[1]/div/div/div[2]/div/div[1]/div[1]/div[1]/span[2]/div",
    //                 askPrice: null
    //             }
    //         }
    //     },
    //     trading: {
    //         profitThresholdPercent: 3.1,
    //         closeThresholdPercent: 2.5,
    //         tradeVolumeUSD: 200,
    //         targetTokenQuantity: 5000,
    //         maxTokenQuantity: 35000
    //     }
    // },

    DEBT: {
        name: "DEBT",
        baseCurrency: "DEBT",
        quoteCurrency: "USDT",
        exchanges: {
            mexc: {
                symbol: "DEBT/USDT:USDT",
                enabled: true
            },
            lbank: {
                symbol: "DEBT/USDT:USDT",
                enabled: true
            },
            ourbit: {
                symbol: "DEBT_USDT",
                enabled: true,
                url: "https://futures.ourbit.com/fa-IR/exchange/DEBT_USDT?type=linear_swap"
            },
            xt: {
                symbol: "DEBT",
                enabled: true,
                url: "https://www.xt.com/en/futures/trade/DEBT_usdt"
            },
            kcex: {
                symbol: "DEBT",
                enabled: true,
                url: "https://www.kcex.com/futures/exchange/DEBT_USDT"
            }
        },
        dex: {
            dexscreener: {
                enabled: true,
                contractAddress: "9qppy1kxrtfeewkfaysyhd7eu9glg5pgxdlkdl51p7ex",
                network: "solana",
                symbol: "DEBT/USDT",
                url: "https://dexscreener.com/solana/9qppy1kxrtfeewkfaysyhd7eu9glg5pgxdlkdl51p7ex",
                selectors: {
                    bidPrice: "//*[@id=\"root\"]/div/main/div/div/div[1]/div/div/div[2]/div/div[1]/div[1]/div[1]/span[2]/div",
                    askPrice: null
                }
            }
        },
        trading: {
            profitThresholdPercent: 3.1,
            closeThresholdPercent: 2.5,
            tradeVolumeUSD: 200,
            targetTokenQuantity: 5000,
            maxTokenQuantity: 35000
        }
    },

    ALT: {
        name: "ALT",
        baseCurrency: "ALT",
        quoteCurrency: "USDT",
        exchanges: {
            mexc: {
                symbol: "ALTCOIN/USDT:USDT",
                enabled: true
            },
            lbank: {
                symbol: "ALTSOL/USDT:USDT",
                enabled: true
            },
            ourbit: {
                symbol: "ALT_USDT",
                enabled: false // Disabled for now as it was set to BSU in original config
            },
            xt: {
                symbol: "ALT",
                enabled: false // Disabled for now as it was set to BSU in original config
            },
            kcex: {
                symbol: "ALTCOIN",
                enabled: true,
                url: "https://www.kcex.com/futures/exchange/ALTCOIN_USDT",
                updateInterval: 100,
                selectors: {
                    bidPrice: "/html/body/div[2]/section/div[1]/div[6]/div[2]/div/div/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span",
                    askPrice: "/html/body/div[2]/section/div[1]/div[6]/div[2]/div/div/div[2]/div[2]/div[1]/div[1]/div[14]/div[1]/span"
                }
            }
        },
        dex: {
            dexscreener: {
                enabled: true,
                contractAddress: "bjgbpydarmcgj7crwm623nrjf2gplkpsswwnsjxubtpg",
                network: "solana",
                symbol: "ALT/SOL",
                url: "https://dexscreener.com/solana/bjgbpydarmcgj7crwm623nrjf2gplkpsswwnsjxubtpg",
                selectors: {
                    bidPrice: "//*[@id=\"root\"]/div/main/div/div/div[1]/div/div/div[2]/div/div[1]/div[1]/div[1]/span[2]/div",
                    askPrice: null
                }
            }
        },
        trading: {
            profitThresholdPercent: 3.1,
            closeThresholdPercent: 2.5,
            tradeVolumeUSD: 200,
            targetTokenQuantity: 5000,
            maxTokenQuantity: 35000
        }
    }
};

// System configuration
const systemConfig = {
    intervalMs: 50,
    statusUpdateInterval: 2000,
    retryDelayMs: 2000,
    tradingMode: "TOKEN",
    maxTrades: 0,
    logSettings: {
        maxRecentTrades: 500,
        summaryUpdateInterval: 20,
        enableDetailedLogging: false,
        logFile: "trades.log",
        summaryFile: "session_summary.txt",
        clearOnStartup: true,
        preserveLogs: false,
        preserveSummary: false,
        printSummaryToConsole: true,
        printStatusToConsole: true,
        requestLogFile: "requests.log",
        loggableActions: ["ARBITRAGE_OPEN", "ARBITRAGE_CLOSE"],
        excludeActions: ["PRICE_ORDERBOOK", "PRICE_ERROR", "PRICE_UPDATE"]
    },
    arbitrage: {
        minDifference: 0.5,
        enableVolumeValidation: true,
        enableFeeCalculation: true,
        enablBSUresholdFiltering: false,
        defaultThresholdPercent: 0.5,
        useOrderBookVolume: false
    },
    errorHandling: {
        maxRetries: 3,
        defaultRetryDelay: 1000,
        enableErrorLogging: true,
        logLevel: "info"
    },
    cache: {
        statisticsTimeout: 5000,
        priceCacheTimeout: 1000,
        maxCacheSize: 100
    },
    display: {
        decimalPlaces: {
            price: 6,
            percentage: 3,
            currency: 2,
            volume: 6
        },
        enableEmojis: true,
        enableColor: true,
        separatorLength: 60,
        conciseOutput: true
    },
    paths: {
        logs: "./",
        exports: "./exports/",
        temp: "./temp/"
    },
    performance: {
        enableBatchProcessing: true,
        maxConcurrentRequests: 5,
        requestTimeout: 30000,
        enableCompression: false
    }
};

/**
 * Get configuration for a specific currency
 * @param {string} currencyCode - The currency code (e.g., 'AIOT', 'BSU', 'BTC')
 * @returns {object} Complete configuration for the currency
 */
export function getCurrencyConfig(currencyCode) {
    const currency = currencies[currencyCode];
    if (!currency) {
        throw new Error(`Currency ${currencyCode} not found in configuration`);
    }

    // Merge base exchange configs with currency-specific configs
    const mergedExchanges = {};
    Object.keys(baseExchangeConfigs).forEach(exchangeId => {
        const baseConfig = baseExchangeConfigs[exchangeId];
        const currencyExchangeConfig = currency.exchanges[exchangeId];

        if (currencyExchangeConfig && currencyExchangeConfig.enabled) {
            const merged = {
                ...baseConfig,
                ...currencyExchangeConfig // currency-specific settings override base
            };
            // Resolve URL template placeholders if present
            if (merged.url) {
                const symbolForUrl = currencyExchangeConfig.symbol || merged.symbol || currency.baseCurrency;
                merged.url = merged.url
                    .replaceAll('{SYMBOL}', symbolForUrl)
                    .replaceAll('{BASE}', currency.baseCurrency)
                    .replaceAll('{QUOTE}', currency.quoteCurrency);
            }
            mergedExchanges[exchangeId] = merged;
        }
    });

    // Merge DEX configs
    const mergedDex = {};
    Object.keys(dexConfigs).forEach(dexId => {
        const baseDexConfig = dexConfigs[dexId];
        const currencyDexConfig = currency.dex[dexId];

        if (currencyDexConfig && currencyDexConfig.enabled) {
            mergedDex[dexId] = {
                ...baseDexConfig,
                ...currencyDexConfig
            };
        }
    });

    return {
        ...systemConfig,
        currency: currency,
        symbols: {
            ...Object.fromEntries(
                Object.entries(mergedExchanges).map(([exchangeId, config]) => [exchangeId, config.symbol])
            ),
            ...Object.fromEntries(
                Object.entries(mergedDex).map(([dexId, config]) => [dexId, config.symbol])
            )
        },
        exchanges: mergedExchanges,
        dex: mergedDex,
        profitThresholdPercent: currency.trading.profitThresholdPercent,
        closeThresholdPercent: currency.trading.closeThresholdPercent,
        tradeVolumeUSD: currency.trading.tradeVolumeUSD,
        targetTokenQuantity: currency.trading.targetTokenQuantity,
        maxTokenQuantity: currency.trading.maxTokenQuantity,
        feesPercent: {
            ...Object.fromEntries(
                Object.entries(mergedExchanges).map(([exchangeId, config]) => [exchangeId, config.feesPercent])
            ),
            ...Object.fromEntries(
                Object.entries(mergedDex).map(([dexId, config]) => [dexId, config.feesPercent])
            )
        }
    };
}

/**
 * Get all available currencies
 * @returns {Array} Array of currency codes
 */
export function getAvailableCurrencies() {
    return Object.keys(currencies);
}

/**
 * Get all enabled exchanges for a currency
 * @param {string} currencyCode - The currency code
 * @returns {Array} Array of enabled exchange IDs
 */
export function getEnabledExchanges(currencyCode) {
    const config = getCurrencyConfig(currencyCode);
    const enabledExchanges = [];

    Object.entries(config.exchanges).forEach(([exchangeId, exchangeConfig]) => {
        if (exchangeConfig.enabled) {
            enabledExchanges.push(exchangeId);
        }
    });

    Object.entries(config.dex).forEach(([dexId, dexConfig]) => {
        if (dexConfig.enabled) {
            enabledExchanges.push(dexId);
        }
    });

    return enabledExchanges;
}

/**
 * Add a new currency to the configuration
 * @param {string} currencyCode - The currency code
 * @param {object} currencyConfig - The currency configuration
 */
export function addCurrency(currencyCode, currencyConfig) {
    currencies[currencyCode] = currencyConfig;
}

/**
 * Remove a currency from the configuration
 * @param {string} currencyCode - The currency code
 */
export function removeCurrency(currencyCode) {
    delete currencies[currencyCode];
}

export default {
    getCurrencyConfig,
    getAvailableCurrencies,
    getEnabledExchanges,
    addCurrency,
    removeCurrency,
    currencies,
    baseExchangeConfigs,
    dexConfigs,
    systemConfig
};