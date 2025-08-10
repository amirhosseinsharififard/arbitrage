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

// Function to generate comprehensive profit/loss summary
export async function generateProfitLossSummary() {
    try {
        const logContent = await fs.readFile("trades.log", "utf-8");
        const lines = logContent.trim().split('\n').filter(line => line.trim());

        let totalProfit = 0;
        let profitableTrades = 0;
        let losingTrades = 0;
        let totalVolume = 0;
        let totalFees = 0;
        let bestTrade = { profit: -Infinity, tradeNumber: 0 };
        let worstTrade = { profit: 0, tradeNumber: 0 };
        let totalTrades = 0;

        for (const line of lines) {
            try {
                const logEntry = JSON.parse(line);
                if (logEntry.action === 'CLOSE') {
                    const profit = parseFloat(logEntry.actualProfitUSD);
                    totalProfit += profit;
                    totalVolume += parseFloat(logEntry.volume);
                    totalFees += parseFloat(logEntry.feesPercent) * parseFloat(logEntry.volume) * parseFloat(logEntry.buyPriceOpen) / 100;
                    totalTrades++;

                    if (profit > 0) {
                        profitableTrades++;
                        if (profit > bestTrade.profit) {
                            bestTrade = { profit, tradeNumber: logEntry.tradeNumber };
                        }
                    } else if (profit < 0) {
                        losingTrades++;
                        if (profit < worstTrade.profit) {
                            worstTrade = { profit, tradeNumber: logEntry.tradeNumber };
                        }
                    }

                    // Update worst trade for all trades (including profitable ones)
                    if (totalTrades === 1 || profit < worstTrade.profit) {
                        worstTrade = { profit, tradeNumber: logEntry.tradeNumber };
                    }
                }
            } catch (parseError) {
                // ignore parse errors
            }
        }

        const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
        const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
        const totalFeesUSD = totalFees;

        // Create summary object
        const summary = {
            action: "SESSION_SUMMARY",
            timestamp: new Date().toISOString(),
            sessionStats: {
                totalTrades,
                profitableTrades,
                losingTrades,
                winRate: winRate.toFixed(2),
                totalProfit: totalProfit.toFixed(2),
                avgProfit: avgProfit.toFixed(2),
                totalVolume: totalVolume.toFixed(6),
                totalFeesUSD: totalFeesUSD.toFixed(2),
                bestTrade: {
                    profit: bestTrade.profit.toFixed(2),
                    tradeNumber: bestTrade.tradeNumber
                },
                worstTrade: {
                    profit: worstTrade.profit.toFixed(2),
                    tradeNumber: worstTrade.tradeNumber
                }
            }
        };

        return summary;
    } catch (error) {
        console.log(`❌ Error generating summary: ${error.message}`);
        return null;
    }
}

// Function to write summary to a separate file
export async function writeSummaryToFile(summary) {
    try {
        if (!summary) return;

        const summaryText = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📊 ARBITRAGE SESSION SUMMARY                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Session Ended: ${new Date(summary.timestamp).toLocaleString('en-US')}                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 📈 Total Trades: ${summary.sessionStats.totalTrades}                                    ║
║ ✅ Profitable Trades: ${summary.sessionStats.profitableTrades}                           ║
║ ❌ Losing Trades: ${summary.sessionStats.losingTrades}                                 ║
║ 📊 Win Rate: ${summary.sessionStats.winRate}%                                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 💰 Total P&L: $${summary.sessionStats.totalProfit}                                    ║
║ 📊 Average P&L per trade: $${summary.sessionStats.avgProfit}                           ║
║ 💵 Total Trade Volume: ${summary.sessionStats.totalVolume}                             ║
║ 💸 Total Fees Paid: $${summary.sessionStats.totalFeesUSD}                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🏆 Best Trade: #${summary.sessionStats.bestTrade.tradeNumber} - $${summary.sessionStats.bestTrade.profit} ║
║ 💥 Worst Trade: #${summary.sessionStats.worstTrade.tradeNumber} - $${summary.sessionStats.worstTrade.profit} ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ${summary.sessionStats.totalProfit > 0 ? '✅ Session was PROFITABLE' : summary.sessionStats.totalProfit < 0 ? '⚠️  Session was at LOSS' : '➖ Session was at BREAK-EVEN'} ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

        await fs.writeFile("session_summary.txt", summaryText, "utf-8");
        console.log("📊 Session summary saved to session_summary.txt");
    } catch (error) {
        console.log(`❌ Error writing summary file: ${error.message}`);
    }
}

// Function to append summary to trades.log
export async function appendSummaryToTradesLog(summary) {
    try {
        if (!summary) return;

        const summaryLine = JSON.stringify(summary) + "\n";
        await fs.appendFile("trades.log", summaryLine, "utf-8");
        console.log("📝 Session summary appended to trades.log");
    } catch (error) {
        console.log(`❌ Error appending to trades.log: ${error.message}`);
    }
}

// Function to display session summary (similar to monitor)
export async function displaySessionSummary() {
    try {
        const summary = await generateProfitLossSummary();
        if (!summary) return;

        console.log("\n" + "=".repeat(80));
        console.log("📊 ARBITRAGE SESSION SUMMARY");
        console.log("=".repeat(80));
        console.log(`🕐 Session Ended: ${new Date(summary.timestamp).toLocaleString('en-US')}`);
        console.log("-".repeat(80));
        console.log(`📈 Total Trades: ${summary.sessionStats.totalTrades}`);
        console.log(`✅ Profitable Trades: ${summary.sessionStats.profitableTrades}`);
        console.log(`❌ Losing Trades: ${summary.sessionStats.losingTrades}`);
        console.log(`📊 Win Rate: ${summary.sessionStats.winRate}%`);
        console.log("-".repeat(80));
        console.log(`💰 Total P&L: $${summary.sessionStats.totalProfit}`);
        console.log(`📊 Average P&L per trade: $${summary.sessionStats.avgProfit}`);
        console.log(`💵 Total Trade Volume: ${summary.sessionStats.totalVolume}`);
        console.log(`💸 Total Fees Paid: $${summary.sessionStats.totalFeesUSD}`);
        console.log("-".repeat(80));
        console.log(`🏆 Best Trade: #${summary.sessionStats.bestTrade.tradeNumber} - $${summary.sessionStats.bestTrade.profit}`);
        console.log(`💥 Worst Trade: #${summary.sessionStats.worstTrade.tradeNumber} - $${summary.sessionStats.worstTrade.profit}`);
        console.log("-".repeat(80));

        if (parseFloat(summary.sessionStats.totalProfit) > 0) {
            console.log(`✅ Session was PROFITABLE`);
        } else if (parseFloat(summary.sessionStats.totalProfit) < 0) {
            console.log(`⚠️  Session was at LOSS`);
        } else {
            console.log(`➖ Session was at BREAK-EVEN`);
        }

        console.log("=".repeat(80));
    } catch (error) {
        console.log(`❌ Error displaying summary: ${error.message}`);
    }
}