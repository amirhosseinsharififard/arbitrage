import { generateProfitLossSummary, displaySessionSummary, writeSummaryToFile, appendSummaryToTradesLog } from "./src/utils.js";

console.log("🧪 Testing Profit/Loss Summary Generation");
console.log("=".repeat(50));

async function testSummary() {
    try {
        // Generate summary from existing trades.log
        console.log("📊 Generating summary from trades.log...");
        const summary = await generateProfitLossSummary();
        
        if (summary) {
            console.log("✅ Summary generated successfully!");
            console.log(`📈 Total Trades: ${summary.sessionStats.totalTrades}`);
            console.log(`💰 Total P&L: $${summary.sessionStats.totalProfit}`);
            
            // Display full summary
            await displaySessionSummary();
            
            // Save to file
            await writeSummaryToFile(summary);
            
            // Append to trades.log
            await appendSummaryToTradesLog(summary);
            
            console.log("\n🎯 Summary operations completed!");
        } else {
            console.log("⚠️  No summary could be generated");
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

// Run the test
testSummary();
