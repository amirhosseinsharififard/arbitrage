const config = {
    symbols: {
        mexc: "DEBT/USDT:USDT",
        lbank: "DEBT/USDT:USDT",
    },
    intervalMs: 500,
    profitThresholdPercent: 2, // Percentage threshold for opening a trade
    closeThresholdPercent: 1, // Percentage threshold for closing a trade
    tradeVolumeUSD: 100, // Dollar volume for each trade
    maxTrades: 10, // Maximum number of trades (0 = unlimited)
    maxLossPercent: -5, // Maximum allowed loss percentage
    feesPercent: {
        mexc: 0.04,
        lbank: 0.05,
    },
};
export default config;