import { launchBrowser, newPage } from "../core/browser.js";
import { saveCookies, loadCookies } from "../core/cookies.js";
import { LBANK_FUTURES_URL } from "./config.js";

const LBANK_LOGIN_URL = "https://www.lbank.com/login";

export async function loginLbank(options = {}) {
    const browser = await launchBrowser(options);
    const page = await newPage(browser);

    const hadCookies = await loadCookies(page, "lbank");
    await page.goto(LBANK_LOGIN_URL, { waitUntil: "networkidle2" });

    if (!hadCookies) {
        console.log("Please complete LBank login in the opened browser window.");
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        await saveCookies(page, "lbank");
    }

    // After login, jump directly to futures url
    await page.goto(LBANK_FUTURES_URL, { waitUntil: "networkidle2" });

    return { browser, page };
}