export function checkArbitrageOpportunity(bidPrice, askPrice) {
  if (bidPrice == null || askPrice == null) {
    return "Prices are invalid.";
  }

  const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

  if (diffPercent > 3) {
    return `Good arbitrage opportunity! Difference: ${diffPercent.toFixed(2)}%`;
  } else if (diffPercent > 1) {
    return `Moderate arbitrage opportunity. Difference: ${diffPercent.toFixed(2)}%`;
  } else {
    return `Arbitrage opportunity not favorable. Difference: ${diffPercent.toFixed(2)}%`;
  }
}
