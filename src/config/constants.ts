interface Exchange {
  URL: string;
  PRICE_SELECTOR: string;
}

interface Exchanges {
  MEXC: Exchange;
  LBANK: Exchange;
}

interface Config {
  CHROME_PATH: string;
  ARBITRAGE_THRESHOLD: number;
  CHECK_INTERVAL: number;
}

export const EXCHANGES: Exchanges = {
  MEXC: {
    URL: "https://www.mexc.com/futures/DEBT_USDT",
    PRICE_SELECTOR: "span.market_bigPrice__dC4As",
  },
  LBANK: {
    URL: "https://www.lbank.com/futures/debtusdt",
    PRICE_SELECTOR: "span.last-price",
  },
};

export const CONFIG: Config = {
  CHROME_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ARBITRAGE_THRESHOLD: 0.005,
  CHECK_INTERVAL: 100, // 0.1 second
};
