import puppeteer from "puppeteer-core";
import chalk from "chalk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Verify GitHub Token
const token = process.env.GITHUB_TOKEN;
if (!token) {
  process.exit(1);
}

async function verifyToken(token) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        "User-Agent": "Arbitrage-Bot",
      },
    });
    return response.ok;
  } catch (error) {
    console.error(chalk.red("❌ Error verifying token:"), error.message);
    return false;
  }
}

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

async function openPage(browser, url, priceSelector) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(priceSelector);
  return page;
}

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
  // Verify token before proceeding
  const isValid = await verifyToken(token);
  if (!isValid) {
    process.exit(1);
  }

  const browser = await launchBrowser();
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

      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
    }
  } catch (error) {
    console.error(chalk.red("❌ Error during price fetching:"), error);
  } finally {
    await browser.close();
  }
}

main();
