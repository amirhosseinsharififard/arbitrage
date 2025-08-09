import { launchBrowser, openPage } from './browser.service';
import { verifyToken } from './auth.service';
import { EXCHANGES, CONFIG } from '../config/constants';
import { calculateSpread, printResults } from '../utils/helpers';

// Define interfaces for better type safety
interface ExchangeConfig {
  URL: string;
  PRICE_SELECTOR: string;
}

interface Config {
  CHECK_INTERVAL: number;
}

interface SpreadResult {
  spread: number;
  percentDiff: number;
}

export async function startArbitrageBot(): Promise<void> {
  const isValid: boolean = await verifyToken();
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

  let lastMexcPrice: number | null = null;
  let lastLbankPrice: number | null = null;
  let lastSpread: number | null = null;

  try {
    while (true) {
      const mexcPrice: number = await getPriceFromPage(
        mexcPage,
        EXCHANGES.MEXC.PRICE_SELECTOR
      );
      const lbankPrice: number = await getPriceFromPage(
        lbankPage,
        EXCHANGES.LBANK.PRICE_SELECTOR
      );

      const { spread, percentDiff }: SpreadResult = calculateSpread(mexcPrice, lbankPrice);

      const isChanged: boolean =
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
  } catch (error: unknown) {
    console.error("❌ Error during price fetching:", error);
  } finally {
    await browser.close();
  }
}

async function getPriceFromPage(page: any, priceSelector: string): Promise<number> {
  const priceText: string = await page.$eval(priceSelector, (el: Element) =>
    el.textContent!.trim()
  );
  return parseFloat(priceText.replace(/[^\d.]/g, ""));
}
