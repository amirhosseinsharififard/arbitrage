import ccxt from "ccxt";
import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";

const symbols = {
  mexc: "DEBT/USDT:USDT",
  lbank: "DEBT/USDT:USDT",
};

const exchanges = {
  mexc: new ccxt.mexc({ options: { defaultType: "future" } }),
  lbank: new ccxt.lbank({ options: { defaultType: "future" } }),
};

async function startLoop(
  symbols = config.symbols,
  intervalMs = config.intervalMs
) {
  await exchanges.mexc.loadMarkets();
  await exchanges.lbank.loadMarkets();

  while (true) {
    await printBidAskPairs(symbols, exchanges);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

startLoop();
