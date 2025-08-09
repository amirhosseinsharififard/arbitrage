export async function getPrice(exchange, symbol) {
  try {
    const ticker = await exchange.fetchTicker(symbol);
    if (ticker.bid != null && ticker.ask != null) {
      return { bid: ticker.bid, ask: ticker.ask };
    }
    const orderbook = await exchange.fetchOrderBook(symbol);
    const bestAsk = orderbook.asks.length ? orderbook.asks[0][0] : null;
    const bestBid = orderbook.bids.length ? orderbook.bids[0][0] : null;
    return { bid: bestBid, ask: bestAsk };
  } catch {
    return { bid: null, ask: null };
  }
}

import { checkArbitrageOpportunity } from "./utils.js";

export async function printArbitrageStatus(label, bidPrice, askPrice) {
  const status = checkArbitrageOpportunity(bidPrice, askPrice);
  console.log(`${label}: Bid = ${bidPrice}, Ask = ${askPrice} -> ${status}`);
}

export async function printBidAskPairs(symbols, exchanges) {
  const mexcPrice = await getPrice(exchanges.mexc, symbols.mexc);
  const lbankPrice = await getPrice(exchanges.lbank, symbols.lbank);

  await printArbitrageStatus("Bid from MEXC & Ask from LBank", mexcPrice.bid, lbankPrice.ask);
  await printArbitrageStatus("Bid from LBank & Ask from MEXC", lbankPrice.bid, mexcPrice.ask);
}
