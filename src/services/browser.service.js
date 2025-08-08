import puppeteer from "puppeteer-core";
import { CONFIG } from "../config/constants.js";

export async function launchBrowser() {
  return puppeteer.launch({
    headless: "true",
    executablePath: CONFIG.CHROME_PATH,
  });
}

export async function openPage(browser, url, priceSelector) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector(priceSelector);
  return page;
}
