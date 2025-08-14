import dotenv from "dotenv";
import { launchBrowser, newPage } from "./core/browser.js";
import { saveCookies, loadCookies } from "./core/cookies.js";
import { loginMexc } from "./mexc Config/login.js";
import { openMexcFutures, ensureMexcLoggedIn, fillTokenQuantity, toggleOpenTab as toggleMexcOpenTab, toggleCloseTab as toggleMexcCloseTab } from "./mexc Config/actions.js";
import { loginLbank } from "./lbank config/login.js";
import config from "../Arbitrage Logic/config/config.js";
import { openLbankFutures, ensureLbankLoggedIn, fillTokenQuantity as fillLbankTokenQuantity, toggleOpenTab, clickOpenLong, clickOpenShort, toggleCloseTab, clickCloseShort, clickCloseLong } from "./lbank config/actions.js";

dotenv.config();

function getConfiguredTokenQuantity() {
    const quantity = Number((config && config.targetTokenQuantity) || 0);
    const maxAllowed = Number((config && config.maxTokenQuantity) || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Invalid targetTokenQuantity in config");
    }
    if (Number.isFinite(maxAllowed) && maxAllowed > 0 && quantity > maxAllowed) {
        throw new Error("targetTokenQuantity exceeds maxTokenQuantity in config");
    }
    return quantity;
}

async function run() {
    const mode = process.argv[2] || "mexc"; // "mexc" | "lbank" | "blank"

    if (mode === "mexc") {
        const tokenQuantity = getConfiguredTokenQuantity();
        const { browser, page } = await loginMexc({ headless: false });
        await openMexcFutures(page);
        await ensureMexcLoggedIn(page);
        // toggles available for later use
        // await toggleMexcOpenTab(page);
        // await toggleMexcCloseTab(page);
        await fillTokenQuantity(page, tokenQuantity);
        console.log("Filled token quantity:", tokenQuantity);
        // placeholders for future: await clickBid(page) / await clickAsk(page)
        await browser.close();
        return;
    }

    if (mode === "lbank") {
        const tokenQuantity = getConfiguredTokenQuantity();
        const { browser, page } = await loginLbank({ headless: false });
        await openLbankFutures(page);
        await ensureLbankLoggedIn(page);
        await toggleOpenTab(page);
        await fillLbankTokenQuantity(page, tokenQuantity);
        console.log("Filled LBank token quantity:", tokenQuantity);
        // placeholders to be used as needed:
        // await clickOpenLong(page);
        // await clickOpenShort(page);
        // await toggleCloseTab(page);
        // await clickCloseShort(page);
        // await clickCloseLong(page);
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