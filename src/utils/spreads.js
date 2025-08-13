import { calculatePriceDifference } from './calculations.js';

function safePercent(buy, sell) {
    if (buy == null || sell == null) return null;
    if (typeof buy !== 'number' || typeof sell !== 'number') return null;
    if (buy <= 0 || sell <= 0) return null;
    return calculatePriceDifference(buy, sell);
}

function safeAbs(a, b) {
    if (a == null || b == null) return null;
    if (typeof a !== 'number' || typeof b !== 'number') return null;
    return a - b;
}

export function computeSpreads({ mexcBid, mexcAsk, lbankBid, lbankAsk }) {
    const lbankToMexcProfit = safePercent(lbankAsk, mexcBid);
    const mexcToLbankProfit = safePercent(mexcAsk, lbankBid);
    const mexcBidVsLbankAskPct = safePercent(lbankAsk, mexcBid);
    const lbankBidVsMexcAskPct = safePercent(mexcAsk, lbankBid);
    const mexcAskVsLbankBidPct = safePercent(lbankBid, mexcAsk);
    const mexcBidVsLbankAskAbs = safeAbs(mexcBid, lbankAsk);
    const lbankBidVsMexcAskAbs = safeAbs(lbankBid, mexcAsk);

    return {
        lbankToMexcProfit,
        mexcToLbankProfit,
        mexcBidVsLbankAskPct,
        lbankBidVsMexcAskPct,
        mexcAskVsLbankBidPct,
        mexcBidVsLbankAskAbs,
        lbankBidVsMexcAskAbs
    };
}