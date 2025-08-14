import { LBANK_FUTURES_URL, lbankSelectors, lbankButtonTexts } from "./config.js";

export async function openLbankFutures(page) {
    await page.goto(LBANK_FUTURES_URL, { waitUntil: "networkidle2" });
}

export async function ensureLbankLoggedIn(page) {
    // If BOTH login and register buttons exist → not logged in
    if (lbankSelectors.loginButton && lbankSelectors.registerButton) {
        const [loginButton, registerButton] = await Promise.all([
            page.$(lbankSelectors.loginButton),
            page.$(lbankSelectors.registerButton)
        ]);
        const isLoggedOut = Boolean(loginButton) && Boolean(registerButton);
        if (!isLoggedOut) return true;
    }
    // Positive indicator (CSS or XPath)
    if (lbankSelectors.loggedInIndicator) {
        const indicatorSelector = lbankSelectors.loggedInIndicator;
        if (indicatorSelector.includes("//") || indicatorSelector.startsWith("xpath:")) {
            const xpath = indicatorSelector.startsWith("xpath:") ? indicatorSelector.slice(6) : indicatorSelector;
            const handles = await page.$x(xpath);
            if (handles && handles.length > 0) return true;
        } else {
            const indicator = await page.$(indicatorSelector);
            if (indicator) return true;
        }
    }
    // If nothing matched, assume not logged in
    const err = new Error("LBank not logged in. Please run login flow first.");
    err.code = "LBANK_NOT_LOGGED_IN";
    throw err;
}

export async function fillTokenQuantity(page, tokenQuantity) {
    try {
        await page.waitForSelector(lbankSelectors.tokenQuantityInput, { visible: true, timeout: 5000 });
        const input = await page.$(lbankSelectors.tokenQuantityInput);
        if (!input) {
            const err = new Error("Token quantity input not found on LBank");
            err.code = "LBANK_QTY_INPUT_NOT_FOUND";
            throw err;
        }
        await input.click({ clickCount: 3 });
        await input.type(String(tokenQuantity), { delay: 20 });
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        console.error(`[LBANK][fillTokenQuantity] ${msg}`);
        throw e;
    }
}

export async function toggleOpenTab(page) {
    try {
        await page.click(lbankSelectors.openToggleButton);
    } catch (e) {
        console.error(`[LBANK][toggleOpenTab] ${e?.message || e}`);
        throw e;
    }
}

export async function clickOpenLong(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: lbankSelectors.openLongButton,
        textCandidates: lbankButtonTexts.openLong,
        containerSelector: lbankSelectors.openContainer,
    });
}

export async function clickOpenShort(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: lbankSelectors.openShortButton,
        textCandidates: lbankButtonTexts.openShort,
        containerSelector: lbankSelectors.openContainer,
    });
}

export async function toggleCloseTab(page) {
    try {
        await page.click(lbankSelectors.closeToggleButton);
    } catch (e) {
        console.error(`[LBANK][toggleCloseTab] ${e?.message || e}`);
        throw e;
    }
}

export async function clickCloseShort(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: lbankSelectors.closeShortButton,
        textCandidates: lbankButtonTexts.closeShort,
        containerSelector: lbankSelectors.closeContainer,
    });
}

export async function clickCloseLong(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: lbankSelectors.closeLongButton,
        textCandidates: lbankButtonTexts.closeLong,
        containerSelector: lbankSelectors.closeContainer,
    });
}

// Returns boolean login state without throwing
export async function detectLbankLoggedIn(page) {
    try {
        if (lbankSelectors.loginButton && lbankSelectors.registerButton) {
            const [loginButton, registerButton] = await Promise.all([
                page.$(lbankSelectors.loginButton),
                page.$(lbankSelectors.registerButton)
            ]);
            const isLoggedOut = Boolean(loginButton) && Boolean(registerButton);
            if (!isLoggedOut) return true;
        }
        if (lbankSelectors.loggedInIndicator) {
            const indicatorSelector = lbankSelectors.loggedInIndicator;
            if (indicatorSelector.includes("//") || indicatorSelector.startsWith("xpath:")) {
                const xpath = indicatorSelector.startsWith("xpath:") ? indicatorSelector.slice(6) : indicatorSelector;
                const handles = await page.$x(xpath);
                if (handles && handles.length > 0) return true;
            } else {
                const indicator = await page.$(indicatorSelector);
                if (indicator) return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

// Generic fallback clicker using visible text (mirrors MEXC behavior)
async function clickButtonWithFallback(page, options) {
    const { explicitSelector, textCandidates, containerSelector } = options || {};
    if (explicitSelector) {
        // Try CSS first
        const cssHandle = await page.$(explicitSelector).catch(() => null);
        if (cssHandle) {
            await page.click(explicitSelector);
            return;
        }
        // If it looks like an XPath, try XPath
        if (explicitSelector.includes("//") || explicitSelector.startsWith("xpath:")) {
            const xpath = explicitSelector.startsWith("xpath:") ? explicitSelector.slice(6) : explicitSelector;
            const xpathHandles = await page.$x(xpath);
            if (xpathHandles && xpathHandles.length > 0) {
                try {
                    await xpathHandles[0].evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
                } catch {}
                await xpathHandles[0].click();
                return;
            }
        }
    }

    const scope = containerSelector && (await page.$(containerSelector));
    for (const text of textCandidates || []) {
        const candidateSelectors = [
            `//button[normalize-space(.)='${text}']`,
            `//span[normalize-space(.)='${text}']/ancestor::button[1]`,
            `//div[normalize-space(.)='${text}']`,
            `//a[normalize-space(.)='${text}']`,
        ];
        for (const xpath of candidateSelectors) {
            const handles = scope ? await scope.$x(xpath) : await page.$x(xpath);
            if (handles && handles.length > 0) {
                try {
                    await handles[0].evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
                } catch {}
                await handles[0].click();
                return;
            }
        }
    }
    // Last resort: contains() partial match search
    for (const text of textCandidates || []) {
        const partials = [
            `//button[contains(normalize-space(.), '${text}')]`,
            `//span[contains(normalize-space(.), '${text}')]/ancestor::button[1]`,
            `//div[contains(normalize-space(.), '${text}')]`,
            `//a[contains(normalize-space(.), '${text}')]`,
        ];
        for (const xpath of partials) {
            const handles = scope ? await scope.$x(xpath) : await page.$x(xpath);
            if (handles && handles.length > 0) {
                try {
                    await handles[0].evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
                } catch {}
                await handles[0].click();
                return;
            }
        }
    }
    const err = new Error("Unable to locate target button by selector or visible text (LBank)");
    err.code = "LBANK_BUTTON_NOT_FOUND";
    throw err;
}

export async function isOnLbankFutures(page) {
    try {
        const url = (await page.url()).toLowerCase();
        return url.includes("/futures/");
    } catch {
        return false;
    }
}