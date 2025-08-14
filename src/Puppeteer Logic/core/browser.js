import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

function resolveHeadlessMode() {
    const envValue = process.env.PUPPETEER_HEADLESS;
    if (envValue === undefined) return "new"; // Puppeteer default modern headless
    if (envValue === "true") return true;
    if (envValue === "false") return false;
    return envValue; // allow "new" or boolean-like strings
}

export async function launchBrowser(options = {}) {
    const {
        headless = resolveHeadlessMode(),
            executablePath = process.env.CHROME_PATH || undefined,
            userDataDir = undefined,
            defaultViewport = { width: 1280, height: 800 },
            slowMo = Number(process.env.PUPPETEER_SLOWMO || 0)
    } = options;

    const browser = await puppeteer.launch({
        headless,
        executablePath,
        userDataDir,
        defaultViewport,
        slowMo,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-features=IsolateOrigins,site-per-process",
            "--window-size=1280,800"
        ]
    });

    return browser;
}

export async function newPage(browser, url = null, userAgent = null) {
    const page = await browser.newPage();
    if (userAgent) {
        await page.setUserAgent(userAgent);
    }
    if (url) {
        await page.goto(url, { waitUntil: "networkidle2" });
    }
    return page;
}