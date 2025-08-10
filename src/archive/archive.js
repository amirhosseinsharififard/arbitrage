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

function calculateNetProfitPercent(
  bidPrice,
  askPrice,
  feeBuyPercent,
  feeSellPercent
) {
  const grossProfitPercent = ((bidPrice - askPrice) / askPrice) * 100;
  const totalFeesPercent = feeBuyPercent + feeSellPercent;
  return grossProfitPercent - totalFeesPercent;
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

import { config } from "dotenv";
import fs from "fs/promises";

const openPositions = new Map();
// کلید: symbol
// مقدار: { buyExchange, sellExchange, buyPrice, sellPrice, volume, openTime }
export async function tryOpenPosition(
  symbol,
  buyExchangeId,
  sellExchangeId,
  buyPrice,
  sellPrice
) {
  if (openPositions.has(symbol)) return; // اگه معامله باز هست رد کن

  const diffPercent = ((buyPrice - sellPrice) / sellPrice) * 100;

  if (diffPercent >= config.profitThresholdPercent) {
    const volume = config.tradeVolumeUSD / buyPrice; // تبدیل دلار به حجم کوین

    const position = {
      buyExchangeId,
      sellExchangeId,
      buyPrice,
      sellPrice,
      volume,
      openTime: new Date().toISOString(),
    };

    openPositions.set(symbol, position);

    await logTrade("OPEN", symbol, {
      buyExchangeId,
      sellExchangeId,
      buyPrice,
      sellPrice,
      volume,
      diffPercent: diffPercent.toFixed(3),
    });

    console.log(
      `[OPEN] ${symbol} | Buy@${buyPrice} Sell@${sellPrice} Vol:${volume.toFixed(
        6
      )} Diff:${diffPercent.toFixed(3)}%`
    );
  }
}

export async function tryClosePosition(symbol, buyPriceNow, sellPriceNow) {
  if (!openPositions.has(symbol)) return;

  const position = openPositions.get(symbol);

  const diffPercentNow = ((buyPriceNow - sellPriceNow) / sellPriceNow) * 100;

  if (diffPercentNow <= config.closeThresholdPercent) {
    const grossProfitPercent =
      ((buyPriceNow - position.buyPrice) / position.buyPrice) * 100;

    const totalFees =
      config.feesPercent[position.buyExchangeId] +
      config.feesPercent[position.sellExchangeId];

    const netProfitPercent = grossProfitPercent - totalFees;

    const closeTime = new Date().toISOString();

    const tradeInfo = {
      buyExchangeId: position.buyExchangeId,
      sellExchangeId: position.sellExchangeId,
      openTime: position.openTime,
      closeTime,
      buyPriceOpen: position.buyPrice,
      sellPriceOpen: position.sellPrice,
      buyPriceClose: buyPriceNow,
      sellPriceClose: sellPriceNow,
      volume: position.volume,
      grossProfitPercent: grossProfitPercent.toFixed(3),
      netProfitPercent: netProfitPercent.toFixed(3),
      feesPercent: totalFees.toFixed(3),
      diffPercentNow: diffPercentNow.toFixed(3),
    };

    await logTrade("CLOSE", symbol, tradeInfo);

    openPositions.delete(symbol);

    console.log(
      `[CLOSE] ${symbol} | BuyNow@${buyPriceNow} SellNow@${sellPriceNow} Vol:${position.volume.toFixed(
        6
      )} NetProfit:${netProfitPercent.toFixed(3)}%`
    );
  }
}

export async function logTrade(action, symbol, data) {
  const logEntry = {
    action, // "OPEN" یا "CLOSE"
    symbol,
    timestamp: new Date().toISOString(),
    ...data, // بقیه اطلاعات مثل قیمت، حجم، سود و غیره
  };

  const logLine = JSON.stringify(logEntry) + "\n";

  await fs.appendFile("trades.log", logLine);
}
const config = {
  symbols: {
    mexc: "DEBT/USDT:USDT",
    lbank: "DEBT/USDT:USDT",
  },
  intervalMs: 500,
  profitThresholdPercent: 2, // درصد برای باز کردن معامله
  closeThresholdPercent: 1, // درصد برای بستن معامله
  tradeVolumeUSD: 100, // حجم دلاری برای هر معامله
  feesPercent: {
    mexc: 0.04,
    lbank: 0.05,
  },
};
export default config;
export function checkArbitrageOpportunity(bidPrice, askPrice) {
  if (bidPrice == null || askPrice == null) {
    return "Prices are invalid.";
  }

  const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

  if (diffPercent > 3) {
    return `Good arbitrage opportunity! Difference: ${diffPercent.toFixed(2)}%`;
  } else if (diffPercent > 1) {
    return `Moderate arbitrage opportunity. Difference: ${diffPercent.toFixed(
      2
    )}%`;
  } else {
    return `Arbitrage opportunity not favorable. Difference: ${diffPercent.toFixed(
      2
    )}%`;
  }
}

// async function fetchTickerWithRetry(exchange, symbol, retries = 3, delayMs = 1000) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const ticker = await exchange.fetchTicker(symbol);
//       return ticker;
//     } catch (error) {
//       const shouldRetry = handleError(error, attempt, retries);
//       if (!shouldRetry) throw error;
//       await new Promise(res => setTimeout(res, delayMs));
//     }
//   }
//   throw new Error(`Failed to fetch ticker for ${symbol} from ${exchange.id} after ${retries} retries.`);
// }

// function handleError(error, attempt, maxRetries) {
//   if (!error) {
//     console.error("Unknown error.");
//     return false;
//   }
//   if (error.httpStatusCode) {
//     switch (error.httpStatusCode) {
//       case 403:
//         console.error("Access forbidden (403): Check API keys or permissions.");
//         return false;
//       case 429:
//         console.warn(`Rate limit (429). Retry ${attempt} of ${maxRetries}`);
//         return attempt < maxRetries;
//       case 500:
//       case 502:
//       case 503:
//       case 504:
//         console.warn(`Server error (${error.httpStatusCode}). Retry ${attempt} of ${maxRetries}`);
//         return attempt < maxRetries;
//       default:
//         console.error(`HTTP error (${error.httpStatusCode}): ${error.message || error}`);
//         return false;
//     }
//   }
//   if (error.message && error.message.includes("timeout")) {
//     console.warn(`Timeout error. Retry ${attempt} of ${maxRetries}`);
//     return attempt < maxRetries;
//   }
//   console.error("Unexpected error:", error.message || error);
//   return false;
// }
import ccxt from "ccxt";

export async function createExchanges() {
  const mexc = new ccxt.mexc({ options: { defaultType: "future" } });
  const lbank = new ccxt.lbank({ options: { defaultType: "future" } });

  await mexc.loadMarkets();
  await lbank.loadMarkets();

  return { mexc, lbank };
}
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
