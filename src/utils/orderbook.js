/**
 * Order book processing and analysis utilities
 * 
 * This module provides functions for:
 * 1. Order book data validation and processing
 * 2. Best bid/ask extraction and analysis
 * 3. Volume and liquidity calculations
 * 4. Order book depth analysis
 * 5. Market impact estimation
 * 
 * All functions handle edge cases and provide safe defaults
 * for missing or invalid order book data.
 */

/**
 * Extract best bid and ask from order book data
 * 
 * Safely extracts the best (highest) bid and best (lowest) ask
 * from order book data. Handles missing or malformed data gracefully.
 * 
 * @param {object} orderBook - Order book object with bids and asks arrays
 * @returns {object} Object containing bestBid and bestAsk with price and amount
 */
export function getBestBidAsk(orderBook) {
    if (!orderBook || typeof orderBook !== 'object') {
        return { bestBid: null, bestAsk: null };
    }

    // Extract best bid (highest price)
    let bestBid = null;
    if (Array.isArray(orderBook.bids) && orderBook.bids.length > 0) {
        // Bids are typically sorted by price descending, so first entry is best
        const bid = orderBook.bids[0];
        if (Array.isArray(bid) && bid.length >= 2) {
            bestBid = {
                price: parseFloat(bid[0]),
                amount: parseFloat(bid[1])
            };
        }
    }

    // Extract best ask (lowest price)
    let bestAsk = null;
    if (Array.isArray(orderBook.asks) && orderBook.asks.length > 0) {
        // Asks are typically sorted by price ascending, so first entry is best
        const ask = orderBook.asks[0];
        if (Array.isArray(ask) && ask.length >= 2) {
            bestAsk = {
                price: parseFloat(ask[0]),
                amount: parseFloat(ask[1])
            };
        }
    }

    return { bestBid, bestAsk };
}

/**
 * Calculate order book spread
 * 
 * Calculates the difference between best ask and best bid prices.
 * Returns null if either price is unavailable.
 * 
 * @param {object} orderBook - Order book object
 * @returns {number|null} Spread in price units, or null if unavailable
 */
export function calculateSpread(orderBook) {
    const { bestBid, bestAsk } = getBestBidAsk(orderBook);

    if (!bestBid || !bestAsk) {
        return null;
    }

    return bestAsk.price - bestBid.price;
}

/**
 * Calculate order book spread percentage
 * 
 * Calculates the spread as a percentage of the mid-price.
 * Useful for comparing spreads across different assets.
 * 
 * @param {object} orderBook - Order book object
 * @returns {number|null} Spread as percentage, or null if unavailable
 */
export function calculateSpreadPercentage(orderBook) {
    const { bestBid, bestAsk } = getBestBidAsk(orderBook);

    if (!bestBid || !bestAsk) {
        return null;
    }

    const midPrice = (bestBid.price + bestAsk.price) / 2;
    const spread = bestAsk.price - bestBid.price;

    return (spread / midPrice) * 100;
}

/**
 * Calculate total volume at a specific price level
 * 
 * Sums up all volume available at a given price level.
 * Useful for understanding liquidity at specific prices.
 * 
 * @param {object} orderBook - Order book object
 * @param {number} price - Target price level
 * @param {string} side - 'bids' or 'asks'
 * @returns {number} Total volume at the specified price
 */
export function getVolumeAtPrice(orderBook, price, side) {
    if (!orderBook || !Array.isArray(orderBook[side])) {
        return 0;
    }

    let totalVolume = 0;
    const tolerance = 0.000001; // Small tolerance for price matching

    for (const order of orderBook[side]) {
        if (Array.isArray(order) && order.length >= 2) {
            const orderPrice = parseFloat(order[0]);
            const orderAmount = parseFloat(order[1]);

            // Check if price matches within tolerance
            if (Math.abs(orderPrice - price) < tolerance) {
                totalVolume += orderAmount;
            }
        }
    }

    return totalVolume;
}

/**
 * Calculate cumulative volume up to a specific price
 * 
 * Sums up all volume from the best price up to a target price.
 * Useful for understanding market depth and liquidity.
 * 
 * @param {object} orderBook - Order book object
 * @param {number} targetPrice - Target price level
 * @param {string} side - 'bids' or 'asks'
 * @returns {number} Cumulative volume up to the target price
 */
