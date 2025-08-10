import { displayFullStatus, displayTradeLogs, calculateStatistics } from "./src/utils.js";

console.log("🔍 Arbitrage System Monitoring");
console.log("=".repeat(50));

// Display current status
displayFullStatus();

// Display overall statistics
await calculateStatistics();

// Display recent trades
await displayTradeLogs(5);

console.log("\n✅ Monitoring completed!");