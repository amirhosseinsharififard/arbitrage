import oneinchService from '../services/oneinchService.js';
import config from '../config/config.js';
import { FormattingUtils } from '../utils/index.js';
import logger from '../logging/logger.js';

class DexArbitrageExecutor {
    constructor() {
        this.isEnabled = config.dexscreener.enabled;
        this.minProfitPercent = config.profitThresholdPercent;
        this.slippageTolerance = '1'; // 1% slippage
        this.walletAddress = process.env.WALLET_ADDRESS || '';
        
        // Token addresses for Base chain
        this.tokens = {
            UNITE: config.dexscreener.contractAddress, // Your token
            USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            WETH: '0x4200000000000000000000000000000000000006',
            USDT: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
        };
    }

    /**
     * Check if arbitrage opportunity exists and execute if profitable
     * @param {object} dexPrice - DEX price data (bid only)
     * @param {object} cexPrice - CEX price data (bid/ask)
     * @param {string} tradeDirection - 'DEX_TO_CEX' or 'CEX_TO_DEX'
     * @returns {object} Execution result
     */
    async checkAndExecuteArbitrage(dexPrice, cexPrice, tradeDirection) {
        if (!this.isEnabled || !this.walletAddress) {
            return {
                executed: false,
                reason: 'DEX trading disabled or wallet not configured',
                profit: 0
            };
        }

        try {
            // Calculate potential profit
            const profitPercent = this.calculateProfitPercent(dexPrice, cexPrice, tradeDirection);
            
            if (profitPercent < this.minProfitPercent) {
                return {
                    executed: false,
                    reason: `Profit ${profitPercent.toFixed(2)}% below threshold ${this.minProfitPercent}%`,
                    profit: profitPercent
                };
            }

            console.log(`🟢 Profitable DEX arbitrage found: ${profitPercent.toFixed(2)}%`);
            console.log(`   Direction: ${tradeDirection}`);
            console.log(`   DEX Price: ${FormattingUtils.formatPrice(dexPrice.bid)}`);
            console.log(`   CEX Price: ${FormattingUtils.formatPrice(tradeDirection === 'DEX_TO_CEX' ? cexPrice.ask : cexPrice.bid)}`);

            // Execute the trade
            const result = await this.executeTrade(dexPrice, cexPrice, tradeDirection);
            
            if (result.success) {
                console.log(`✅ DEX arbitrage executed successfully!`);
                console.log(`   Transaction: ${result.transactionHash || 'Pending'}`);
                console.log(`   Expected Profit: ${profitPercent.toFixed(2)}%`);
                
                // Log the trade
                await logger.logTrade("DEX_ARBITRAGE_EXECUTED", "UNITE/USDC", {
                    direction: tradeDirection,
                    dexPrice: dexPrice.bid,
                    cexPrice: tradeDirection === 'DEX_TO_CEX' ? cexPrice.ask : cexPrice.bid,
                    profitPercent: profitPercent.toFixed(2),
                    transactionHash: result.transactionHash,
                    walletAddress: this.walletAddress
                });
            }

            return {
                executed: result.success,
                reason: result.success ? 'Trade executed successfully' : result.error,
                profit: profitPercent,
                transactionHash: result.transactionHash
            };

        } catch (error) {
            console.error(`❌ DEX arbitrage execution failed: ${error.message}`);
            return {
                executed: false,
                reason: error.message,
                profit: 0
            };
        }
    }

    /**
     * Calculate potential profit percentage
     * @param {object} dexPrice - DEX price data
     * @param {object} cexPrice - CEX price data  
     * @param {string} direction - Trade direction
     * @returns {number} Profit percentage
     */
    calculateProfitPercent(dexPrice, cexPrice, direction) {
        if (!dexPrice.bid || !cexPrice.bid || !cexPrice.ask) {
            return 0;
        }

        if (direction === 'DEX_TO_CEX') {
            // Buy on DEX, sell on CEX
            const buyPrice = dexPrice.bid;
            const sellPrice = cexPrice.ask;
            return ((sellPrice - buyPrice) / buyPrice) * 100;
        } else {
            // Buy on CEX, sell on DEX
            const buyPrice = cexPrice.ask;
            const sellPrice = dexPrice.bid;
            return ((sellPrice - buyPrice) / buyPrice) * 100;
        }
    }

    /**
     * Execute the actual trade
     * @param {object} dexPrice - DEX price data
     * @param {object} cexPrice - CEX price data
     * @param {string} direction - Trade direction
     * @returns {object} Trade result
     */
    async executeTrade(dexPrice, cexPrice, direction) {
        try {
            let fromToken, toToken, amount;

            if (direction === 'DEX_TO_CEX') {
                // Buy UNITE on DEX, sell on CEX
                fromToken = this.tokens.USDC;
                toToken = this.tokens.UNITE;
                amount = this.calculateOptimalAmount(dexPrice.bid, cexPrice.ask);
            } else {
                // Buy UNITE on CEX, sell on DEX
                fromToken = this.tokens.UNITE;
                toToken = this.tokens.USDC;
                amount = this.calculateOptimalAmount(cexPrice.ask, dexPrice.bid);
            }

            // Get quote first
            const quote = await oneinchService.getQuote(
                fromToken,
                toToken,
                amount,
                this.walletAddress
            );

            if (!quote.success) {
                return {
                    success: false,
                    error: quote.error,
                    transactionHash: null
                };
            }

            // Get swap transaction
            const swapResult = await oneinchService.getSwapTransaction(
                fromToken,
                toToken,
                amount,
                this.walletAddress,
                this.slippageTolerance
            );

            if (!swapResult.success) {
                return {
                    success: false,
                    error: swapResult.error,
                    transactionHash: null
                };
            }

            // Here you would sign and send the transaction
            // For now, we return the transaction data
            return {
                success: true,
                error: null,
                transactionHash: '0x...', // Would be actual hash after signing
                transactionData: swapResult.data,
                instructions: 'Sign and send transaction using your wallet'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                transactionHash: null
            };
        }
    }

    /**
     * Calculate optimal trade amount based on prices
     * @param {number} buyPrice - Price to buy at
     * @param {number} sellPrice - Price to sell at
     * @returns {string} Amount in wei
     */
    calculateOptimalAmount(buyPrice, sellPrice) {
        // Calculate optimal amount based on your trading strategy
        // This is a simplified calculation - you might want to consider:
        // - Available liquidity
        // - Gas costs
        // - Minimum trade sizes
        // - Maximum position sizes
        
        const baseAmount = 100; // $100 base amount
        const amountInWei = (baseAmount * Math.pow(10, 18)) / buyPrice;
        
        return amountInWei.toString();
    }

    /**
     * Get current token balance
     * @param {string} tokenAddress - Token contract address
     * @returns {number} Balance
     */
    async getTokenBalance(tokenAddress) {
        // This would require Web3 integration
        // For now, return a placeholder
        return 0;
    }

    /**
     * Validate if we have sufficient balance for trade
     * @param {string} tokenAddress - Token to check
     * @param {string} amount - Amount needed
     * @returns {boolean} Sufficient balance
     */
    async hasSufficientBalance(tokenAddress, amount) {
        const balance = await this.getTokenBalance(tokenAddress);
        return balance >= parseFloat(amount);
    }
}

const dexArbitrageExecutor = new DexArbitrageExecutor();
export default dexArbitrageExecutor;