export function getCumulativeVolume(orderBook, targetPrice, side) {
    if (!orderBook || !Array.isArray(orderBook[side])) {
        return 0;
    }

    let cumulativeVolume = 0;

    for (const order of orderBook[side]) {
        if (Array.isArray(order) && order.length >= 2) {
            const orderPrice = parseFloat(order[0]);
            const orderAmount = parseFloat(order[1]);

            // For bids: include if price >= targetPrice (buying up to target)
            // For asks: include if price <= targetPrice (selling down to target)
            if (side === 'bids' && orderPrice >= targetPrice) {
                cumulativeVolume += orderAmount;
            } else if (side === 'asks' && orderPrice <= targetPrice) {
                cumulativeVolume += orderAmount;
            }
        }
    }

    return cumulativeVolume;
}

/**
 * Estimate market impact of a trade
 * 
 * Estimates how much a trade of given size would impact the market price.
 * Uses order book depth to calculate price slippage.
 * 
 * @param {object} orderBook - Order book object
 * @param {number} tradeSize - Size of the trade
 * @param {string} side - 'bids' (buying) or 'asks' (selling)
 * @returns {object} Object containing estimated price and impact
 */
export function estimateMarketImpact(orderBook, tradeSize, side) {
    if (!orderBook || !Array.isArray(orderBook[side]) || tradeSize <= 0) {
        return { estimatedPrice: null, impact: null };
    }

    let remainingSize = tradeSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const order of orderBook[side]) {
        if (Array.isArray(order) && order.length >= 2) {
            const orderPrice = parseFloat(order[0]);
            const orderAmount = parseFloat(order[1]);

            const fillAmount = Math.min(remainingSize, orderAmount);
            totalCost += fillAmount * orderPrice;
            weightedPrice += fillAmount;

            remainingSize -= fillAmount;

            if (remainingSize <= 0) {
                break;
            }
        }
    }

    if (weightedPrice === 0) {
        return { estimatedPrice: null, impact: null };
    }

    const averagePrice = totalCost / weightedPrice;
    const { bestBid, bestAsk } = getBestBidAsk(orderBook);

    let impact = null;
    if (side === 'bids' && bestAsk) {
        // For buying: impact is how much price increases
        impact = ((averagePrice - bestAsk.price) / bestAsk.price) * 100;
    } else if (side === 'asks' && bestBid) {
        // For selling: impact is how much price decreases
        impact = ((bestBid.price - averagePrice) / bestBid.price) * 100;
    }

    return {
        estimatedPrice: averagePrice,
        impact: impact,
        remainingSize: Math.max(0, remainingSize)
    };
}

/**
 * Get order book depth summary
 * 
 * Provides a summary of order book depth at different price levels.
 * Useful for understanding market liquidity distribution.
 * 
 * @param {object} orderBook - Order book object
 * @param {number} levels - Number of price levels to analyze
 * @returns {object} Object containing depth analysis for both sides
 */
export function getOrderBookDepth(orderBook, levels = 5) {
    if (!orderBook) {
        return { bids: [], asks: [] };
    }

    const result = {
        bids: [],
        asks: []
    };

    // Analyze bid side
    if (Array.isArray(orderBook.bids)) {
        for (let i = 0; i < Math.min(levels, orderBook.bids.length); i++) {
            const bid = orderBook.bids[i];
            if (Array.isArray(bid) && bid.length >= 2) {
                result.bids.push({
                    price: parseFloat(bid[0]),
                    amount: parseFloat(bid[1]),
                    cumulative: getCumulativeVolume(orderBook, parseFloat(bid[0]), 'bids')
                });
            }
        }
    }

    // Analyze ask side
    if (Array.isArray(orderBook.asks)) {
        for (let i = 0; i < Math.min(levels, orderBook.asks.length); i++) {
            const ask = orderBook.asks[i];
            if (Array.isArray(ask) && ask.length >= 2) {
                result.asks.push({
                    price: parseFloat(ask[0]),
                    amount: parseFloat(ask[1]),
                    cumulative: getCumulativeVolume(orderBook, parseFloat(ask[0]), 'asks')
                });
            }
        }
    }

    return result;
}