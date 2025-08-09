import { startArbitrageBot } from "./src/services/exchange.service";
import { logger } from "./src/utils/logger";

// اضافه کردن لاگ برای شروع برنامه
logger.info("🚀 Starting Arbitrage Bot Initialization");
logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
logger.info(`Node Version: ${process.version}`);

// اضافه کردن لاگ برای بررسی ماژول‌ها
try {
  logger.info("Checking module dependencies...");
  require.resolve("./src/services/exchange.service");
  require.resolve("./src/utils/logger");
  logger.info("All dependencies loaded successfully");
} catch (e: unknown) {
  logger.error({ message: "Dependency check failed", error: e });
  process.exit(1);
}

// اجرای اصلی بات
(async (): Promise<void> => {
  try {
    logger.info("Initializing arbitrage process...");
    const startTime: number = Date.now();

    await startArbitrageBot();

    const executionTime: number = (Date.now() - startTime) / 1000;
    logger.info(
      `✅ Arbitrage Bot completed successfully in ${executionTime.toFixed(
        2
      )} seconds`
    );
  } catch (error: unknown) {
    logger.error({
      message: "‼️ Critical error in arbitrage process",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString(),
    });

    // اضافه کردن اطلاعات سیستمی برای دیباگ
    logger.info({
      message: "System information",
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });

    process.exit(1);
  }
})();

// اضافه کردن هندلر برای رویدادهای غیرمنتظره
process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>): void => {
    logger.error({ message: "⚠️ Unhandled Rejection", promise, reason });
  }
);

process.on("uncaughtException", (error: Error): void => {
  logger.error({ message: "⚠️ Uncaught Exception", error });
  process.exit(1);
});

// لاگ برای مدیریت خاتمه برنامه
process.on("SIGTERM", (): void => {
  logger.info("🛑 Received SIGTERM. Gracefully shutting down");
  process.exit(0);
});

process.on("SIGINT", (): void => {
  logger.info("🛑 Received SIGINT. Gracefully shutting down");
  process.exit(0);
});
