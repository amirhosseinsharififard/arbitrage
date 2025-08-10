# 📊 Arbitrage Profit/Loss Summary System

## Overview
This system automatically generates comprehensive profit/loss summaries for your arbitrage trading sessions, similar to what the monitor displays.

## 🚀 Features

### 1. **Automatic Summary Generation**
- Analyzes all trades in `trades.log`
- Calculates total profit/loss, win rate, best/worst trades
- Tracks fees, volume, and performance metrics

### 2. **Multiple Output Formats**
- **Console Display**: Shows summary in terminal (like monitor)
- **Separate File**: Saves to `session_summary.txt` with beautiful formatting
- **Trades Log**: Appends summary to `trades.log` for permanent record

### 3. **Exit Handling**
- Automatically generates summary when program exits
- Handles Ctrl+C, termination signals, and normal exits
- Ensures you never lose your session data

## 📁 Files Created

- `src/utils.js` - Enhanced with summary functions
- `exit_summary.js` - Automatic exit handler
- `test_summary.js` - Test script for summary generation
- `session_summary.txt` - Beautiful formatted summary file
- `SUMMARY_README.md` - This documentation

## 🛠️ Usage

### **Automatic (Recommended)**
1. Import `exit_summary.js` in your main arbitrage bot
2. Summary will be generated automatically when program exits
3. No manual intervention needed

### **Manual Generation**
```javascript
import { generateProfitLossSummary, displaySessionSummary } from "./src/utils.js";

// Generate and display summary
const summary = await generateProfitLossSummary();
await displaySessionSummary();
```

### **Test the System**
```bash
node test_summary.js
```

## 📊 Summary Information

The system tracks:
- **Total Trades**: Count of all completed trades
- **Profitable/Losing Trades**: Win/loss breakdown
- **Win Rate**: Percentage of profitable trades
- **Total P&L**: Overall profit/loss in USD
- **Average P&L**: Per-trade average
- **Total Volume**: Combined trading volume
- **Total Fees**: All fees paid during session
- **Best Trade**: Highest profit trade with number
- **Worst Trade**: Lowest profit trade with number

## 🔄 Integration

To integrate with your existing arbitrage bot:

```javascript
// Add this import to your main bot file
import "./exit_summary.js";

// The summary will be generated automatically on exit
```

## 📈 Example Output

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📊 ARBITRAGE SESSION SUMMARY                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Session Ended: 8/10/2025, 3:36:03 PM                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 📈 Total Trades: 10                                                       ║
║ ✅ Profitable Trades: 10                                                   ║
║ ❌ Losing Trades: 0                                                        ║
║ 📊 Win Rate: 100.00%                                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 💰 Total P&L: $31.89                                                      ║
║ 📊 Average P&L per trade: $3.19                                           ║
║ 💵 Total Trade Volume: 0.238095                                           ║
║ 💸 Total Fees Paid: $0.02                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🏆 Best Trade: #4 - $3.96                                                 ║
║ 💥 Worst Trade: #10 - $1.10                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ✅ Session was PROFITABLE                                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## 🎯 Benefits

1. **Complete Visibility**: Know exactly how much you made/lost
2. **Performance Tracking**: Monitor your trading success over time
3. **Data Preservation**: All summaries saved permanently
4. **Professional Reports**: Beautiful formatted output files
5. **Zero Maintenance**: Works automatically without setup

## 🔧 Customization

You can modify the summary format by editing the `writeSummaryToFile` function in `src/utils.js` to match your preferred style or add additional metrics.
