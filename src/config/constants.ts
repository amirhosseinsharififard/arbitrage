interface Exchange {
  URL: string;
  PRICE_SELECTOR: string;
  fee?: number;
}

interface Exchanges {
  MEXC: Exchange;
  LBANK: Exchange;
  fee?: number;
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
    fee: 0.02,
  },
  LBANK: {
    URL: "https://www.lbank.com/futures/debtusdt",
    PRICE_SELECTOR: "span.last-price",
    fee: 0.08,
  },
};

export const CONFIG: Config = {
  CHROME_PATH: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ARBITRAGE_THRESHOLD: 0.5,
  CHECK_INTERVAL: 100, // 0.1 second
};

// GITHUB_TOKEN =
//   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;
