import { startArbitrageBot } from "./src/services/exchange.service.js";
import { logger } from "./src/utils/logger.js";

try {
  logger.info("Starting Arbitrage Bot...");
  await startArbitrageBot();
} catch (error) {
  logger.error("Fatal error in application:", error);
  process.exit(1);
}
