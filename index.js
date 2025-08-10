import ccxt from "ccxt";
import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";
import { retryWrapper } from "./src/error/errorBoundory.js";

async function createExchange(id, options) {
  const exchange = new ccxt[id](options);

  await retryWrapper(exchange.loadMarkets.bind(exchange), [], 3, 1000);

  return exchange;
}

async function startLoop(
  symbols = config.symbols,
  intervalMs = config.intervalMs
) {
  const mexc = await createExchange("mexc", {
    options: { defaultType: "future" },
  });
  const lbank = await createExchange("lbank", {
    options: { defaultType: "future" },
  });

  const exchanges = { mexc, lbank };

  while (true) {
    await printBidAskPairs(symbols, exchanges);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

startLoop();
