import axios from 'axios';
import config from '../config/config.js';

class OneInchService {
    constructor() {
        // 1inch API v6.0 - Base chain
        this.baseUrl = 'https://api.1inch.dev/swap/v6.0';
        this.chainId = 8453; // Base chain ID
        this.apiKey = process.env.ONEINCH_API_KEY || ''; // Add to .env file
        
        // Common token addresses on Base
        this.tokens = {
            USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            WETH: '0x4200000000000000000000000000000000000006',
            USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
        };
    }

    /**
     * Get swap quote from 1inch
     * @param {string} fromToken - Source token address
     * @param {string} toToken - Destination token address  
     * @param {string} amount - Amount in wei (with decimals)
     * @param {string} walletAddress - User wallet address
     * @returns {object} Quote data
     */
    async getQuote(fromToken, toToken, amount, walletAddress) {
        try {
            if (!this.apiKey) {
                throw new Error('1inch API key not configured. Add ONEINCH_API_KEY to .env file');
            }

            const url = `${this.baseUrl}/${this.chainId}/quote`;
            const params = {
                src: fromToken,
                dst: toToken,
                amount: amount,
                from: walletAddress,
                includeTokensInfo: true,
                includeGas: true
            };

            const response = await axios.get(url, {
                params,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
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
     * Get swap transaction data
     * @param {string} fromToken - Source token address
     * @param {string} toToken - Destination token address
     * @param {string} amount - Amount in wei
     * @param {string} walletAddress - User wallet address
     * @param {string} slippage - Slippage tolerance (default: 1%)
     * @returns {object} Transaction data
     */
    async getSwapTransaction(fromToken, toToken, amount, walletAddress, slippage = '1') {
        try {
            if (!this.apiKey) {
                throw new Error('1inch API key not configured');
            }

            const url = `${this.baseUrl}/${this.chainId}/swap`;
            const params = {
                src: fromToken,
                dst: toToken,
                amount: amount,
                from: walletAddress,
                slippage: slippage,
                includeTokensInfo: true,
                includeGas: true
            };

            const response = await axios.get(url, {
                params,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
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
     * Get token list for Base chain
     * @returns {object} Token list
     */
    async getTokens() {
        try {
            const url = `${this.baseUrl}/${this.chainId}/tokens`;
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                data: response.data,
                error: null
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
     * Get token price in USD
     * @param {string} tokenAddress - Token contract address
     * @returns {number|null} Price in USD
     */
    async getTokenPrice(tokenAddress) {
        try {
            const quote = await this.getQuote(
                tokenAddress,
                this.tokens.USDC,
                '1000000000000000000', // 1 token (18 decimals)
                '0x0000000000000000000000000000000000000000' // Dummy address
            );

            if (quote.success && quote.data) {
                return parseFloat(quote.data.toTokenAmount) / Math.pow(10, quote.data.toToken.decimals);
            }

            return null;

        } catch (error) {
            console.error('Error getting token price:', error.message);
            return null;
        }
    }

    /**
     * Execute arbitrage trade on DEX
     * @param {string} buyToken - Token to buy
     * @param {string} sellToken - Token to sell  
     * @param {string} amount - Amount to trade
     * @param {string} walletAddress - User wallet
     * @param {string} slippage - Slippage tolerance
     * @returns {object} Trade result
     */
    async executeArbitrageTrade(buyToken, sellToken, amount, walletAddress, slippage = '1') {
        try {
            // Get swap transaction data
            const swapData = await this.getSwapTransaction(
                sellToken,
                buyToken,
                amount,
                walletAddress,
                slippage
            );

            if (!swapData.success) {
                return {
                    success: false,
                    error: swapData.error,
                    transaction: null
                };
            }

            // Here you would sign and send the transaction
            // For now, we return the transaction data
            return {
                success: true,
                error: null,
                transaction: swapData.data,
                instructions: 'Sign and send transaction using your wallet'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                transaction: null
            };
        }
    }
}

const oneinchService = new OneInchService();
export default oneinchService;
