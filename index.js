import ccxt from "ccxt";
import { printBidAskPairs } from "./src/prices.js";
import config from "./src/config/config.js";
import { retryWrapper } from "./src/error/errorBoundory.js";

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

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
    try {
      await printBidAskPairs(symbols, exchanges);
    } catch (error) {
      console.error(`Error in main loop: ${error.message || error}`);
      console.log(`Waiting 5 seconds before retrying...`);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

startLoop();
