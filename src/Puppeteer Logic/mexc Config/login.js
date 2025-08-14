import { launchBrowser, newPage } from "../core/browser.js";
import { saveCookies, loadCookies } from "../core/cookies.js";

const MEXC_LOGIN_URL = "https://www.mexc.com/login";

export async function loginMexc(options = {}) {
    const browser = await launchBrowser(options);
    const page = await newPage(browser);

    const hadCookies = await loadCookies(page, "mexc");
    await page.goto(MEXC_LOGIN_URL, { waitUntil: "networkidle2" });

    if (!hadCookies) {
        console.log("Please complete MEXC login in the opened browser window.");
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        await saveCookies(page, "mexc");
    }

    return { browser, page };
}