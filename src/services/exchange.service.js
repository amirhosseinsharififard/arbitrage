
import { launchBrowser, openPage } from './browser.service.js';
import { verifyToken } from './auth.service.js';
import { EXCHANGES, CONFIG } from '../config/constants.js';
import { calculateSpread, printResults } from '../utils/helpers.js';

export async function startArbitrageBot() {
  const isValid = await verifyToken();
  if (!isValid) {
    process.exit(1);
  }

  const browser = await launchBrowser();
  const mexcPage = await openPage(
    browser,
    EXCHANGES.MEXC.URL,
    EXCHANGES.MEXC.PRICE_SELECTOR
  );
  const lbankPage = await openPage(
    browser,
    EXCHANGES.LBANK.URL,
    EXCHANGES.LBANK.PRICE_SELECTOR
  );

  let lastMexcPrice = null;
  let lastLbankPrice = null;
  let lastSpread = null;

  try {
    while (true) {
      const mexcPrice = await getPriceFromPage(
        mexcPage,
        EXCHANGES.MEXC.PRICE_SELECTOR
      );
      const lbankPrice = await getPriceFromPage(
        lbankPage,
        EXCHANGES.LBANK.PRICE_SELECTOR
      );

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

      await new Promise((resolve) => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
    }
  } catch (error) {
    console.error("❌ Error during price fetching:", error);
  } finally {
    await browser.close();
  }
}

async function getPriceFromPage(page, priceSelector) {
  const priceText = await page.$eval(priceSelector, (el) =>
    el.textContent.trim()
  );
  return parseFloat(priceText.replace(/[^\d.]/g, ""));
}
