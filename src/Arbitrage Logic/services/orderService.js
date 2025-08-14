import exchangeManager from "../exchanges/exchangeManager.js";
import logger from "../logging/logger.js";
import config from "../config/config.js";

function toMessage(err) {
    try {
        return (err && err.message) ? err.message : String(err);
    } catch (_) {
        return String(err);
    }
}

export async function createMarketOrder(exchangeId, symbol, side, amount, params = {}) {
    const ex = exchangeManager.getExchange(exchangeId);
    try {
        const type = (config && config.orderExecution && config.orderExecution.orderType) || "market";
        const order = await ex.createOrder(symbol, type, side, amount, undefined, params);
        await logger.logTrade("ORDER_EXECUTION", symbol, {
            exchangeId,
            side,
            amount,
            params,
            orderId: (order && order.id) ? order.id : null,
            raw: order || null,
        });
        return order;
    } catch (err) {
        const msg = toMessage(err);
        await logger.logTrade("ORDER_ERROR", symbol, { exchangeId, side, amount, params, error: msg });
        throw err;
    }
}

export async function openArbitrageLegs({ buyExchangeId, sellExchangeId, symbol, volume }) {
    // Buy (open long) on buyExchangeId; Sell (open short) on sellExchangeId
    const buyExchangeCfg = (config && config.exchanges && config.exchanges[buyExchangeId]) || {};
    const sellExchangeCfg = (config && config.exchanges && config.exchanges[sellExchangeId]) || {};
    const buyParams = {...(buyExchangeCfg.params && buyExchangeCfg.params.openLong), ...(config.orderExecution.extraParams[buyExchangeId] ? .openLong || {}) };
    const sellParams = {...(sellExchangeCfg.params && sellExchangeCfg.params.openShort), ...(config.orderExecution.extraParams[sellExchangeId] ? .openShort || {}) };
    const [buyOrder, sellOrder] = await Promise.all([
        createMarketOrder(buyExchangeId, symbol, "buy", volume, buyParams),
        createMarketOrder(sellExchangeId, symbol, "sell", volume, sellParams),
    ]);
    return { buyOrder, sellOrder };
}

export async function closeArbitrageLegs({ buyExchangeId, sellExchangeId, symbol, volume }) {
    // Close long on buyExchangeId by SELL reduce-only; Close short on sellExchangeId by BUY reduce-only
    const buyExchangeCfg = (config && config.exchanges && config.exchanges[buyExchangeId]) || {};
    const sellExchangeCfg = (config && config.exchanges && config.exchanges[sellExchangeId]) || {};
    const sellParams = {...(buyExchangeCfg.params && buyExchangeCfg.params.closeLong), ...(config.orderExecution.extraParams[buyExchangeId] ? .closeLong || {}) };
    const buyParams = {...(sellExchangeCfg.params && sellExchangeCfg.params.closeShort), ...(config.orderExecution.extraParams[sellExchangeId] ? .closeShort || {}) };
    const [closeLongOrder, closeShortOrder] = await Promise.all([
        createMarketOrder(buyExchangeId, symbol, "sell", volume, sellParams),
        createMarketOrder(sellExchangeId, symbol, "buy", volume, buyParams),
    ]);
    return { closeLongOrder, closeShortOrder };
}