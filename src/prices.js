// نگهداری آخرین قیمت‌ها برای مقایسه
const lastProfits = new Map();

async function logPositiveProfit(label, bidPrice, askPrice) {
  if (bidPrice == null || askPrice == null) {
    return; // قیمت‌ها معتبر نیستند، چیزی چاپ نمی‌شود
  }

  const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

  if (diffPercent > 0) {
    console.log(
      `${label}: Bid= ${bidPrice}, Ask= ${askPrice}, Profit opportunity! Difference: ${diffPercent.toFixed(
        2
      )}%`
    );
  }
  // اگر diffPercent صفر یا منفی بود، چیزی چاپ نمی‌شود
}

async function conditionalLogProfit(buy, buyPrice, sell, sellPrice) {
  const key = `${buy}->${sell}`;
  const last = lastProfits.get(key);

  if (!last || last.buyPrice !== buyPrice || last.sellPrice !== sellPrice) {
    await logPositiveProfit(`BUY=> ${buy} & SELL=> ${sell}`, buyPrice, sellPrice);
    lastProfits.set(key, { buyPrice, sellPrice });
  }
}

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

export async function printBidAskPairs(symbols, exchanges) {
  const mexcPrice = await getPrice(exchanges.mexc, symbols.mexc);
  const lbankPrice = await getPrice(exchanges.lbank, symbols.lbank);

  const trades = [
    { buy: "MEXC", buyPrice: mexcPrice.bid, sell: "LBank", sellPrice: lbankPrice.ask },
    { buy: "LBank", buyPrice: lbankPrice.bid, sell: "MEXC", sellPrice: mexcPrice.ask },
  ];

  await Promise.all(
    trades.map(({ buy, buyPrice, sell, sellPrice }) =>
      conditionalLogProfit(buy, buyPrice, sell, sellPrice)
    )
  );
}
