
import chalk from "chalk";
import { CONFIG } from "../config/constants.js";

export function calculateSpread(price1, price2) {
  const spread = Math.abs(price1 - price2);
  const minPrice = Math.min(price1, price2);
  const percentDiff = ((spread / minPrice) * 100).toFixed(2);
  return { spread, percentDiff };
}

export function printResults(mexcPrice, lbankPrice, spread, percentDiff) {
  const mexcColor = mexcPrice > lbankPrice ? chalk.red : chalk.green;
  const lbankColor = lbankPrice > mexcPrice ? chalk.red : chalk.green;

  console.log(
    `DEBT_USDT => MEXC Price: ${mexcColor(mexcPrice)} | LBank Price: ${lbankColor(lbankPrice)} | 📊 Diff: ${percentDiff}% | 📉 Spread: ${spread} | `
  );

  if (parseFloat(percentDiff) < CONFIG.ARBITRAGE_THRESHOLD) {
    console.log(chalk.gray(" Price difference is less than 0.5% – not profitable."));
  } else {
    console.log(chalk.greenBright(" Arbitrage opportunity detected!"));
  }
}
