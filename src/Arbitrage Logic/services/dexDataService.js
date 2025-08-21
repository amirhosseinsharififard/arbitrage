import axios from 'axios';
import config from '../config/config.js';

class DexDataService {
    constructor() {
        this.sources = {
                    // DexScreener - Free, no API key needed
        dexscreener: {
            baseUrl: 'https://api.dexscreener.com/latest/dex',
            requiresKey: false
        },
            
            // 1inch - Best aggregator, requires API key
            oneinch: {
                baseUrl: 'https://api.1inch.dev/swap/v6.0',
                requiresKey: true,
                chainId: 8453 // Base
            },
            
            // 0x Protocol - Alternative aggregator
            zerox: {
                baseUrl: 'https://api.0x.org',
                requiresKey: true
            },
            
            // ParaSwap - Free, no API key
            paraswap: {
                baseUrl: 'https://apiv5.paraswap.io',
                requiresKey: false
            },
            
            // Jupiter - For Solana
            jupiter: {
                baseUrl: 'https://quote-api.jup.ag/v6',
                requiresKey: false
            }
        };
    }

    /**
     * Get price from DexScreener (current implementation)
     * @param {string} contractAddress - Token contract address
     * @param {string} network - Network name (e.g., 'base', 'bsc', 'solana')
     * @returns {object} Price data
     */
    async getDexScreenerPrice(contractAddress, network = 'base') {
        try {
            // Use pairs endpoint directly for specified network
            let apiUrl = `${this.sources.dexscreener.baseUrl}/pairs/${network}/${contractAddress}`;
            let response = await axios.get(apiUrl, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            let data = response.data;

            let pair = null;
            if (data && data.pairs && data.pairs.length > 0) {
                pair = data.pairs[0];
            } else {
                // Fallback to tokens endpoint
                apiUrl = `${this.sources.dexscreener.baseUrl}/tokens/${contractAddress}`;
                response = await axios.get(apiUrl, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                data = response.data;
                if (data && data.pairs && data.pairs.length > 0) {
                    pair = data.pairs[0];
                }
            }

            if (pair) {
                return {
                    success: true,
                    data: {
                        bid: parseFloat(pair.priceUsd),
                        ask: null, // DEX has no ask price
                        volume24h: parseFloat(pair.volume?.h24 || 0),
                        liquidity: parseFloat(pair.liquidity?.usd || 0),
                        dexId: pair.dexId,
                        pairAddress: pair.pairAddress,
                        timestamp: Date.now()
                    },
                    error: null
                };
            }

            return {
                success: false,
                data: null,
                error: 'No pairs found'
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    }

    /**
     * Get price from 1inch (requires API key)
     * @param {string} contractAddress - Token contract address
     * @param {string} quoteToken - Quote token address (USDC)
     * @returns {object} Price data
     */
    async getOneInchPrice(contractAddress, quoteToken = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
        try {
            const apiKey = process.env.ONEINCH_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    data: null,
                    error: '1inch API key not configured'
                };
            }

            const url = `${this.sources.oneinch.baseUrl}/${this.sources.oneinch.chainId}/quote`;
            const params = {
                src: contractAddress,
                dst: quoteToken,
                amount: '1000000000000000000', // 1 token
                from: '0x0000000000000000000000000000000000000000'
            };

            const response = await axios.get(url, {
                params,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            const data = response.data;
            return {
                success: true,
                data: {
                    bid: parseFloat(data.toTokenAmount) / Math.pow(10, data.toToken.decimals),
                    ask: null,
                    gasEstimate: data.gas,
                    protocols: data.protocols,
                    timestamp: Date.now()
                },
                error: null
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.response?.data?.description || error.message
            };
        }
    }

    /**
     * Get price from ParaSwap (free)
     * @param {string} contractAddress - Token contract address
     * @param {string} quoteToken - Quote token address
     * @returns {object} Price data
     */
    async getParaSwapPrice(contractAddress, quoteToken = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
        try {
            const url = `${this.sources.paraswap.baseUrl}/prices`;
            const params = {
                srcToken: contractAddress,
                destToken: quoteToken,
                amount: '1000000000000000000', // 1 token
                side: 'SELL',
                network: 8453 // Base chain
            };

            const response = await axios.get(url, { params, timeout: 10000 });
            const data = response.data;

            if (data.priceRoute) {
                return {
                    success: true,
                    data: {
                        bid: parseFloat(data.priceRoute.destAmount) / Math.pow(10, 6), // USDC has 6 decimals
                        ask: null,
                        gasEstimate: data.priceRoute.gasCost,
                        exchanges: data.priceRoute.exchanges,
                        timestamp: Date.now()
                    },
                    error: null
                };
            }

            return {
                success: false,
                data: null,
                error: 'No price route found'
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    }

    /**
     * Get aggregated price from multiple sources
     * @param {string} contractAddress - Token contract address
     * @returns {object} Aggregated price data
     */
    async getAggregatedDexPrice(contractAddress) {
        const results = {
            dexscreener: null,
            oneinch: null,
            paraswap: null,
            bestPrice: null,
            sources: []
        };

        // Get DexScreener price (always available)
        const dexScreenerResult = await this.getDexScreenerPrice(contractAddress, 'solana');
        if (dexScreenerResult.success) {
            results.dexscreener = dexScreenerResult.data;
            results.sources.push('dexscreener');
        }

        // Get 1inch price (if API key available)
        const oneInchResult = await this.getOneInchPrice(contractAddress);
        if (oneInchResult.success) {
            results.oneinch = oneInchResult.data;
            results.sources.push('oneinch');
        }

        // Get ParaSwap price (always available)
        const paraSwapResult = await this.getParaSwapPrice(contractAddress);
        if (paraSwapResult.success) {
            results.paraswap = paraSwapResult.data;
            results.sources.push('paraswap');
        }

        // Find best price (highest bid)
        const prices = [
            results.dexscreener?.bid,
            results.oneinch?.bid,
            results.paraswap?.bid
        ].filter(price => price !== null && price !== undefined);

        if (prices.length > 0) {
            results.bestPrice = Math.max(...prices);
        }

        return results;
    }

    /**
     * Get liquidity information for a token
     * @param {string} contractAddress - Token contract address
     * @returns {object} Liquidity data
     */
    async getLiquidityInfo(contractAddress) {
        try {
            const dexScreenerResult = await this.getDexScreenerPrice(contractAddress, 'solana');
            
            if (dexScreenerResult.success) {
                return {
                    success: true,
                    data: {
                        totalLiquidity: dexScreenerResult.data.liquidity,
                        volume24h: dexScreenerResult.data.volume24h,
                        dexId: dexScreenerResult.data.dexId,
                        pairAddress: dexScreenerResult.data.pairAddress
                    },
                    error: null
                };
            }

            return {
                success: false,
                data: null,
                error: 'Could not fetch liquidity info'
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    }

    /**
     * Get all available DEX pairs for a token
     * @param {string} contractAddress - Token contract address
     * @returns {object} All pairs data
     */
    async getAllDexPairs(contractAddress) {
        try {
            const url = `${this.sources.dexscreener.baseUrl}/tokens/${contractAddress}`;
            const response = await axios.get(url, { timeout: 10000 });
            const data = response.data;

            if (data && data.pairs && data.pairs.length > 0) {
                return {
                    success: true,
                    data: data.pairs.map(pair => ({
                        dexId: pair.dexId,
                        pairAddress: pair.pairAddress,
                        priceUsd: parseFloat(pair.priceUsd),
                        liquidity: parseFloat(pair.liquidity?.usd || 0),
                        volume24h: parseFloat(pair.volume?.h24 || 0),
                        baseToken: pair.baseToken.symbol,
                        quoteToken: pair.quoteToken.symbol
                    })),
                    error: null
                };
            }

            return {
                success: false,
                data: null,
                error: 'No pairs found'
            };

        } catch (error) {
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    }
}

const dexDataService = new DexDataService();
export default dexDataService;
