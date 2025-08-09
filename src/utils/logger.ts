import chalk from "chalk";

export const logger = {
  info: (message: string | object): void => {
    console.log(
      chalk.blue(
        `ℹ️ ${typeof message === "string" ? message : JSON.stringify(message)}`
      )
    );
  },
  success: (message: string | object): void => {
    console.log(
      chalk.green(
        `✅ ${typeof message === "string" ? message : JSON.stringify(message)}`
      )
    );
  },
  error: (message: string | object): void => {
    console.error(
      chalk.red(
        `❌ ${typeof message === "string" ? message : JSON.stringify(message)}`
      )
    );
  },
  warn: (message: string | object): void => {
    console.warn(
      chalk.yellow(
        `⚠️ ${typeof message === "string" ? message : JSON.stringify(message)}`
      )
    );
  },
};
