import logger from "../logging/logger.js";

/**
 * Puppeteer request recorder scaffold.
 * Intentionally does NOT navigate anywhere by default. Use from a config-driven caller.
 */
export class RequestRecorder {
    constructor(page) {
        this.page = page;
        this.isAttached = false;
    }

    async attach() {
        if (!this.page || this.isAttached) return;
        this.isAttached = true;
        this.page.on('request', (req) => {
            try {
                const data = {
                    event: 'request',
                    method: req.method(),
                    url: req.url(),
                    headers: req.headers(),
                    postData: req.postData() || null
                };
                logger.logRequest(data);
            } catch {}
        });

        this.page.on('response', async (res) => {
            try {
                const request = res.request();
                const data = {
                    event: 'response',
                    url: res.url(),
                    status: res.status(),
                    ok: res.ok(),
                    timing: typeof res.timing === 'function' ? res.timing() : undefined,
                    request: {
                        method: request && typeof request.method === 'function' ? request.method() : undefined,
                        url: request && typeof request.url === 'function' ? request.url() : undefined
                    }
                };
                logger.logRequest(data);
            } catch {}
        });
    }
}

const requestRecorder = {
    create: (page) => new RequestRecorder(page)
};

export default requestRecorder;