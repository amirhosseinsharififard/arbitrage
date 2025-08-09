import chalk from "chalk";
import { CONFIG } from "../config/constants";
import { appendFileSync } from "fs";

interface SpreadResult {
  spread: number;
  percentDiff: number;
  higherExchange: string;
  lowerExchange: string;
}

export function calculateSpread(price1: number, price2: number): SpreadResult {
  if (typeof price1 !== "number" || typeof price2 !== "number") {
    throw new Error("Prices must be numbers");
  }

  const spread: number = Math.abs(price1 - price2);
  const minPrice: number = Math.min(price1, price2);
  const percentDiff: string =
    minPrice > 0 ? ((spread / minPrice) * 100).toFixed(2) : "0.00";

  return {
    spread: parseFloat(spread.toFixed(8)),
    percentDiff: parseFloat(percentDiff),
    higherExchange: price1 > price2 ? "MEXC" : "LBank",
    lowerExchange: price1 < price2 ? "MEXC" : "LBank",
  };
}

function logToFile(
  mexcPrice: number,
  lbankPrice: number,
  spread: number,
  percentDiff: number
): void {
  const logEntry = `${new Date().toLocaleTimeString()}, mexc: ${mexcPrice}, lbank: ${lbankPrice}, spread:${spread}, percent: ${percentDiff}% \n`;
  appendFileSync("arbitrage_log.csv", logEntry);
}

function printHeader(): void {
  console.log(chalk.blue.bold("\n🔍 Arbitrage Analysis:"));
  console.log(chalk.gray("-".repeat(80)));
}

function printPriceComparison(
  mexcPrice: number,
  lbankPrice: number,
  higherExchange: string,
  lowerExchange: string
): void {
  const maxPrice: number = Math.max(mexcPrice, lbankPrice);
  const minPrice: number = Math.min(mexcPrice, lbankPrice);
  const ratio: number = Math.min(50, Math.floor(50 * (minPrice / maxPrice)));

  console.log(
    `  ${
      higherExchange === "MEXC" ? chalk.red("✖ SELL") : chalk.green("✔ BUY")
    } MEXC: ${chalk.cyan(mexcPrice.toFixed(8))} ${"".repeat(50)}`
  );
  console.log(
    `  ${
      lowerExchange === "LBank" ? chalk.green("✔ BUY") : chalk.red("✖ SELL")
    } LBank: ${chalk.cyan(lbankPrice.toFixed(8))} ${"".repeat(
      ratio
    )}${"".repeat(50 - ratio)}`
  );
}

function printSpreadInfo(spread: number, percentDiff: number): void {
  console.log(chalk.gray("-".repeat(80)));
  console.log(
    `  Spread: ${chalk.yellow(spread.toFixed(8))} | ` +
      `Difference: ${
        percentDiff >= CONFIG.ARBITRAGE_THRESHOLD
          ? chalk.greenBright(`${percentDiff}%`)
          : chalk.gray(`${percentDiff}%`)
      }`
  );
}

function printOpportunity(percentDiff: number): void {
  console.log(chalk.gray("-".repeat(80)));
  if (percentDiff >= CONFIG.ARBITRAGE_THRESHOLD) {
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

export function printResults(
  mexcPrice: number,
  lbankPrice: number,
  spread: number,
  percentDiff: number
): void {
  const { higherExchange, lowerExchange }: SpreadResult = calculateSpread(
    mexcPrice,
    lbankPrice
  );
  logToFile(mexcPrice, lbankPrice, spread, percentDiff);
  printHeader();
  printPriceComparison(mexcPrice, lbankPrice, higherExchange, lowerExchange);
  printSpreadInfo(spread, percentDiff);
  printOpportunity(percentDiff);
}
