import config from "../Arbitrage Logic/config/config.js";
import { retryWrapper } from "../Arbitrage Logic/error/errorBoundory.js";

import { loginMexc } from "./mexc Config/login.js";
import { openMexcFutures, ensureMexcLoggedIn, detectMexcLoggedIn, isOnMexcFutures, fillTokenQuantity as fillMexcTokenQuantity, toggleOpenTab as mexcToggleOpenTab, toggleCloseTab as mexcToggleCloseTab } from "./mexc Config/actions.js";

import { loginLbank } from "./lbank config/login.js";
import { openLbankFutures, ensureLbankLoggedIn, detectLbankLoggedIn, isOnLbankFutures, fillTokenQuantity as fillLbankTokenQuantity, toggleOpenTab as lbankToggleOpenTab, toggleCloseTab as lbankToggleCloseTab } from "./lbank config/actions.js";

const state = {
    mexc: { browser: null, page: null },
    lbank: { browser: null, page: null }
};

async function launchMexc() {
    const { browser, page } = await loginMexc({ headless: false });
    state.mexc = { browser, page };
    try {
        await openMexcFutures(page);
        await ensureMexcLoggedIn(page);
        console.log("[PUPPETEER] MEXC page ready");
        // Poll login state and page context every 5s
        setInterval(async() => {
            const onTarget = await isOnMexcFutures(page);
            const loggedIn = await detectMexcLoggedIn(page);
            state.mexc.isOnTarget = onTarget;
            state.mexc.isLoggedIn = loggedIn;
        }, 5000);
    } catch (err) {
        console.log("[PUPPETEER] MEXC login required. Please login in the opened window.");
    }
}

async function launchLbank() {
    const { browser, page } = await loginLbank({ headless: false });
    state.lbank = { browser, page };
    try {
        await openLbankFutures(page);
        await ensureLbankLoggedIn(page);
        console.log("[PUPPETEER] LBank page ready");
        // Poll login state and page context every 5s
        setInterval(async() => {
            const onTarget = await isOnLbankFutures(page);
            const loggedIn = await detectLbankLoggedIn(page);
            state.lbank.isOnTarget = onTarget;
            state.lbank.isLoggedIn = loggedIn;
        }, 5000);
    } catch (err) {
        console.log("[PUPPETEER] LBank login required. Please login in the opened window.");
    }
}

export async function startPuppeteerController() {
    try {
        console.log("[PUPPETEER] Launching browsers...");
        await Promise.allSettled([
            retryWrapper(launchMexc),
            retryWrapper(launchLbank)
        ]);
        console.log("[PUPPETEER] Initialization complete. Windows should be open.");
        // Attach stop to exit handler if available
        try {
            const exitHandlerModule = await
            import ("../Arbitrage Logic/system/exitHandler.js");
            const exitHandler = exitHandlerModule.default;
            if (exitHandler && typeof exitHandler.addExitHandler === 'function') {
                exitHandler.addExitHandler(async() => {
                    await stopPuppeteerController();
                });
            }
        } catch {}
    } catch (error) {
        console.error(`[PUPPETEER] Failed to initialize controller: ${error?.message || error}`);
    }
}

export function getPuppeteerPages() {
    return {
        mexc: state.mexc.page,
        lbank: state.lbank.page
    };
}

// These APIs should be called by arbitrage logic only after confirmation
export async function requestOpenPosition(exchange, tokenQuantity, confirmed = false) {
    if (!confirmed) return;
    if (exchange === "mexc" && state.mexc.page) {
        if (!state.mexc.isLoggedIn) throw new Error("MEXC not logged in. Open position UI action blocked.");
        await mexcToggleOpenTab(state.mexc.page);
        await fillMexcTokenQuantity(state.mexc.page, Number(tokenQuantity || config.targetTokenQuantity));
        console.log("[PUPPETEER] MEXC token quantity prepared for open.");
        return;
    }
    if (exchange === "lbank" && state.lbank.page) {
        if (!state.lbank.isLoggedIn) throw new Error("LBank not logged in. Open position UI action blocked.");
        await lbankToggleOpenTab(state.lbank.page);
        await fillLbankTokenQuantity(state.lbank.page, Number(tokenQuantity || config.targetTokenQuantity));
        console.log("[PUPPETEER] LBank token quantity prepared for open.");
        return;
    }
}

export async function requestClosePosition(exchange, confirmed = false) {
    if (!confirmed) return;
    if (exchange === "mexc" && state.mexc.page) {
        if (!state.mexc.isLoggedIn) throw new Error("MEXC not logged in. Close UI action blocked.");
        await mexcToggleCloseTab(state.mexc.page);
        console.log("[PUPPETEER] MEXC switched to Close tab.");
        return;
    }
    if (exchange === "lbank" && state.lbank.page) {
        if (!state.lbank.isLoggedIn) throw new Error("LBank not logged in. Close UI action blocked.");
        await lbankToggleCloseTab(state.lbank.page);
        console.log("[PUPPETEER] LBank switched to Close tab.");
        return;
    }
}

export async function stopPuppeteerController() {
    for (const key of Object.keys(state)) {
        try {
            if (state[key].browser) {
                await state[key].browser.close();
            }
        } catch (e) {
            // noop
        } finally {
            state[key] = { browser: null, page: null };
        }
    }
}