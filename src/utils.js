export function checkArbitrageOpportunity(bidPrice, askPrice) {
  if (bidPrice == null || askPrice == null) {
    return "Prices are invalid.";
  }

  const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

  if (diffPercent > 3) {
    return `Good arbitrage opportunity! Difference: ${diffPercent.toFixed(2)}%`;
  } else if (diffPercent > 1) {
    return `Moderate arbitrage opportunity. Difference: ${diffPercent.toFixed(2)}%`;
  } else {
    return `Arbitrage opportunity not favorable. Difference: ${diffPercent.toFixed(2)}%`;
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
