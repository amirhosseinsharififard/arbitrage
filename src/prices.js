import config from "./config/config.js";
import { retryWrapper } from "./error/errorBoundory.js";

// نگهداری آخرین قیمت‌ها برای مقایسه
const lastProfits = new Map();
async function logPositiveProfit(
  label,
  bidPrice,
  askPrice,
  feeBuyPercent,
  feeSellPercent,
  thresholdPercent = 0.5
) {
  if (bidPrice == null || askPrice == null) return;

  const grossProfitPercent = ((bidPrice - askPrice) / askPrice) * 100;
  const totalFeesPercent = feeBuyPercent + feeSellPercent;
  const netProfitPercent = grossProfitPercent - totalFeesPercent;

  // اگر خواستی آستانه رو فعال کنی، این بخش رو uncomment کن
  // if (netProfitPercent < thresholdPercent) {
  //   return;
  // }

  console.log(
    `${label}: Bid= ${bidPrice}, Ask= ${askPrice}, ` +
    `Gross Profit: ${grossProfitPercent.toFixed(2)}%, ` +
    `Fees: ${totalFeesPercent.toFixed(2)}%, ` +
    `Net Profit After Fees: ${netProfitPercent.toFixed(2)}%`
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
    const ticker = await retryWrapper(exchange.fetchTicker.bind(exchange), [symbol], 3, 1000);
    if (ticker.bid != null && ticker.ask != null) {
      return { bid: ticker.bid, ask: ticker.ask };
    }

    const orderbook = await retryWrapper(exchange.fetchOrderBook.bind(exchange), [symbol], 3, 1000);
    const bestAsk = orderbook.asks.length ? orderbook.asks[0][0] : null;
    const bestBid = orderbook.bids.length ? orderbook.bids[0][0] : null;
    return { bid: bestBid, ask: bestAsk };
  } catch (error) {
    console.error(
      `[${exchange.id}] Failed to fetch price for ${symbol} after retries: ${error.message || error}`
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

 await logPositiveProfit(
  "BUY=> MEXC & SELL=> LBank",
  mexcPrice.bid,
  lbankPrice.ask,
  config.feesPercent.mexc,
  config.feesPercent.lbank,
  config.profitThresholdPercent
);

await logPositiveProfit(
  "BUY=> LBank & SELL=> MEXC",
  lbankPrice.bid,
  mexcPrice.ask,
  config.feesPercent.lbank,
  config.feesPercent.mexc,
  config.profitThresholdPercent
);

  console.log("--------------------------------------------------");
}

function calculateNetProfitPercent(bidPrice, askPrice, feeBuyPercent, feeSellPercent) {
  const grossProfitPercent = ((bidPrice - askPrice) / askPrice) * 100;
  const totalFeesPercent = feeBuyPercent + feeSellPercent;
  return grossProfitPercent - totalFeesPercent;
}
