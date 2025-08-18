/**
 * Script to check available symbols on LBank exchange
 */

import ccxt from "ccxt";

async function checkLbankSymbols() {
    console.log("🔍 Checking LBank available symbols...");
    console.log("=".repeat(50));

    try {
        // Create LBank exchange instance
        const lbank = new ccxt.lbank({ defaultType: "spot" });
        
        // Load markets
        console.log("Loading LBank markets...");
        await lbank.loadMarkets();
        
        console.log("✅ LBank markets loaded successfully");
        console.log(`Total markets: ${Object.keys(lbank.markets).length}`);
        
        // Look for DAM-related symbols
        console.log("\n🔍 Searching for DAM-related symbols...");
        const damSymbols = Object.keys(lbank.markets).filter(symbol => 
            symbol.includes('DAM') || symbol.includes('dam')
        );
        
        if (damSymbols.length > 0) {
            console.log("✅ Found DAM-related symbols:");
            damSymbols.forEach(symbol => {
                console.log(`   - ${symbol}`);
            });
        } else {
            console.log("❌ No DAM-related symbols found");
        }
        
        // Look for USDT pairs
        console.log("\n🔍 Searching for USDT pairs...");
        const usdtSymbols = Object.keys(lbank.markets).filter(symbol => 
            symbol.includes('USDT')
        ).slice(0, 20); // Show first 20
        
        if (usdtSymbols.length > 0) {
            console.log("✅ Found USDT pairs (showing first 20):");
            usdtSymbols.forEach(symbol => {
                console.log(`   - ${symbol}`);
            });
        }
        
        // Check if there are any symbols with similar structure
        console.log("\n🔍 Checking symbol structure...");
        const sampleSymbols = Object.keys(lbank.markets).slice(0, 10);
        console.log("Sample symbols:");
        sampleSymbols.forEach(symbol => {
            console.log(`   - ${symbol}`);
        });
        
    } catch (error) {
        console.error("❌ Error checking LBank symbols:");
        console.error(`   Error: ${error.message}`);
    }
}

// Run the check
checkLbankSymbols().catch(console.error);
