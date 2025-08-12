# Arbitrage Trading System

A sophisticated cryptocurrency arbitrage trading system that automatically identifies and executes profitable trading opportunities between different exchanges. The system supports both USD-based and token quantity-based trading modes with comprehensive logging and risk management.

## 🚀 Key Features

### **Dual Trading Modes**
- **USD-Based Trading**: Traditional dollar amount-based trading (e.g., $200 total investment)
- **Token Quantity-Based Trading**: Trade based on specific token quantities (e.g., 1000 DEBT tokens)

### **Accurate Profit Calculations**
- **Corrected `actualProfitUSD`**: Now uses the accurate formula: `TotalInvestmentUSD × (netProfitPercent / 100)`
- **Accurate `volume`**: Represents actual token count, not scaled values: `TotalInvestmentUSD / buyPrice`
- **Transparent Scaling**: All calculations are explicit and documented in the code

### **Advanced Trading Logic**
- **Sequential Trading**: Only one position open at a time for risk management
- **Token Quantity Continuation**: Automatically continues buying/selling if target quantity isn't met
- **Liquidity Validation**: Uses order book data to ensure trade execution feasibility
- **Dynamic Volume Calculation**: Adjusts trade size based on available liquidity and account balance

### **Comprehensive Logging**
- **Detailed Trade Logs**: Complete JSON logs for all open/close events
- **Performance Metrics**: Real-time profit/loss tracking and statistics
- **Order Book Snapshots**: Market condition capture at trade open/close
- **Continuation Tracking**: Detailed logs for token quantity continuation trades

## 📊 Trading Strategy

### **Core Arbitrage Logic**
1. **Buy at LBANK ask price** (lower price)
2. **Sell at MEXC bid price** (higher price)
3. **Profit from price difference** between exchanges
4. **Maintain single position** for risk management

### **Profit Calculation**
```javascript
// Corrected formula for actual profit calculation
actualProfitUSD = TotalInvestmentUSD × (netProfitPercent / 100)

// Where:
// - TotalInvestmentUSD = actual amount invested in the position
// - netProfitPercent = gross profit % minus total fees %
```

### **Volume Calculation**
```javascript
// For USD-based trading:
volume = (tradeVolumeUSD / 2) / buyPrice

// For token quantity-based trading:
volume = targetTokenQuantity

// Both represent actual token count, not scaled values
```

## ⚙️ Configuration

### **Trading Mode Selection**
```javascript
// In config.js
tradingMode: "USD", // "USD" or "TOKEN"
```

### **USD-Based Trading**
```javascript
tradeVolumeUSD: 200, // Total investment across both exchanges
// Results in $100 per side (buy and sell)
```

### **Token Quantity-Based Trading**
```javascript
tradingMode: "TOKEN",
targetTokenQuantity: 1000, // Target number of tokens to trade
maxTokenQuantity: 10000,   // Maximum allowed for safety
minTokenQuantity: 100      // Minimum for validation
```

### **Profit Thresholds**
```javascript
profitThresholdPercent: 2,    // Minimum % to open position
closeThresholdPercent: 1,     // % threshold to close position
```

## 🔄 Token Quantity Continuation

### **How It Works**
1. **Initial Trade**: Opens position for target token quantity
2. **Quantity Check**: Monitors if target quantity was achieved
3. **Continuation Logic**: If shortfall exists and conditions are met:
   - Calculate remaining quantity needed
   - Check available account balance
   - Validate profit conditions still exist
   - Open continuation position
   - Respect liquidity constraints

### **Continuation Example**
```javascript
// Target: 1000 DEBT tokens
// Initial trade: 800 DEBT tokens (limited by liquidity)
// Continuation: 200 DEBT tokens (remaining needed)
// Result: Total 1000 DEBT tokens achieved
```

### **Safety Features**
- **Balance Validation**: Ensures sufficient funds before continuation
- **Profit Threshold Check**: Only continues if profitable conditions persist
- **Liquidity Respect**: Limits continuation volume to available market depth
- **Maximum Limits**: Configurable upper bounds for safety

## 📈 Logging and Monitoring

### **Trade Log Structure**
```json
{
  "action": "ARBITRAGE_OPEN",
  "symbol": "DEBT/USDT:USDT",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": {
    "arbitrageId": "lbank-mexc",
    "tradingMode": "TOKEN",
    "targetTokenQuantity": 1000,
    "volume": 1000,
    "buyPrice": 0.001,
    "sellPrice": 0.00102,
    "totalInvestmentUSD": 2.04,
    "expectedProfitUSD": 0.0408,
    "details": {
      "profitBreakdown": {
        "grossDiffPercent": "2.0%",
        "feesPercentTotal": "0.0%",
        "netExpectedDiffPercent": "2.0%"
      }
    }
  }
}
```

