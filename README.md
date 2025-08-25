# 🤖 CCXT Arbitrage Trading Bot

A sophisticated cryptocurrency arbitrage trading system that automatically identifies and executes profitable trading opportunities between multiple exchanges. Features real-time price monitoring, multi-currency support, DEX integration, and a beautiful web interface.

## 🚀 Features

### **Core Trading System**
- **Multi-Exchange Support**: MEXC, LBank, KCEX, OurBit, XT
- **DEX Integration**: DexScreener API for decentralized exchange data
- **Multi-Currency Trading**: AIOT, DEBT, ALT with easy currency addition
- **Real-time Price Monitoring**: 50ms intervals for optimal opportunity detection
- **Advanced Arbitrage Logic**: CEX vs CEX and CEX vs DEX calculations
- **Risk Management**: Single position trading, volume validation, profit thresholds

### **Web Interface**
- **Real-time Dashboard**: Live price matrix and arbitrage opportunities
- **Beautiful UI**: Modern, responsive design with gradient backgrounds
- **Auto-updates**: Data refreshes every 2 seconds
- **Connection Status**: Visual indicators for system health
- **Mobile Responsive**: Works on desktop and mobile devices

### **Build & Deployment**
- **Build System**: Clean build pipeline with `dist/` output
- **Code Protection**: Obfuscation pipeline with `dist_protected/` output
- **Cross-platform**: Windows batch scripts and npm scripts
- **Production Ready**: Optimized for deployment

## 📊 Trading Strategy

### **Arbitrage Logic**
1. **Price Monitoring**: Continuously fetch prices from all enabled exchanges
2. **Opportunity Detection**: Calculate profit percentages between exchanges
3. **Validation**: Check liquidity, fees, and profit thresholds
4. **Execution**: Open positions when profitable conditions are met
5. **Management**: Monitor and close positions based on strategy

### **Profit Calculation**
```javascript
// Gross profit calculation
profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100

// Net profit after fees
netProfit = grossProfit - (buyFee + sellFee)
```

### **Supported Trading Modes**
- **USD-Based**: Trade with fixed USD amounts
- **Token-Based**: Trade specific token quantities
- **Hybrid**: Combine both approaches for optimal results

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- API keys for exchanges (optional for price monitoring)

### **Quick Start**
```bash
# Clone the repository
git clone <repository-url>
cd CCXT

# Install dependencies
npm install

# Start the system
npm start
```

### **Configuration**
1. Copy `config.example.js` to `config.js`
2. Set your API keys and trading parameters
3. Configure currencies and exchanges in `src/Arbitrage Logic/config/multiCurrencyConfig.js`
4. Adjust profit thresholds and volume limits

### **Environment Variables**
Create `.env` file based on `env.example`:
```env
# Exchange API Keys (optional for price monitoring)
MEXC_API_KEY=your_mexc_api_key
MEXC_SECRET=your_mexc_secret
LBANK_API_KEY=your_lbank_api_key
LBANK_SECRET=your_lbank_secret

# System Configuration
NODE_ENV=production
PORT=8080
```

## 🏗️ Build & Deployment

### **Development Build**
```bash
# Build for development
npm run build

# Start built version
npm run start:dist
```

### **Protected Build (Production)**
```bash
# Build with code obfuscation
npm run build:protect

# Start protected version
npm run start:protected
```

### **Windows Batch Scripts**
```bash
# Build protected version (Windows)
.\build_protected.bat

# Start with web interface (Windows)
.\start_with_web.bat
```

## 🌐 Web Interface

### **Access**
- **URL**: http://localhost:8080
- **Auto-start**: Web interface starts automatically with the main system
- **Real-time Updates**: Data refreshes every 2 seconds

### **Dashboard Features**
- **Price Matrix**: Real-time prices across all exchanges
- **Arbitrage Opportunities**: Live profit calculations
- **System Status**: Connection health and performance metrics
- **Responsive Design**: Works on all device sizes

## 📁 Project Structure

