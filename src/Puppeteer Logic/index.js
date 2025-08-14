import dotenv from "dotenv";
import { launchBrowser, newPage } from "./core/browser.js";
import { saveCookies, loadCookies } from "./core/cookies.js";
import { loginMexc } from "./mexc Config/login.js";
import { loginLbank } from "./lbank config/login.js";

dotenv.config();

async function run() {
    const mode = process.argv[2] || "mexc"; // "mexc" | "lbank" | "blank"

    if (mode === "mexc") {
        const { browser, page } = await loginMexc({ headless: false });
        console.log("MEXC page title:", await page.title());
        await browser.close();
        return;
    }

    if (mode === "lbank") {
        const { browser, page } = await loginLbank({ headless: false });
        console.log("LBank page title:", await page.title());
        await browser.close();
        return;
    }

    const browser = await launchBrowser({ headless: false });
    const page = await newPage(browser, "https://example.com");
    console.log("Blank page title:", await page.title());
    await browser.close();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});