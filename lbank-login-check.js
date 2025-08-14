import puppeteer from "puppeteer";

const LBANK_URL = "https://www.lbank.com/futures/debtusdt";

// If BOTH exist → NOT logged in
const lbankSelectors = {
    loginButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru header.sc-ddsBQL.creOle.lbank-header div.sc-gVzlyS.bOAGOz div.sc-dSyEWX.iMrMGA.header-right a button.sc-dIfARi.NrEWd.sc-fyBusP.klnJLS.login-button.lbank-btn.lbank-btn-secondary.lbank-btn-round.lbank-btn-ghost.lbank-btn-hovered span.sc-idXgbr.cBSEVq",
    registerButton: "html body div#__next section.sc-jgyNOb.jTLWIE.lbk-trading-layout.lbk-trading-layout-professional-right.adjustable.ru header.sc-ddsBQL.creOle.lbank-header div.sc-gVzlyS.bOAGOz div.sc-dSyEWX.iMrMGA.header-right a button.sc-dIfARi.NrEWd.sc-bGhRYA.iUuJhi.register-button.lbank-btn.lbank-btn-brand.lbank-btn-round.lbank-btn-hovered span.sc-idXgbr.cBSEVq",
};

async function main() {
    let browser;
    let isLoggedIn = false;
    let isOnTarget = false;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 800 },
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.goto(LBANK_URL, { waitUntil: "networkidle2", timeout: 60000 });
        // Wait a bit for dynamic header to render
        await new Promise((r) => setTimeout(r, 5000));

        async function isOnTargetPage() {
            try {
                const url = (await page.url()).toLowerCase();
                return url.includes("/futures/debtusdt");
            } catch {
                return false;
            }
        }

        async function checkLoginOnce() {
            try {
                const onTargetNow = await isOnTargetPage();
                if (!onTargetNow) {
                    if (isOnTarget) {
                        console.log("[LBANK LOGIN CHECK] Left target page. Waiting to return...");
                    }
                    isOnTarget = false;
                    return;
                }

                // We are on target page
                if (!isOnTarget) {
                    isOnTarget = true;
                    console.log("[LBANK LOGIN CHECK] On target page.");
                }

                const [loginEl, registerEl] = await Promise.all([
                    page.$(lbankSelectors.loginButton),
                    page.$(lbankSelectors.registerButton),
                ]);
                const isLoggedOutNow = Boolean(loginEl) && Boolean(registerEl);
                if (isLoggedOutNow) {
                    if (isLoggedIn) {
                        isLoggedIn = false;
                        console.log("[LBANK LOGIN CHECK] DETECTED LOGOUT");
                    } else {
                        console.log("[LBANK LOGIN CHECK] NOT LOGGED IN");
                    }
                } else if (!isLoggedIn) {
                    isLoggedIn = true;
                    console.log("[LBANK LOGIN CHECK] LOGGED IN ✅");
                }
            } catch (e) {
                console.log("[LBANK LOGIN CHECK] CHECK ERROR:", (e && e.message) ? e.message : e);
            }
        }

        // Initial check and interval every 5 seconds
        await checkLoginOnce();
        const intervalId = setInterval(checkLoginOnce, 5000);

        // React immediately to navigations (SPA route changes included)
        page.on('framenavigated', () => {
            checkLoginOnce();
        });

        console.log("Press Ctrl+C to close the browser... (login state persists in-memory until process exits)");
        // Keep process alive to observe the page; exit with Ctrl+C
        await new Promise(() => {});
    } catch (err) {
        console.error("[LBANK LOGIN CHECK] ERROR:", (err && err.message) ? err.message : err);
        if (browser) {
            try { await browser.close(); } catch {}
        }
        process.exit(1);
    }
}

main();