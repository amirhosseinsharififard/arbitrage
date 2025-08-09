import ccxt from "ccxt";
import { printBidAskPairs } from "./src/prices.js";

const symbols = {
  mexc: "DEBT/USDT:USDT",
  lbank: "DEBT/USDT:USDT",
};

const exchanges = {
  mexc: new ccxt.mexc({ options: { defaultType: "future" } }),
  lbank: new ccxt.lbank({ options: { defaultType: "future" } }),
};

async function startLoop(intervalMs = 100) {
  await exchanges.mexc.loadMarkets();
  await exchanges.lbank.loadMarkets();

  while (true) {
    await printBidAskPairs(symbols, exchanges);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

startLoop();
