import { MEXC_FUTURES_URL, mexcSelectors } from "./config.js";
import { saveCookies, loadCookies } from "../core/cookies.js";

export async function openMexcFutures(page) {
    await page.goto(MEXC_FUTURES_URL, { waitUntil: "networkidle2" });
}

export async function ensureMexcLoggedIn(page) {
    // If login button exists → not logged in
    const loginButton = await page.$(mexcSelectors.loginButton);
    const isLoggedOut = Boolean(loginButton);
    if (isLoggedOut) {
        throw new Error("MEXC not logged in. Please run login flow first.");
    }
    return true;
}

export async function fillTokenQuantity(page, tokenQuantity) {
    await page.waitForSelector(mexcSelectors.tokenQuantityInput, { visible: true });
    const input = await page.$(mexcSelectors.tokenQuantityInput);
    if (!input) throw new Error("Token quantity input not found");
    await input.click({ clickCount: 3 });
    await input.type(String(tokenQuantity), { delay: 20 });
}

export async function toggleOpenTab(page) {
    await page.click(mexcSelectors.openToggleButton);
}

export async function toggleCloseTab(page) {
    await page.click(mexcSelectors.closeToggleButton);
}

// Placeholders for future wiring once selectors provided
export async function clickBid(page) {
    if (!mexcSelectors.bidButton) throw new Error("Bid button selector not set yet");
    await page.click(mexcSelectors.bidButton);
}

export async function clickOpenLong(page) {
    if (!mexcSelectors.openLongButton) throw new Error("openLongButton selector not set yet");
    await page.click(mexcSelectors.openLongButton);
}

export async function clickOpenShort(page) {
    if (!mexcSelectors.openShortButton) throw new Error("openShortButton selector not set yet");
    await page.click(mexcSelectors.openShortButton);
}

export async function clickCloseShort(page) {
    if (!mexcSelectors.closeShortButton) throw new Error("closeShortButton selector not set yet");
    await page.click(mexcSelectors.closeShortButton);
}

export async function clickCloseLong(page) {
    if (!mexcSelectors.closeLongButton) throw new Error("closeLongButton selector not set yet");
    await page.click(mexcSelectors.closeLongButton);
}

export async function clickAsk(page) {
    if (!mexcSelectors.askButton) throw new Error("Ask button selector not set yet");
    await page.click(mexcSelectors.askButton);
}