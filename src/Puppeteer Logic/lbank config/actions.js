import { LBANK_FUTURES_URL, lbankSelectors } from "./config.js";

export async function openLbankFutures(page) {
    await page.goto(LBANK_FUTURES_URL, { waitUntil: "networkidle2" });
}

export async function ensureLbankLoggedIn(page) {
    // If BOTH login and register buttons exist → not logged in (CSS to be provided later)
    if (lbankSelectors.loginButton && lbankSelectors.registerButton) {
        const [loginButton, registerButton] = await Promise.all([
            page.$(lbankSelectors.loginButton),
            page.$(lbankSelectors.registerButton)
        ]);
        const isLoggedOut = Boolean(loginButton) && Boolean(registerButton);
        if (isLoggedOut) throw new Error("LBank not logged in. Please run login flow first.");
        return true;
    }
    // Fallback: use loginIndicator (avatar etc.) if provided
    if (lbankSelectors.loginIndicator) {
        const indicator = await page.$(lbankSelectors.loginIndicator);
        if (!indicator) throw new Error("LBank not logged in. Please run login flow first.");
        return true;
    }
    // If nothing provided, assume not logged in to be safe
    throw new Error("LBank login selectors not configured. Please provide loginButton/registerButton or loginIndicator.");
}

export async function fillTokenQuantity(page, tokenQuantity) {
    await page.waitForSelector(lbankSelectors.tokenQuantityInput, { visible: true });
    const input = await page.$(lbankSelectors.tokenQuantityInput);
    if (!input) throw new Error("Token quantity input not found on LBank");
    await input.click({ clickCount: 3 });
    await input.type(String(tokenQuantity), { delay: 20 });
}

export async function toggleOpenTab(page) {
    await page.click(lbankSelectors.openToggleButton);
}

export async function clickOpenLong(page) {
    await page.click(lbankSelectors.openLongButton);
}

export async function clickOpenShort(page) {
    await page.click(lbankSelectors.openShortButton);
}

export async function toggleCloseTab(page) {
    await page.click(lbankSelectors.closeToggleButton);
}

export async function clickCloseShort(page) {
    await page.click(lbankSelectors.closeShortButton);
}

export async function clickCloseLong(page) {
    await page.click(lbankSelectors.closeLongButton);
}