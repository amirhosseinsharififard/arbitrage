const config = {
  symbols: {
    mexc: "DEBT/USDT:USDT",
    lbank: "DEBT/USDT:USDT",
  },
  intervalMs: 500,
  profitThresholdPercent: 2,  // درصد برای باز کردن معامله
  closeThresholdPercent: 1,   // درصد برای بستن معامله
  tradeVolumeUSD: 100,           // حجم دلاری برای هر معامله
  feesPercent: {
    mexc: 0.04,
    lbank: 0.05,
  },
};
export default config;
