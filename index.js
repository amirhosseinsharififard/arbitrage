import { createExchanges } from "./src/exchanges.js";
import { printBidAskPairs } from "./src/prices.js";

async function main() {
  const exchanges = await createExchanges();

  const symbols = {
    mexc: "DEBT/USDT:USDT",
    lbank: "DEBT/USDT:USDT",
  };

  await printBidAskPairs(symbols, exchanges);
}

main();
