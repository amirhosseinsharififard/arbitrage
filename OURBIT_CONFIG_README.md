# Ourbit Bid/Ask Configuration Guide

## Overview
This guide explains how to configure the XPath selectors for extracting bid and ask prices from the Ourbit exchange website.

## Current Configuration
The system is now configured to extract Ourbit prices using XPath selectors defined in `src/arbitrage/config/config.js`:

```javascript
ourbit: {
    url: "https://futures.ourbit.com/fa-IR/exchange/GAIA_USDT?type=linear_swap",
    updateInterval: 100,
    selectors: {
        bidPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[1]/div[1]/div[14]/div[1]/span",
        askPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span"
    }
}
```

## How to Update Selectors

### Step 1: Find the Correct Elements
1. Open the Ourbit website in your browser
2. Navigate to the GAIA/USDT trading page
3. Locate the bid and ask price elements on the page

### Step 2: Get XPath Selectors
1. Right-click on the bid price element and select "Inspect"
2. Right-click on the highlighted element in Developer Tools
3. Select "Copy" > "Copy XPath"
4. Repeat the same process for the ask price element

### Step 3: Update Configuration
1. Open `src/arbitrage/config/config.js`
2. Find the `ourbit.selectors` section
3. Replace the existing selectors with your new ones:

```javascript
selectors: {
    bidPrice: "YOUR_NEW_BID_XPATH_HERE",
    askPrice: "YOUR_NEW_ASK_XPATH_HERE"
}
```

### Step 4: Test the Selectors
Run the test script to validate your selectors:

```bash
node test_ourbit_selectors.js
```

This will:
- Open a browser window showing the Ourbit page
- Test both selectors
- Display the extracted prices
- Show the spread between bid and ask

## Understanding Bid vs Ask

- **Bid Price**: The price at which you can **buy** (the price sellers are willing to accept)
- **Ask Price**: The price at which you can **sell** (the price buyers are willing to pay)

In arbitrage trading:
- You buy at the **ask** price (higher price)
- You sell at the **bid** price (lower price)
- Profit = Bid - Ask (when positive)

## Troubleshooting

### Selectors Not Working
If the test script shows "null" for prices:

1. **Check if the page structure changed**: Websites update their HTML structure
2. **Verify the XPath**: Use browser developer tools to test the XPath manually
3. **Try different selectors**: Sometimes CSS selectors work better than XPath
4. **Check for dynamic content**: Some prices are loaded via JavaScript

### Common Issues
- **Element not found**: The XPath selector is incorrect
- **Wrong price**: The selector is pointing to the wrong element
- **Null values**: The element exists but has no text content

### Alternative Selectors
If XPath doesn't work, you can try CSS selectors:

```javascript
// Instead of XPath, use CSS selectors
const element = document.querySelector('.price-bid'); // Example CSS selector
```

## Files Modified

1. **`src/arbitrage/config/config.js`**: Added Ourbit configuration section
2. **`src/Puppeteer Logic/index.js`**: Updated to use config-based selectors
3. **`test_ourbit_selectors.js`**: Test script for validating selectors
4. **`config.example.js`**: Example configuration file

## Running the System

After configuring the selectors:

1. Test them first: `node test_ourbit_selectors.js`
2. If successful, run the main system: `node index.js`

The system will now use your configured selectors to extract Ourbit bid and ask prices for arbitrage trading.
