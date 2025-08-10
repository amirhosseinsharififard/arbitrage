import { generateProfitLossSummary, writeSummaryToFile, appendSummaryToTradesLog, displaySessionSummary } from "./src/utils.js";

// Function to handle program exit and generate summary
async function handleExit() {
    console.log("\n🔄 Generating session summary before exit...");
    
    try {
        // Generate comprehensive summary
        const summary = await generateProfitLossSummary();
        
        if (summary) {
            // Display summary in console
            await displaySessionSummary();
            
            // Save to separate file
            await writeSummaryToFile(summary);
            
            // Append to trades.log
            await appendSummaryToTradesLog(summary);
            
            console.log("✅ Session summary completed successfully!");
        } else {
            console.log("⚠️  No trades found to summarize");
        }
    } catch (error) {
        console.log(`❌ Error generating exit summary: ${error.message}`);
    }
    
    console.log("👋 Goodbye!");
    process.exit(0);
}

// Set up exit handlers
process.on('SIGINT', handleExit);  // Ctrl+C
process.on('SIGTERM', handleExit); // Termination signal
process.on('exit', handleExit);     // Normal exit

// Export the function for manual use
export { handleExit };

console.log("📊 Exit summary handler initialized - will generate summary on program exit");
