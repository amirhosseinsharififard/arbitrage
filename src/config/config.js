const config = {
  symbols: {
    mexc: "DEBT/USDT:USDT",
    lbank: "DEBT/USDT:USDT",
  },
  intervalMs: 500,
  profitThresholdPercent: 0.5,
  feesPercent: {
    mexc: 0.04, // مثلا 0.04 درصد کارمزد
    lbank: 0.05, // مثلا 0.05 درصد کارمزد
  },
};
export default config;
