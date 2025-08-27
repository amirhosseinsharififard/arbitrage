import axios from 'axios';
import config from '../config/config.js';

class DexScreenerApiService {
    constructor() {
        // Use official API domain (.com). Token endpoint preferred; pairs as fallback
        this.tokenUrl = 'https://api.dexscreener.com/latest/dex/tokens';
        this.pairsUrlByChain = (chain, address) => `https://api.dexscreener.com/latest/dex/pairs/${chain}/${address}`;
    }

    /**
     * Fetch bid price (DEX) using DexScreener public API
     * @param {string} tokenAddress Token contract address (EVM or Solana)
     * @param {string} network Network name (e.g., 'base', 'bsc', 'ethereum', 'solana')
     * @param {object} options Additional options like pairAddress
     * @returns {{bid:number|null, ask:null, exchangeId:string, symbol:string|null, timestamp:number, isDEX:true, error:string|null}}
     */
    async getBidPriceByToken(tokenAddress, network = 'base', options = {}) {
        try {
            // If pairAddress is provided, use it directly
            if (options.pairAddress) {
                const pairsUrl = `https://api.dexscreener.com/latest/dex/pairs/${network}/${options.pairAddress}`;
                const response = await axios.get(pairsUrl, { timeout: 12000 });
                const data = response.data;

                if (data && Array.isArray(data.pairs) && data.pairs.length > 0) {
                    const pair = data.pairs[0];
                    const priceUsd = Number(pair.priceUsd || pair.price || null);
                    const symbol = pair.baseToken && pair.quoteToken && pair.baseToken.symbol && pair.quoteToken.symbol ?
                        `${pair.baseToken.symbol}/${pair.quoteToken.symbol}` :
                        null;
                    return {
                        bid: Number.isFinite(priceUsd) ? priceUsd : null,
                        ask: null,
                        exchangeId: 'dexscreener',
                        symbol,
                        timestamp: Date.now(),
                        isDEX: true,
                        error: null
                    };
                }
            }

            // Fallback to token endpoint
            const tokenUrl = `${this.tokenUrl}/${tokenAddress}`;
            const response = await axios.get(tokenUrl, { timeout: 12000 });
            const data = response.data;

            if (!data || !Array.isArray(data.pairs) || data.pairs.length === 0) {
                // Fallback: try pairs endpoint with specified network
                try {
                    const pairsResp = await axios.get(this.pairsUrlByChain(network, tokenAddress), { timeout: 12000 });
                    const pdata = pairsResp.data;

                    if (pdata && Array.isArray(pdata.pairs) && pdata.pairs.length > 0) {
                        const pair = pdata.pairs[0];
                        const priceUsd = Number(pair.priceUsd || pair.price || null);
                        const symbol = pair.baseToken && pair.quoteToken && pair.baseToken.symbol && pair.quoteToken.symbol ?
                            `${pair.baseToken.symbol}/${pair.quoteToken.symbol}` :
                            null;
                        return {
                            bid: Number.isFinite(priceUsd) ? priceUsd : null,
                            ask: null,
                            exchangeId: 'dexscreener',
                            symbol,
                            timestamp: Date.now(),
                            isDEX: true,
                            error: null
                        };
                    }
                } catch (e) {
                    // Fall through to error below
                }

                return {
                    bid: null,
                    ask: null,
                    exchangeId: 'dexscreener',
                    symbol: null,
                    timestamp: Date.now(),
                    isDEX: true,
                    error: 'No pairs found for token or pair address'
                };
            }

            // Choose the pair with the highest liquidityUsd if available
            const sorted = [...data.pairs].sort((a, b) => (Number(b.liquidity && b.liquidity.usd || 0) - Number(a.liquidity && a.liquidity.usd || 0)));
            const pair = sorted[0];

            const priceUsd = Number(pair.priceUsd || pair.price || null);
            const symbol = pair.baseToken && pair.quoteToken && pair.baseToken.symbol && pair.quoteToken.symbol ?
                `${pair.baseToken.symbol}/${pair.quoteToken.symbol}` :
                null;

            return {
                bid: Number.isFinite(priceUsd) ? priceUsd : null,
                ask: null,
                exchangeId: 'dexscreener',
                symbol,
                timestamp: Date.now(),
                isDEX: true,
                error: null
            };
        } catch (error) {
            return {
                bid: null,
                ask: null,
                exchangeId: 'dexscreener',
                symbol: null,
                timestamp: Date.now(),
                isDEX: true,
                error: error && error.message || 'Unknown error'
            };
        }
    }
}

const dexscreenerApiService = new DexScreenerApiService();
export default dexscreenerApiService;