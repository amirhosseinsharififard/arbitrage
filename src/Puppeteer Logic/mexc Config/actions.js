import { MEXC_FUTURES_URL, mexcSelectors, mexcButtonTexts } from "./config.js";
import { saveCookies, loadCookies } from "../core/cookies.js";

export async function openMexcFutures(page) {
    await page.goto(MEXC_FUTURES_URL, { waitUntil: "networkidle2" });
}

export async function ensureMexcLoggedIn(page) {
    // If BOTH login and register buttons exist → not logged in
    const [loginButton, registerButton] = await Promise.all([
        page.$(mexcSelectors.loginButton),
        page.$(mexcSelectors.registerButton)
    ]);
    const isLoggedOut = Boolean(loginButton) && Boolean(registerButton);
    if (!isLoggedOut) {
        return true;
    }
    // Fallback: check explicit logged-in indicator XPath if provided
    if (mexcSelectors.loggedInIndicator) {
        const indicatorXPath = mexcSelectors.loggedInIndicator.startsWith("xpath:")
            ? mexcSelectors.loggedInIndicator.slice(6)
            : mexcSelectors.loggedInIndicator;
        try {
            const handles = await page.$x(indicatorXPath);
            if (handles && handles.length > 0) {
                return true;
            }
        } catch {}
    }
    throw new Error("MEXC not logged in. Please run login flow first.");
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
    await clickButtonWithFallback(page, {
        explicitSelector: mexcSelectors.openLongButton,
        textCandidates: mexcButtonTexts.openLong,
        containerSelector: mexcSelectors.openContainer,
    });
}

export async function clickOpenShort(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: mexcSelectors.openShortButton,
        textCandidates: mexcButtonTexts.openShort,
        containerSelector: mexcSelectors.openContainer,
    });
}

export async function clickCloseShort(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: mexcSelectors.closeShortButton,
        textCandidates: mexcButtonTexts.closeShort,
        containerSelector: mexcSelectors.closeContainer,
    });
}

export async function clickCloseLong(page) {
    await clickButtonWithFallback(page, {
        explicitSelector: mexcSelectors.closeLongButton,
        textCandidates: mexcButtonTexts.closeLong,
        containerSelector: mexcSelectors.closeContainer,
    });
}

// Returns boolean login state without throwing
export async function detectMexcLoggedIn(page) {
    try {
        const [loginButton, registerButton] = await Promise.all([
            page.$(mexcSelectors.loginButton),
            page.$(mexcSelectors.registerButton)
        ]);
        const isLoggedOut = Boolean(loginButton) && Boolean(registerButton);
        if (!isLoggedOut) return true;
        // If logged-out by buttons logic, try positive indicator
        if (mexcSelectors.loggedInIndicator) {
            const indicatorXPath = mexcSelectors.loggedInIndicator.startsWith("xpath:")
                ? mexcSelectors.loggedInIndicator.slice(6)
                : mexcSelectors.loggedInIndicator;
            const handles = await page.$x(indicatorXPath);
            if (handles && handles.length > 0) return true;
        }
        return false;
    } catch {
        return false;
    }
}

export async function isOnMexcFutures(page) {
    try {
        const url = (await page.url()).toLowerCase();
        return url.includes("/futures/");
    } catch {
        return false;
    }
}

export async function clickAsk(page) {
    if (!mexcSelectors.askButton) throw new Error("Ask button selector not set yet");
    await page.click(mexcSelectors.askButton);
}

// Generic fallback clicker using visible text
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
        // Try multiple element types commonly used for buttons
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
    throw new Error("Unable to locate target button by selector or visible text");
}