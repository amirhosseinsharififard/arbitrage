import logger from "../logging/logger.js";

/**
 * Puppeteer integration scaffold to capture and log network requests/responses without performing actions.
 * The caller should provide a configured browser/page and wire credentials/click flows later.
 */
export async function attachRequestCapture(page) {
    if (!page) return;

    await page.setRequestInterception(true);

    page.on('request', async(req) => {
        try {
            await logger.logRequest({
                phase: 'request',
                url: req.url(),
                method: req.method(),
                headers: req.headers(),
                resourceType: req.resourceType(),
            });
            req.continue();
        } catch {
            try { req.continue(); } catch {}
        }
    });

    page.on('response', async(res) => {
        try {
            const basic = {
                phase: 'response',
                url: res.url(),
                status: res.status(),
                ok: res.ok(),
                headers: await res.headers(),
            };
            await logger.logRequest(basic);
        } catch {}
    });
}

export default { attachRequestCapture };