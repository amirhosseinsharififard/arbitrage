import chalk from "chalk";
import { CONFIG } from "../config/constants.js";

export function calculateSpread(price1, price2) {
  if (typeof price1 !== "number" || typeof price2 !== "number") {
    throw new Error("Prices must be numbers");
  }

  const spread = Math.abs(price1 - price2);
  const minPrice = Math.min(price1, price2);
  const percentDiff =
    minPrice > 0 ? ((spread / minPrice) * 100).toFixed(2) : "0.00";

  return {
    spread: parseFloat(spread.toFixed(8)),
    percentDiff: parseFloat(percentDiff),
    higherExchange: price1 > price2 ? "MEXC" : "LBank",
    lowerExchange: price1 < price2 ? "MEXC" : "LBank"
  };
}

export function printResults(mexcPrice, lbankPrice, spread, percentDiff) {
  const { higherExchange, lowerExchange } = calculateSpread(mexcPrice, lbankPrice);

  // Header
  console.log(chalk.blue.bold("\n🔍 Arbitrage Analysis:"));
  console.log(chalk.gray("-".repeat(80)));

  // Price comparison visualization
  const maxPrice = Math.max(mexcPrice, lbankPrice);
  const minPrice = Math.min(mexcPrice, lbankPrice);
  const ratio = Math.min(50, Math.floor(50 * (minPrice / maxPrice)));

  console.log(
    `  ${higherExchange === "MEXC" ? chalk.red("✖ SELL") : chalk.green("✔ BUY")} MEXC: ${chalk.cyan(mexcPrice.toFixed(8))} ${"".repeat(50)}`
  );
  console.log(
    `  ${lowerExchange === "LBank" ? chalk.green("✔ BUY") : chalk.red("✖ SELL")} LBank: ${chalk.cyan(lbankPrice.toFixed(8))} ${"".repeat(ratio)}${"".repeat(50 - ratio)}`
  );

  // Spread info
  console.log(chalk.gray("-".repeat(80)));
  console.log(
    `  Spread: ${chalk.yellow(spread.toFixed(8))} | ` +
    `Difference: ${
      percentDiff >= CONFIG.ARBITRAGE_THRESHOLD
        ? chalk.greenBright(`${percentDiff}%`)
        : chalk.gray(`${percentDiff}%`)
    }`
  );

  // Arbitrage opportunity
  console.log(chalk.gray("-".repeat(80)));
  if (parseFloat(percentDiff) >= CONFIG.ARBITRAGE_THRESHOLD) {
    console.log(chalk.greenBright.bold("  ✅ ARBITRAGE OPPORTUNITY DETECTED!"));
    console.log(chalk.green(`  Potential profit margin: ${percentDiff}%`));
  } else {
    console.log(chalk.gray("  ⚠️ No significant arbitrage opportunity"));
    console.log(
      chalk.gray(
        `  Current difference: ${percentDiff}% (Threshold: ${CONFIG.ARBITRAGE_THRESHOLD}%)`
      )
    );
  }
  console.log(chalk.gray("-".repeat(80) + "\n"));
}
