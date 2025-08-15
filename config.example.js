/**
 * Example configuration file for Ourbit bid and ask selectors
 * 
 * This file shows how to configure the XPath selectors for Ourbit exchange
 * to extract bid and ask prices from the web interface.
 * 
 * To use this configuration:
 * 1. Copy the ourbit section to your config.js file
 * 2. Update the XPath selectors based on your analysis of the Ourbit website
 * 3. Test the selectors to ensure they extract the correct prices
 */

const exampleConfig = {
    // Ourbit Puppeteer configuration
    ourbit: {
        url: "https://futures.ourbit.com/fa-IR/exchange/GAIA_USDT?type=linear_swap",
        updateInterval: 100, // Price update interval in milliseconds

        // XPath selectors for price elements
        // These selectors should point to the actual bid and ask price elements on the page
        selectors: {
            // Bid price selector (the price at which you can buy)
            bidPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[1]/div[1]/div[14]/div[1]/span",

            // Ask price selector (the price at which you can sell)
            askPrice: "/html/body/div[3]/section/div[4]/div[6]/div[2]/div[2]/div[2]/div[2]/div[3]/div[1]/div[1]/div[1]/span"
        },

        // Browser configuration
        browser: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    }
};

/**
 * How to find the correct XPath selectors:
 * 
 * 1. Open the Ourbit website in your browser
 * 2. Right-click on the bid price element and select "Inspect"
 * 3. Right-click on the highlighted element in the developer tools
 * 4. Select "Copy" > "Copy XPath"
 * 5. Replace the bidPrice selector with the copied XPath
 * 6. Repeat the same process for the ask price element
 * 7. Test the selectors to ensure they extract the correct values
 * 
 * Note: XPath selectors may change if the website structure is updated.
 * You may need to update these selectors periodically.
 */

export default exampleConfig;