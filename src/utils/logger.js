
import chalk from "chalk";

export const logger = {
  info: (message) => console.log(chalk.blue(`ℹ️ ${message}`)),
  success: (message) => console.log(chalk.green(`✅ ${message}`)),
  error: (message) => console.error(chalk.red(`❌ ${message}`)),
  warn: (message) => console.warn(chalk.yellow(`⚠️ ${message}`))
};
