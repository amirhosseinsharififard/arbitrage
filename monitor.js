import { displayFullStatus, displayTradeLogs, calculateStatistics, displaySessionSummary } from "./src/utils.js";

console.log("🔍 Arbitrage System Monitoring");
console.log("=".repeat(50));

// Display current status
displayFullStatus();

// Display overall statistics
await calculateStatistics();

// Display session summary
await displaySessionSummary();

// Display recent trades
await displayTradeLogs(5);

console.log("\n✅ Monitoring completed!");