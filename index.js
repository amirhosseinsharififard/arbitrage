import puppeteer from "puppeteer-core";
import chalk from "chalk";

const MEXC_URL = "https://www.mexc.com/futures/DEBT_USDT";
const LBANK_URL = "https://www.lbank.com/futures/debtusdt";
const CHROME_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARBITRAGE_THRESHOLD = 0.5;

async function launchBrowser() {
  return puppeteer.launch({
    headless: "true",
    executablePath: CHROME_PATH,
  });
}

// Open a page once, wait for the price element, then return the page object
async function openPage(browser, url, priceSelector) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(priceSelector);
  return page;
}

// Read the price from an already opened page
async function getPriceFromPage(page, priceSelector) {
  const priceText = await page.$eval(priceSelector, (el) =>
    el.textContent.trim()
  );
  return parseFloat(priceText.replace(/[^\d.]/g, ""));
}

function calculateSpread(price1, price2) {
  const spread = Math.abs(price1 - price2);
  const minPrice = Math.min(price1, price2);
  const percentDiff = ((spread / minPrice) * 100).toFixed(2);
  return { spread, percentDiff };
}

function printResults(mexcPrice, lbankPrice, spread, percentDiff) {
  const mexcColor = mexcPrice > lbankPrice ? chalk.red : chalk.green;

  const lbankColor = lbankPrice > mexcPrice ? chalk.red : chalk.green;

  console.log(
    `DEBT_USDT => MEXC Price: ${mexcColor(
      mexcPrice
    )} | LBank Price: ${lbankColor(
      lbankPrice
    )} | 📊 Diff: ${percentDiff}% | 📉 Spread: ${spread} | `
  );

  if (parseFloat(percentDiff) < ARBITRAGE_THRESHOLD) {
    console.log(
      chalk.gray(" Price difference is less than 0.5% – not profitable.")
    );
  } else {
    console.log(chalk.greenBright(" Arbitrage opportunity detected!"));
  }
}

async function main() {
  const browser = await launchBrowser();

  // Open pages once
  const mexcPage = await openPage(
    browser,
    MEXC_URL,
    "span.market_bigPrice__dC4As"
  );
  const lbankPage = await openPage(browser, LBANK_URL, "span.last-price");

  let lastMexcPrice = null;
  let lastLbankPrice = null;
  let lastSpread = null;

  try {
    while (true) {
      const mexcPrice = await getPriceFromPage(
        mexcPage,
        "span.market_bigPrice__dC4As"
      );
      const lbankPrice = await getPriceFromPage(lbankPage, "span.last-price");

      const { spread, percentDiff } = calculateSpread(mexcPrice, lbankPrice);

      const isChanged =
        mexcPrice !== lastMexcPrice ||
        lbankPrice !== lastLbankPrice ||
        spread !== lastSpread;

      if (isChanged) {
        printResults(mexcPrice, lbankPrice, spread, percentDiff);

        lastMexcPrice = mexcPrice;
        lastLbankPrice = lbankPrice;
        lastSpread = spread;
      }

      await new Promise((resolve) => setTimeout(resolve, 1)); // 1ms delay
    }
  } catch (error) {
    console.error(chalk.red("Error during price fetching:"), error);
  } finally {
    await browser.close();
  }
}

main();
