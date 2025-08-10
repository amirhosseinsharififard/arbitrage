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
