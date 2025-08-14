/*
 Selector presence test for MEXC and LBank futures UIs
 - Verifies configured CSS/XPath selectors
 - Falls back to visible text for action buttons (English + Persian)
 - Logs PASS/FAIL per item without performing trades
 */

import { launchBrowser, newPage } from "./core/browser.js";
import { MEXC_FUTURES_URL, mexcSelectors, mexcButtonTexts } from "./mexc Config/config.js";
import { LBANK_FUTURES_URL, lbankSelectors, lbankButtonTexts } from "./lbank config/config.js";

async function queryBySelector(page, selector) {
    if (!selector) return null;
    try {
        if (selector.startsWith("xpath:") || selector.includes("//")) {
            const xpath = selector.startsWith("xpath:") ? selector.slice(6) : selector;
            const handles = await page.$x(xpath);
            return handles[0] || null;
        }
        return await page.$(selector);
    } catch {
        return null;
    }
}

async function findByTextCandidates(page, { containerHandle = null, texts = [] }) {
    // Try exact matches first, then partial contains
    const exactTemplates = [
        (t) => `//button[normalize-space(.)='${t}']`,
        (t) => `//span[normalize-space(.)='${t}']/ancestor::button[1]`,
        (t) => `//div[normalize-space(.)='${t}']`,
        (t) => `//a[normalize-space(.)='${t}']`,
    ];
    const partialTemplates = [
        (t) => `//button[contains(normalize-space(.), '${t}')]`,
        (t) => `//span[contains(normalize-space(.), '${t}')]/ancestor::button[1]`,
        (t) => `//div[contains(normalize-space(.), '${t}')]`,
        (t) => `//a[contains(normalize-space(.), '${t}')]`,
    ];

    const exec = async(templates) => {
        for (const text of texts) {
            for (const tpl of templates) {
                const xpath = tpl(text);
                const handles = containerHandle ? await containerHandle.$x(xpath) : await page.$x(xpath);
                if (handles && handles.length > 0) {
                    return handles[0];
                }
            }
        }
        return null;
    };

    return (await exec(exactTemplates)) || (await exec(partialTemplates));
}

async function evaluateLoginState(page, { loginButton, registerButton, loggedInIndicator }) {
    const [loginEl, registerEl, loggedInEl] = await Promise.all([
        queryBySelector(page, loginButton),
        queryBySelector(page, registerButton),
        queryBySelector(page, loggedInIndicator || ""),
    ]);
    if (loggedInEl) return { isLoggedIn: true, basis: "loggedInIndicator" };
    if (loginEl && registerEl) return { isLoggedIn: false, basis: "login+register visible" };
    return { isLoggedIn: null, basis: "indeterminate" };
}

async function testExchange(page, label, url, selectors, buttonTexts) {
    const results = [];
    const record = (name, ok, note = "") => results.push({ name, ok, note });

    await page.goto(url, { waitUntil: "networkidle2" });

    // Login state
    const loginState = await evaluateLoginState(page, selectors);
    record("loginState", loginState.isLoggedIn !== null, `${loginState.isLoggedIn === true ? "LOGGED-IN" : loginState.isLoggedIn === false ? "LOGGED-OUT" : "UNKNOWN"} (${loginState.basis})`);

    // Basic selectors
    for (const key of[
            "tokenQuantityInput",
            "openToggleButton",
            "closeToggleButton",
        ]) {
        const handle = await queryBySelector(page, selectors[key]);
        record(key, Boolean(handle));
    }

    // Containers (optional)
    const openContainerHandle = selectors.openContainer ? await queryBySelector(page, selectors.openContainer) : null;
    const closeContainerHandle = selectors.closeContainer ? await queryBySelector(page, selectors.closeContainer) : null;

    // Action buttons: try explicit first; if missing, fallback via text candidates
    const actionMatrix = [
        { key: "openLongButton", texts: buttonTexts.openLong, container: openContainerHandle },
        { key: "openShortButton", texts: buttonTexts.openShort, container: openContainerHandle },
        { key: "closeLongButton", texts: buttonTexts.closeLong, container: closeContainerHandle },
        { key: "closeShortButton", texts: buttonTexts.closeShort, container: closeContainerHandle },
    ];

    for (const { key, texts, container }
        of actionMatrix) {
        let handle = await queryBySelector(page, selectors[key]);
        let note = "explicit";
        if (!handle) {
            handle = await findByTextCandidates(page, { containerHandle: container, texts });
            note = handle ? "fallback-text" : note;
        }
        record(key, Boolean(handle), note);
    }

    // Output
    console.log(`\n[CHECK] ${label} @ ${url}`);
    for (const { name, ok, note }
        of results) {
        console.log(`${ok ? "PASS" : "FAIL"} - ${name}${note ? ` (${note})` : ""}`);
    }
}

async function main() {
    const browser = await launchBrowser({ headless: process.env.PUPPETEER_HEADLESS ?? "new" });
    const page = await newPage(browser);
    try {
        await testExchange(page, "MEXC", MEXC_FUTURES_URL, mexcSelectors, mexcButtonTexts);
        await testExchange(page, "LBank", LBANK_FUTURES_URL, lbankSelectors, lbankButtonTexts);
    } catch (err) {
        console.error(`[TEST] Error: ${err?.message || err}`);
    } finally {
        await browser.close();
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}