### **Close Log Structure**
```json
{
  "action": "ARBITRAGE_CLOSE",
  "symbol": "DEBT/USDT:USDT",
  "timestamp": "2024-01-01T12:05:00.000Z",
  "data": {
    "arbitrageId": "lbank-mexc",
    "volume": 1000,
    "actualProfitUSD": 0.0408,
    "totalInvestmentUSD": 2.04,
    "netProfitPercent": "2.0%",
    "profitCalculation": {
      "formula": "actualProfitUSD = TotalInvestmentUSD × (netProfitPercent / 100)",
      "totalInvestmentUSD": 2.04,
      "netProfitPercent": 2.0,
      "calculatedProfit": 0.0408
    }
  }
}
```

## 🛠️ Installation and Setup

### **Prerequisites**
- Node.js 16+ 
- CCXT library for exchange integration
- API keys for MEXC and LBank exchanges

### **Installation**
```bash
npm install
```

### **Configuration**
1. Copy `config.example.js` to `config.js`
2. Set your API keys and trading parameters
3. Choose trading mode (USD or TOKEN)
4. Set profit thresholds and volume limits

### **Running the System**
```bash
npm start
```

## 📁 Project Structure

```
src/
├── arbitrage_bot/
│   └── arbitrage.js          # Core arbitrage logic and position management
├── config/
│   └── config.js             # Centralized configuration
├── exchanges/
│   └── exchangeManager.js    # Exchange connection management
├── logging/
│   └── logger.js             # Comprehensive logging system
├── monitoring/
│   └── statistics.js         # Performance tracking and statistics
├── services/
│   ├── priceService.js       # Real-time price data management
│   ├── requestRecorder.js    # Network request monitoring
│   └── requestCapture.js     # Request/response capture
├── utils/
│   ├── calculations.js       # Mathematical utilities
│   ├── formatting.js         # Data formatting functions
│   ├── validation.js         # Input validation
│   └── orderbook.js          # Order book analysis
└── prices.js                 # Main price monitoring and arbitrage detection
```

## 🔒 Risk Management

### **Position Limits**
- **Single Position**: Only one arbitrage position open at a time
- **Maximum Loss**: Configurable stop-loss thresholds
- **Volume Limits**: Respects exchange liquidity and account balance

### **Validation Checks**
- **Profit Thresholds**: Minimum profit requirements before trading
- **Liquidity Validation**: Order book depth verification
- **Balance Checks**: Account balance validation before trades
- **Fee Calculation**: Accurate profit calculation including all fees

## 📊 Performance Monitoring

### **Real-Time Statistics**
- **Session Tracking**: Profit/loss across trading sessions
- **Trade History**: Detailed log of all completed trades
- **Performance Metrics**: Win rate, average profit, drawdown analysis
- **Request Monitoring**: Network performance and error tracking

### **Console Output**
- **Status Updates**: Real-time trading status and position information
- **Trade Details**: Comprehensive trade execution information
- **Performance Summary**: Session statistics and profit/loss summary
- **Error Reporting**: Detailed error messages and recovery information

## 🚨 Error Handling

### **Network Resilience**
- **Automatic Retries**: Configurable retry attempts for failed operations
- **Connection Recovery**: Automatic reconnection to exchanges
- **Graceful Degradation**: Continue operation with reduced functionality

### **Data Validation**
- **Price Validation**: Verify price data integrity
- **Volume Validation**: Ensure sufficient liquidity exists
- **Balance Validation**: Confirm sufficient funds before trading

## 🔧 Customization

### **Adding New Exchanges**
1. Add exchange configuration to `config.js`
2. Implement exchange-specific logic in `exchangeManager.js`
3. Update arbitrage logic for new exchange pairs

### **Modifying Trading Strategy**
1. Adjust profit thresholds in `config.js`
2. Modify position opening/closing logic in `arbitrage.js`
3. Update risk management parameters

### **Extending Logging**
1. Add new log actions to `config.js`
2. Implement logging logic in `logger.js`
3. Update monitoring and statistics tracking

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add comprehensive tests
5. Submit a pull request

## ⚠️ Disclaimer

This software is for educational and research purposes. Cryptocurrency trading involves significant risk. Use at your own risk and never invest more than you can afford to lose.

## 📞 Support

For questions and support, please open an issue in the GitHub repository.