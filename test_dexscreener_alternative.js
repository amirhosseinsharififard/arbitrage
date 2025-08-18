/**
 * Alternative test script for DexScreener+ integration
 * This script will try different approaches to bypass Cloudflare protection
 */

import puppeteer from 'puppeteer';
import config from './src/Arbitrage Logic/config/config.js';

console.log('🧪 Testing Alternative DexScreener+ Approaches...\n');

// Test different URLs and approaches
const testUrls = [
    "https://dexscreener.com/base/0x932a6d413c61f2ef151cc0c9089efbe28af5f359",
    "https://dexscreener.com/base/0x932a6d413c61f2ef151cc0c9089efbe28af5f359?embed=1",
    "https://dexscreener.com/base/0x932a6d413c61f2ef151cc0c9089efbe28af5f359?theme=dark",
    "https://dexscreener.com/base/0x932a6d413c61f2ef151cc0c9089efbe28af5f359?ref=0x0000000000000000000000000000000000000000"
];

const browserArgs = [
    // Approach 1: Standard args
    [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ],
    // Approach 2: Stealth args
    [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    // Approach 3: Mobile user agent
    [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    ]
];

async function testUrl(url, args, approachName) {
    console.log(`\n🔍 Testing ${approachName} with URL: ${url}`);
    
    let browser = null;
    let page = null;
    
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            args: args
        });
        
        // Create page
        page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set timeouts
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(60000);
        
        // Navigate to URL
        console.log(`   Navigating to: ${url}`);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check page title
        const title = await page.title();
        console.log(`   Page title: ${title}`);
        
        // Check if we're blocked
        if (title.includes('Just a moment') || title.includes('Checking your browser')) {
            console.log(`   ❌ Still blocked by Cloudflare`);
            return false;
        }
        
        // Try to find price elements
        console.log(`   ✅ Page loaded successfully`);
        
        // Try different selectors
        const selectors = [
            '//*[@id="root"]/div/main/div/div/div[1]/div/div/div[2]/div/div[1]/div[1]/div[1]/span[2]/div',
            '//span[contains(@class, "price")]',
            '//div[contains(@class, "price")]',
            '//span[contains(text(), "$")]',
            '[data-testid="price"]',
            '.price',
            'span[class*="price"]'
        ];
        
        for (const selector of selectors) {
            try {
                if (selector.startsWith('//')) {
                    // XPath selector
                    const elements = await page.evaluateHandle((xpath) => {
                        const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                        return result.snapshotLength > 0 ? result.snapshotItem(0) : null;
                    }, selector);
                    
                    if (elements && !(await elements.evaluate(el => el === null))) {
                        const text = await page.evaluate(el => el.textContent, elements);
                        console.log(`   ✅ Found price with XPath "${selector}": ${text}`);
                        return true;
                    }
                } else {
                    // CSS selector
                    const element = await page.$(selector);
                    if (element) {
                        const text = await page.evaluate(el => el.textContent, element);
                        console.log(`   ✅ Found price with CSS "${selector}": ${text}`);
                        return true;
                    }
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        console.log(`   ❌ No price elements found`);
        return false;
        
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return false;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}

// Run tests
async function runTests() {
    let successFound = false;
    
    for (let i = 0; i < browserArgs.length; i++) {
        const args = browserArgs[i];
        const approachName = `Approach ${i + 1}`;
        
        for (const url of testUrls) {
            const success = await testUrl(url, args, approachName);
            if (success) {
                console.log(`\n🎉 SUCCESS! ${approachName} with URL: ${url}`);
                successFound = true;
                break;
            }
        }
        
        if (successFound) break;
    }
    
    if (!successFound) {
        console.log('\n❌ All approaches failed. DexScreener has strong protection.');
        console.log('💡 Suggestions:');
        console.log('   1. Use a different data source');
        console.log('   2. Implement manual browser interaction');
        console.log('   3. Use API if available');
        console.log('   4. Consider using a proxy service');
    }
}

runTests().catch(console.error);
