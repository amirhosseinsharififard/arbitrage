const openApprovalByExchange = new Map();
const closeApprovalByExchange = new Map();

function normalizeExchangeId(exchange) {
    return String(exchange || "").toLowerCase();
}

export function setOpenApproved(exchange, approved) {
    openApprovalByExchange.set(normalizeExchangeId(exchange), Boolean(approved));
}

export function setCloseApproved(exchange, approved) {
    closeApprovalByExchange.set(normalizeExchangeId(exchange), Boolean(approved));
}

export function isOpenApproved(exchange) {
    const key = normalizeExchangeId(exchange);
    if (openApprovalByExchange.has(key)) return openApprovalByExchange.get(key);
    const env = process.env.PUPPETEER_AUTO_APPROVE_OPEN;
    return env === "1" || env === "true";
}

export function isCloseApproved(exchange) {
    const key = normalizeExchangeId(exchange);
    if (closeApprovalByExchange.has(key)) return closeApprovalByExchange.get(key);
    const env = process.env.PUPPETEER_AUTO_APPROVE_CLOSE;
    return env === "1" || env === "true";
}