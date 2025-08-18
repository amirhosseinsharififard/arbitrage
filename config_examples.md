# Exchange Configuration Examples

## Enable/Disable Exchange Examples

### 1. Enable All Exchanges (Default)
```javascript
exchanges: {
    mexc: {
        id: "mexc",
        enabled: true, // MEXC enabled
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000
    },
    lbank: {
        id: "lbank",
        enabled: true, // LBank enabled
        options: { defaultType: "spot" },
        retryAttempts: 10,
        retryDelay: 1000
    }
}
```

### 2. Disable MEXC Only
```javascript
exchanges: {
    mexc: {
        id: "mexc",
        enabled: false, // MEXC disabled
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000
    },
    lbank: {
        id: "lbank",
        enabled: true, // LBank enabled
        options: { defaultType: "spot" },
        retryAttempts: 10,
        retryDelay: 1000
    }
}
```

### 3. Disable LBank Only
```javascript
exchanges: {
    mexc: {
        id: "mexc",
        enabled: true, // MEXC enabled
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000
    },
    lbank: {
        id: "lbank",
        enabled: false, // LBank disabled
        options: { defaultType: "spot" },
        retryAttempts: 10,
        retryDelay: 1000
    }
}
```

### 4. Disable Both MEXC and LBank
```javascript
exchanges: {
    mexc: {
        id: "mexc",
        enabled: false, // MEXC disabled
        options: { defaultType: "future" },
        retryAttempts: 10,
        retryDelay: 1000
    },
    lbank: {
        id: "lbank",
        enabled: false, // LBank disabled
        options: { defaultType: "spot" },
        retryAttempts: 10,
        retryDelay: 1000
    }
}
```

## Puppeteer Exchange Configuration

### Enable/Disable XT Exchange
```javascript
xt: {
    enabled: true, // Enable XT exchange
    url: "https://www.xt.com/en/futures/trade/eth_usdt",
    updateInterval: 100,
    // ... other settings
}
```

### Enable/Disable KCEX Exchange
```javascript
kcex: {
    enabled: false, // Disable KCEX exchange
    url: "https://www.kcex.com/futures/exchange/ETH_USDT",
    updateInterval: 100,
    // ... other settings
}
```

## Usage Examples

### Test with MEXC Disabled
1. Set `config.exchanges.mexc.enabled = false`
2. Run the system
3. Only LBank prices will be fetched and displayed
4. Arbitrage will only work with LBank and other enabled exchanges

### Test with LBank Disabled
1. Set `config.exchanges.lbank.enabled = false`
2. Run the system
3. Only MEXC prices will be fetched and displayed
4. Arbitrage will only work with MEXC and other enabled exchanges

### Test with Both Disabled
1. Set both `config.exchanges.mexc.enabled = false` and `config.exchanges.lbank.enabled = false`
2. Run the system
3. No CCXT exchange prices will be fetched
4. Only Puppeteer-based exchanges (XT, KCEX) will work if enabled

## System Behavior

When an exchange is disabled:
- ✅ Exchange will not be initialized
- ✅ No price fetching attempts will be made
- ✅ No error messages will be shown for that exchange
- ✅ Exchange will not appear in the enabled exchanges list
- ✅ Arbitrage calculations will exclude that exchange
- ✅ System will continue to work with other enabled exchanges

## Testing

Use the test script to verify configuration:
```bash
node test_exchange_disable.js
```

This will show:
- Current enable/disable status for all exchanges
- Which exchanges are successfully initialized
- Price fetching results for enabled exchanges
