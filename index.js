import { startArbitrageBot } from "./src/services/exchange.service.js";
import { logger } from "./src/utils/logger.js";

// اضافه کردن لاگ برای شروع برنامه
logger.info("🚀 Starting Arbitrage Bot Initialization");
logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
logger.info(`Node Version: ${process.version}`);

// اضافه کردن لاگ برای بررسی ماژول‌ها
try {
  logger.info("Checking module dependencies...");
  require.resolve("./src/services/exchange.service.js");
  require.resolve("./src/utils/logger.js");
  logger.info("All dependencies loaded successfully");
} catch (e) {
  logger.error("Dependency check failed:", e);
  process.exit(1);
}

// اجرای اصلی بات
(async () => {
  try {
    logger.info("Initializing arbitrage process...");
    const startTime = Date.now();

    await startArbitrageBot();

    const executionTime = (Date.now() - startTime) / 1000;
    logger.info(
      `✅ Arbitrage Bot completed successfully in ${executionTime.toFixed(
        2
      )} seconds`
    );
  } catch (error) {
    logger.error("‼️ Critical error in arbitrage process", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // اضافه کردن اطلاعات سیستمی برای دیباگ
    logger.info("System information:", {
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    });

    process.exit(1);
  }
})();

// اضافه کردن هندلر برای رویدادهای غیرمنتظره
process.on("unhandledRejection", (reason, promise) => {
  logger.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("⚠️ Uncaught Exception:", error);
  process.exit(1);
});

// لاگ برای مدیریت خاتمه برنامه
process.on("SIGTERM", () => {
  logger.info("🛑 Received SIGTERM. Gracefully shutting down");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("🛑 Received SIGINT. Gracefully shutting down");
  process.exit(0);
});
