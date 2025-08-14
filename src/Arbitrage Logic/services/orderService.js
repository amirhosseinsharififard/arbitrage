import exchangeManager from "../exchanges/exchangeManager.js";
import logger from "../logging/logger.js";
import config from "../config/config.js";
import requestRecorder from "../services/requestRecorder.js";
import priceService from "./priceService.js";

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
        const start = Date.now();
        let order;
        let priceArg = undefined;
        if (type === "market" && String(side).toLowerCase() === "buy") {
            try {
                const p = await priceService.getPrice(exchangeId, symbol);
                if (p && typeof p.ask === 'number' && isFinite(p.ask) && p.ask > 0) {
                    priceArg = p.ask;
                }
            } catch {}
        }
        try {
            order = await ex.createOrder(symbol, type, side, amount, priceArg, params);
        } finally {
            const end = Date.now();
            if (requestRecorder && requestRecorder.setEnabled) requestRecorder.setEnabled(true);
            if (requestRecorder && requestRecorder.recordRequestCycle) {
                requestRecorder.recordRequestCycle({
                    request: { method: 'createOrder', url: `${ex.id}:${symbol}`, headers: {}, body: { type, side, amount, price: priceArg, params }, exchangeId, symbol },
                    response: { status: order ? 200 : 'UNKNOWN', headers: {}, body: order || null, exchangeId, symbol },
                    startTime: start,
                    endTime: end
                });
            }
            if (config.logSettings.printRequestsToConsole) {
                console.log(`[API][${exchangeId}] createOrder ${symbol} ${side} ${amount} price=${priceArg ?? 'NA'} ->`, order);
            }
        }
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
    const extraBuy = (config && config.orderExecution && config.orderExecution.extraParams && config.orderExecution.extraParams[buyExchangeId] && config.orderExecution.extraParams[buyExchangeId].openLong) || {};
    const extraSell = (config && config.orderExecution && config.orderExecution.extraParams && config.orderExecution.extraParams[sellExchangeId] && config.orderExecution.extraParams[sellExchangeId].openShort) || {};
    const buyParams = {...(buyExchangeCfg.params && buyExchangeCfg.params.openLong), ...extraBuy };
    const sellParams = {...(sellExchangeCfg.params && sellExchangeCfg.params.openShort), ...extraSell };
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
    const extraCloseLong = (config && config.orderExecution && config.orderExecution.extraParams && config.orderExecution.extraParams[buyExchangeId] && config.orderExecution.extraParams[buyExchangeId].closeLong) || {};
    const extraCloseShort = (config && config.orderExecution && config.orderExecution.extraParams && config.orderExecution.extraParams[sellExchangeId] && config.orderExecution.extraParams[sellExchangeId].closeShort) || {};
    const sellParams = {...(buyExchangeCfg.params && buyExchangeCfg.params.closeLong), ...extraCloseLong };
    const buyParams = {...(sellExchangeCfg.params && sellExchangeCfg.params.closeShort), ...extraCloseShort };
    const [closeLongOrder, closeShortOrder] = await Promise.all([
        createMarketOrder(buyExchangeId, symbol, "sell", volume, sellParams),
        createMarketOrder(sellExchangeId, symbol, "buy", volume, buyParams),
    ]);
    return { closeLongOrder, closeShortOrder };
}