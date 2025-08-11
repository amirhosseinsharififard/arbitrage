/**
 * Utilities for working with order books, including executable volume calculation
 */

export function calculateExecutableBaseQuantity({ buyBestAsk, sellBestBid, desiredUsdNotional }) {
    if (!buyBestAsk || !sellBestBid || !buyBestAsk.price || !sellBestBid.price) return 0;
    const maxPrice = Math.max(buyBestAsk.price, sellBestBid.price);
    const desiredQty = desiredUsdNotional / maxPrice;
    return Math.max(0, Math.min(desiredQty, buyBestAsk.amount ? ? 0, sellBestBid.amount ? ? 0));
}

export function snapshotTopOfBook(orderbook) {
    return {
        bestBid: orderbook ? .bids && orderbook.bids[0] ? { price: orderbook.bids[0][0], amount: orderbook.bids[0][1] } : null,
        bestAsk: orderbook ? .asks && orderbook.asks[0] ? { price: orderbook.asks[0][0], amount: orderbook.asks[0][1] } : null
    };
}