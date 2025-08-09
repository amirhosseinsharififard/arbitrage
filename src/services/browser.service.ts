import puppeteer, { Browser, Page } from "puppeteer-core";
import { CONFIG } from "../config/constants";

interface Config {
  CHROME_PATH: string;
}

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    executablePath: CONFIG.CHROME_PATH,
  });
}

export async function openPage(
  browser: Browser,
  url: string,
  priceSelector: string
): Promise<Page> {
  const page: Page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(priceSelector);
  return page;
}
