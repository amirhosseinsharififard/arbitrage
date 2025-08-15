/**
 * Test script for Ourbit XPath selectors
 * 
 * This script helps you test and validate the XPath selectors
 * for extracting bid and ask prices from Ourbit exchange.
 * 
 * Usage:
 * 1. Update the selectors in config.js if needed
 * 2. Run: node test_ourbit_selectors.js
 * 3. Check the output to see if prices are extracted correctly
 */

import puppeteer from 'puppeteer';
import config from './src/Arbitrage Logic/config/config.js';

async function testOurbitSelectors() {
    let browser = null;
    let page = null;

    try {
        console.log('🧪 Testing Ourbit XPath selectors...');
        console.log('URL:', config.ourbit.url);
        console.log('Bid selector:', config.ourbit.selectors.bidPrice);
        console.log('Ask selector:', config.ourbit.selectors.askPrice);
        console.log('');

        // Launch browser
        browser = await puppeteer.launch({
            ...config.ourbit.browser,
            headless: false // Set to false to see the browser
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to Ourbit
        console.log('🌐 Navigating to Ourbit...');
        await page.goto(config.ourbit.url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test bid price extraction
        console.log('📊 Testing bid price extraction...');
        const bidText = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.textContent : null;
        }, config.ourbit.selectors.bidPrice);

        console.log('Bid text found:', bidText);

        // Test ask price extraction
        console.log('📊 Testing ask price extraction...');
        const askText = await page.evaluate((xpath) => {
            const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return element ? element.textContent : null;
        }, config.ourbit.selectors.askPrice);

        console.log('Ask text found:', askText);

        // Parse prices
        const parsePrice = (priceText) => {
            if (!priceText) return null;
            const cleanPrice = priceText.toString().replace(/[^\d.]/g, '');
            const price = parseFloat(cleanPrice);
            return isNaN(price) ? null : price;
        };

        const bidPrice = parsePrice(bidText);
        const askPrice = parsePrice(askText);

        console.log('');
        console.log('📈 Results:');
        console.log('Bid price:', bidPrice);
        console.log('Ask price:', askPrice);

        if (bidPrice && askPrice) {
            console.log('✅ Both prices extracted successfully!');
            console.log('Spread:', askPrice - bidPrice);
            console.log('Spread %:', ((askPrice - bidPrice) / bidPrice * 100).toFixed(4) + '%');
        } else {
            console.log('❌ Failed to extract one or both prices');
            console.log('Please check the XPath selectors in config.js');
        }

        // Wait for user to see the results
        console.log('');
        console.log('Press Ctrl+C to close the browser...');
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
        console.log('🧹 Browser closed');
    }
}

// Run the test
testOurbitSelectors().catch(console.error);