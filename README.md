# Cryptocurrency Arbitrage System

This system is designed to perform arbitrage trading between different exchanges.

## New Features

### 🔒 Sequential Trading
- **Only one trade at a time**: The system always has only one open trade
- **Wait for closure**: If a trade is open, no new trade will be opened
- **Profit calculation**: After closing each trade, profit is calculated and recorded
- **Next trade**: After closing a trade, the system is ready for the next trade

### 🛡️ Safety Features
- **Maximum loss**: Set maximum allowed loss threshold
- **Maximum trades**: Limit total number of trades
- **Fee calculation**: Consider exchange fees in calculations

## How to Run

### Main Execution
```bash
node index.js
```

### System Monitoring
```bash
node monitor.js
```

## Configuration

File `src/config/config.js`:

```javascript
const config = {
  symbols: {
    mexc: "DEBT/USDT:USDT",
    lbank: "DEBT/USDT:USDT",
  },
  intervalMs: 500,                    // Check interval (milliseconds)
  profitThresholdPercent: 2,          // Profit percentage to open a trade
  closeThresholdPercent: 1,           // Profit percentage to close a trade
  tradeVolumeUSD: 100,                // Trade volume (USD)
  maxTrades: 10,                      // Maximum number of trades (0 = unlimited)
  maxLossPercent: -5,                 // Maximum allowed loss percentage
  feesPercent: {
    mexc: 0.04,                       // MEXC fees
    lbank: 0.05,                      // LBank fees
  },
};
```

## Trading Logic

### Opening a Trade
1. Check for no open trades
2. Calculate price difference between exchanges
3. Compare with profit threshold
4. Open trade if conditions are suitable

### Closing a Trade
1. **Target profit reached**: Close when reaching `closeThresholdPercent`
2. **Excessive loss**: Close when loss exceeds `profitThresholdPercent`
3. **Maximum loss**: Close when reaching `maxLossPercent`

## Logs

All trades are recorded in the `trades.log` file:

```json
{
  "action": "OPEN",
  "symbol": "DEBT/USDT:USDT",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "buyExchangeId": "mexc",
  "sellExchangeId": "lbank",
  "buyPrice": 1.00,
  "sellPrice": 1.02,
  "volume": 100,
  "diffPercent": "2.000"
}
```

## Monitoring

### Current Status
- Display open trades
- Total profit/loss
- Number of trades
- Last trade profit

### Overall Statistics
- Success rate
- Average profit
- Total trade volume
- Number of profitable/loss-making trades

## Important Notes

1. **Single trade only**: The system always has only one open trade
2. **Smart waiting**: If a trade is open, it waits for it to close
3. **Accurate profit calculation**: Fees are considered in calculations
4. **Safety**: Loss and trade count limitations
5. **Complete logging**: Record all trade details

## Troubleshooting

### Common Issues
- **API errors**: Check API keys and permissions
- **Network errors**: System automatically retries
- **No opportunities**: System waits for suitable opportunities

### Logs
- Check `trades.log` file for trade details
- Use `monitor.js` to check status
- Check console for error messages
