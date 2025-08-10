import { getTradingStatus } from "./arbitrage_bot/arbitrage.js";
import fs from "fs/promises";

// Function to display complete system status
export function displayFullStatus() {
    const status = getTradingStatus();

    console.log("\n" + "=".repeat(80));
    console.log("🚀 Complete Arbitrage System Status");
    console.log("=".repeat(80));
    console.log(`🔒 Open Position: ${status.isAnyPositionOpen ? '✅ Yes' : '❌ No'}`);
    console.log(`💰 Total P&L: $${status.totalProfit.toFixed(2)}`);
    console.log(`📈 Total Trades: ${status.totalTrades}`);
    console.log(`📊 Last Trade P&L: $${status.lastTradeProfit.toFixed(2)}`);
    console.log(`🔍 Open Positions Count: ${status.openPositionsCount}`);

    if (status.totalTrades > 0) {
        const avgProfit = status.totalProfit / status.totalTrades;
        console.log(`📊 Average P&L per trade: $${avgProfit.toFixed(2)}`);

        if (status.totalProfit > 0) {
            console.log(`✅ System is profitable`);
        } else if (status.totalProfit < 0) {
            console.log(`⚠️  System is at loss`);
        } else {
            console.log(`➖ System is at break-even`);
        }
    }

    console.log("=".repeat(80));
}

// Function to read and display trade logs
export async function displayTradeLogs(limit = 10) {
    try {
        const logContent = await fs.readFile("trades.log", "utf-8");
        const lines = logContent.trim().split('\n').filter(line => line.trim());

        console.log(`\n📋 Last ${Math.min(limit, lines.length)} trades:`);
        console.log("-".repeat(80));

        const recentLines = lines.slice(-limit);
        for (let i = 0; i < recentLines.length; i++) {
            try {
                const logEntry = JSON.parse(recentLines[i]);
                const timestamp = new Date(logEntry.timestamp).toLocaleString('en-US');
                const action = logEntry.action === 'OPEN' ? '🔓 Opening' : '🔒 Closing';
                const symbol = logEntry.symbol;

                if (logEntry.action === 'OPEN') {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    console.log(`   Buy: ${logEntry.buyExchangeId} @ $${logEntry.buyPrice}`);
                    console.log(`   Sell: ${logEntry.sellExchangeId} @ $${logEntry.sellPrice}`);
                    console.log(`   Difference: ${logEntry.diffPercent}%`);
                } else {
                    console.log(`${action} | ${symbol} | ${timestamp}`);
                    console.log(`   Net P&L: ${logEntry.netProfitPercent}% | $${logEntry.actualProfitUSD}`);
                    console.log(`   Total P&L: $${logEntry.totalProfitUSD}`);
                }
                console.log("");
            } catch (parseError) {
                console.log(`Error processing log: ${parseError.message}`);
            }
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("📋 Trade log file not created yet.");
        } else {
            console.log(`❌ Error reading log: ${error.message}`);
        }
    }
}

// Function to calculate overall statistics
export async function calculateStatistics() {
    try {
        const logContent = await fs.readFile("trades.log", "utf-8");
        const lines = logContent.trim().split('\n').filter(line => line.trim());

        let totalProfit = 0;
        let profitableTrades = 0;
        let losingTrades = 0;
        let totalVolume = 0;

        for (const line of lines) {
            try {
                const logEntry = JSON.parse(line);
                if (logEntry.action === 'CLOSE') {
                    const profit = parseFloat(logEntry.actualProfitUSD);
                    totalProfit += profit;
                    totalVolume += parseFloat(logEntry.volume);

                    if (profit > 0) {
                        profitableTrades++;
                    } else if (profit < 0) {
                        losingTrades++;
                    }
                }
            } catch (parseError) {
                // ignore parse errors
            }
        }

        const totalTrades = profitableTrades + losingTrades;
        const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

        console.log("\n📊 Overall System Statistics:");
        console.log("-".repeat(50));
        console.log(`📈 Total Trades: ${totalTrades}`);
        console.log(`✅ Profitable Trades: ${profitableTrades}`);
        console.log(`❌ Losing Trades: ${losingTrades}`);
        console.log(`📊 Win Rate: ${winRate.toFixed(1)}%`);
        console.log(`💰 Total P&L: $${totalProfit.toFixed(2)}`);
        console.log(`📊 Average P&L per trade: $${totalTrades > 0 ? (totalProfit / totalTrades).toFixed(2) : '0.00'}`);
        console.log(`💵 Total Trade Volume: ${totalVolume.toFixed(6)}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("📊 Trade log file not created yet.");
        } else {
            console.log(`❌ Error calculating statistics: ${error.message}`);
        }
    }
}

export function checkArbitrageOpportunity(bidPrice, askPrice) {
    if (bidPrice == null || askPrice == null) {
        return "Prices are invalid.";
    }

    const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;

    if (diffPercent > 3) {
        return `Good arbitrage opportunity! Difference: ${diffPercent.toFixed(2)}%`;
    } else if (diffPercent > 1) {
        return `Moderate arbitrage opportunity. Difference: ${diffPercent.toFixed(2)}%`;
    } else {
        return `Arbitrage opportunity not favorable. Difference: ${diffPercent.toFixed(2)}%`;
    }
}

// Function to check if prices are valid for arbitrage
export function isValidArbitrage(bidPrice, askPrice, minDifference = 0.5) {
    if (bidPrice == null || askPrice == null) {
        return false;
    }

    const diffPercent = ((bidPrice - askPrice) / askPrice) * 100;
    return diffPercent >= minDifference;
}

// Function to calculate potential profit
export function calculatePotentialProfit(bidPrice, askPrice, volume, fees = 0) {
    if (!isValidArbitrage(bidPrice, askPrice)) {
        return 0;
    }

    const grossProfit = (bidPrice - askPrice) * volume;
    const netProfit = grossProfit - (fees * volume);
    return netProfit;
}