import fs from "fs";
import path from "path";

export function getCookieStorePath(exchange) {
    const baseDir = path.resolve("src/Puppeteer Logic/.cookies");
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    return path.join(baseDir, `${exchange}.json`);
}

export async function saveCookies(page, exchange) {
    const cookies = await page.cookies();
    const filePath = getCookieStorePath(exchange);
    fs.writeFileSync(filePath, JSON.stringify(cookies, null, 2), "utf-8");
}

export async function loadCookies(page, exchange) {
    const filePath = getCookieStorePath(exchange);
    if (!fs.existsSync(filePath)) return false;
    try {
        const cookies = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (Array.isArray(cookies) && cookies.length > 0) {
            await page.setCookie(...cookies);
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}