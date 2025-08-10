import config from "./config/config.js";

// نگهداری آخرین قیمت‌ها برای مقایسه
const lastProfits = new Map();
async function logPositiveProfit(
  label,
  bidPrice,
  askPrice,
  thresholdPercent = 0.5
) {
  if (bidPrice == null || askPrice == null) {
    return; // قیمت معتبر نیست
  }

  const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

  // if (diffPercent < thresholdPercent) {
  //   // اگر اختلاف کمتر از آستانه است، چاپ نکن
  //   return;
  // }

  console.log(
    `${label}: Bid= ${bidPrice}, Ask= ${askPrice}, Difference: ${diffPercent.toFixed(
      2
    )}%`
  );
}

async function conditionalLogProfit(buy, buyPrice, sell, sellPrice) {
  const key = `${buy}->${sell}`;
  const last = lastProfits.get(key);

  if (!last || last.buyPrice !== buyPrice || last.sellPrice !== sellPrice) {
    await logPositiveProfit(
      `BUY=> ${buy} & SELL=> ${sell}`,
      buyPrice,
      sellPrice,
      config.profitThresholdPercent
    );
    lastProfits.set(key, { buyPrice, sellPrice });
  }
}
export async function getPrice(exchange, symbol) {
  try {
    const ticker = await exchange.fetchTicker(symbol);
    if (ticker.bid != null && ticker.ask != null) {
      return { bid: ticker.bid, ask: ticker.ask };
    }
    // fallback به orderbook اگر bid/ask نیست
    const orderbook = await exchange.fetchOrderBook(symbol);
    const bestAsk = orderbook.asks.length ? orderbook.asks[0][0] : null;
    const bestBid = orderbook.bids.length ? orderbook.bids[0][0] : null;
    return { bid: bestBid, ask: bestAsk };
  } catch (error) {
    console.error(
      `[${exchange.id}] Error fetching price for ${symbol}: ${
        error.message || error
      }`
    );
    return { bid: null, ask: null };
  }
}

function handleError(error, attempt, maxRetries, exchangeId, symbol) {
  if (!error) {
    console.error(`[${exchangeId}] Unknown error for symbol ${symbol}.`);
    return false;
  }

  const statusCode = error.httpStatusCode || error.statusCode || null;

  if (statusCode) {
    switch (statusCode) {
      case 403:
        console.error(
          `[${exchangeId}] Access forbidden (403) for symbol ${symbol}. Check API keys or permissions.`
        );
        return false;
      case 429:
        console.warn(
          `[${exchangeId}] Rate limit exceeded (429) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
        );
        return attempt < maxRetries;
      case 500:
      case 502:
      case 503:
      case 504:
        console.warn(
          `[${exchangeId}] Server error (${statusCode}) for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
        );
        return attempt < maxRetries;
      default:
        console.error(
          `[${exchangeId}] HTTP error (${statusCode}) for symbol ${symbol}: ${
            error.message || error
          }`
        );
        return false;
    }
  }

  if (error.message && error.message.toLowerCase().includes("timeout")) {
    console.warn(
      `[${exchangeId}] Timeout error for symbol ${symbol}. Retry ${attempt} of ${maxRetries}.`
    );
    return attempt < maxRetries;
  }

  console.error(
    `[${exchangeId}] Unexpected error for symbol ${symbol}: ${
      error.message || error
    }`
  );
  return false;
}
export async function printBidAskPairs(symbols, exchanges) {
  const mexcPrice = await getPrice(exchanges.mexc, symbols.mexc);
  const lbankPrice = await getPrice(exchanges.lbank, symbols.lbank);

  console.log(symbols);

  // حالت ۱: خرید از MEXC و فروش به LBank
  await logPositiveProfit(
    "BUY=> MEXC & SELL=> LBank",
    mexcPrice.bid,
    lbankPrice.ask,
    config.profitThresholdPercent
  );

  // حالت ۲: خرید از LBank و فروش به MEXC
  await logPositiveProfit(
    "BUY=> LBank & SELL=> MEXC",
    lbankPrice.bid,
    mexcPrice.ask,
    config.profitThresholdPercent
  );

  console.log("--------------------------------------------------");
}