```
CCXT/
├── src/
│   ├── Arbitrage Logic/
│   │   ├── arbitrage/          # Core arbitrage calculations
│   │   ├── arbitrage_bot/      # Position management
│   │   ├── config/             # Configuration management
│   │   ├── core/               # Core system components
│   │   ├── exchanges/          # Exchange integrations
│   │   ├── services/           # External service integrations
│   │   ├── utils/              # Utility functions
│   │   └── monitoring/         # Performance monitoring
│   └── puppeteer/              # Web scraping services
├── public/                     # Web interface assets
├── scripts/                    # Build and utility scripts
├── dist/                       # Build output
├── dist_protected/             # Obfuscated build output
├── index.js                    # Main entry point
├── web_interface.js            # Web server
└── package.json                # Dependencies and scripts
```

## ⚙️ Configuration

### **Currency Configuration**
Add new currencies in `src/Arbitrage Logic/config/multiCurrencyConfig.js`:
```javascript
const currencies = {
    NEW_COIN: {
        name: "NEW_COIN",
        baseCurrency: "NEW_COIN",
        quoteCurrency: "USDT",
        exchanges: {
            mexc: { symbol: "NEW_COIN/USDT:USDT", enabled: true },
            lbank: { symbol: "NEW_COIN/USDT:USDT", enabled: true }
        },
        trading: {
            profitThresholdPercent: 2.0,
            closeThresholdPercent: 1.5,
            tradeVolumeUSD: 200
        }
    }
};
```

### **Exchange Configuration**
Configure exchanges in the same file:
```javascript
const baseExchangeConfigs = {
    newExchange: {
        id: "newExchange",
        enabled: true,
        options: { defaultType: "spot" },
        retryAttempts: 5,
        retryDelay: 1000,
        feesPercent: 0.1
    }
};
```

## 🔧 Customization

### **Adding New Exchanges**
1. Add exchange configuration to `multiCurrencyConfig.js`
2. Implement exchange-specific logic in `src/Arbitrage Logic/exchanges/`
3. Update arbitrage calculations for new exchange pairs

### **Modifying Trading Strategy**
1. Adjust profit thresholds in configuration
2. Modify position opening/closing logic in `arbitrage_bot/`
3. Update risk management parameters

### **Extending Web Interface**
1. Modify `public/index.html` for UI changes
2. Update `web_interface.js` for backend logic
3. Add new data endpoints as needed

## 📈 Performance & Monitoring

### **System Monitoring**
- **Real-time Statistics**: Profit/loss tracking
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Comprehensive error logging
- **Resource Usage**: Memory and CPU monitoring

### **Logging**
- **Trade Logs**: Complete transaction history
- **Error Logs**: Detailed error information
- **Performance Logs**: System performance metrics
- **Request Logs**: API call tracking

## 🔒 Security & Protection

### **Code Protection**
- **Obfuscation**: JavaScript code obfuscation for production
- **Build Pipeline**: Clean separation of development and production code
- **Environment Variables**: Secure configuration management

### **Risk Management**
- **Single Position**: Only one arbitrage position at a time
- **Volume Limits**: Respects exchange liquidity and account balance
- **Profit Thresholds**: Minimum profit requirements before trading
- **Error Handling**: Graceful degradation and recovery

## 🚨 Troubleshooting

### **Common Issues**
1. **Exchange Connection Errors**: Check API keys and network connectivity
2. **Price Data Issues**: Verify exchange symbols and configurations
3. **Web Interface Not Loading**: Check port 8080 availability
4. **Build Errors**: Ensure all dependencies are installed

### **Debug Mode**
Enable detailed logging by setting environment variables:
```bash
NODE_ENV=development DEBUG=* npm start
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes. Cryptocurrency trading involves significant risk. Use at your own risk and never invest more than you can afford to lose.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add comprehensive tests
5. Submit a pull request

## 📞 Support

For questions and support, please open an issue in the GitHub repository.

---

**Built with ❤️ for the crypto trading community**