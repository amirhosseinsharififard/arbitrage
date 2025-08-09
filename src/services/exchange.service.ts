import { Page } from "puppeteer-core";
import { launchBrowser, openPage } from "./browser.service";
import { verifyToken } from "./auth.service";
import { EXCHANGES, CONFIG } from "../config/constants";
import { calculateSpread, printResults } from "../utils/helpers";
import { logger } from "../utils/logger";

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

export async function startArbitrageBot(
  maxCycles: number = 100
): Promise<void> {
  const isValid: boolean = await verifyToken();
  if (!isValid) {
    logger.error({ message: "Token verification failed, exiting" });
    process.exit(1);
  }

  let browser = await launchBrowser();
  let mexcPage: Page = await openPage(
    browser,
    EXCHANGES.MEXC.URL,
    EXCHANGES.MEXC.PRICE_SELECTOR
  );
  let lbankPage: Page = await openPage(
    browser,
    EXCHANGES.LBANK.URL,
    EXCHANGES.LBANK.PRICE_SELECTOR
  );

  let lastMexcPrice: number | null = null;
  let lastLbankPrice: number | null = null;
  let lastSpread: number | null = null;
  let cycleCount = 0;

  try {
    while (cycleCount < maxCycles) {
      try {
        const mexcPrice: number = await getPriceFromPage(
          mexcPage,
          EXCHANGES.MEXC.PRICE_SELECTOR
        );
        const lbankPrice: number = await getPriceFromPage(
          lbankPage,
          EXCHANGES.LBANK.PRICE_SELECTOR
        );

        const { spread, percentDiff }: SpreadResult = calculateSpread(
          mexcPrice,
          lbankPrice
        );

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

        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.CHECK_INTERVAL)
        );
      } catch (error: unknown) {
        logger.error({
          message: "Error in price fetching cycle",
          error: (error as Error).message,
        });
      }
    }
  } catch (error: unknown) {
    logger.error({
      message: "Critical error during price fetching",
      error: (error as Error).message,
    });
  } finally {
    await browser.close();
  }
}

async function getPriceFromPage(
  page: Page,
  priceSelector: string
): Promise<number> {
  const priceText: string = await page.$eval(priceSelector, (el: Element) => {
    if (!el.textContent) {
      throw new Error(`No text content found for selector ${priceSelector}`);
    }
    return el.textContent.trim();
  });
  const price = parseFloat(priceText.replace(/[^\d.]/g, ""));
  if (isNaN(price)) {
    throw new Error(`Invalid price format for selector ${priceSelector}`);
  }
  return price;
}
