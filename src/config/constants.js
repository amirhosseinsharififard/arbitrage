
export const EXCHANGES = {
  MEXC: {
    URL: "https://www.mexc.com/futures/DEBT_USDT",
    PRICE_SELECTOR: "span.market_bigPrice__dC4As"
  },
  LBANK: {
    URL: "https://www.lbank.com/futures/debtusdt",
    PRICE_SELECTOR: "span.last-price"
  }
};

export const CONFIG = {
  CHROME_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ARBITRAGE_THRESHOLD: 0.5,
  CHECK_INTERVAL: 1000 // 1 second
};
