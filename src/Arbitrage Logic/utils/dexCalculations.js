/**
 * DEX (Decentralized Exchange) Calculation Utilities
 * 
 * این ماژول شامل تمام محاسبات مربوط به دکس است که از تکرار کد جلوگیری می‌کند
 * و منطق محاسبات را در یک مکان متمرکز نگه می‌دارد.
 * 
 * فرمول اصلی: calculatePriceDifference(buyPrice, sellPrice) با علامت برعکس
 * Formula: (((sellPrice - buyPrice) / buyPrice) * 100) * -1
 * 
 * منطق:
 * - buyPrice = قیمت دکس (خرید از دکس)
 * - sellPrice = قیمت صرافی (فروش در صرافی)
 * - مثبت = سود (صرافی گران‌تر از دکس)
 * - منفی = زیان (صرافی ارزان‌تر از دکس)
 */

/**
 * محاسبه درصد تفاوت قیمت دکس نسبت به صرافی
 * @param {number} dexPrice - قیمت دکس (buyPrice)
 * @param {number} exchangePrice - قیمت صرافی (sellPrice)
 * @returns {string} درصد تفاوت با 3 رقم اعشار یا 'N/A'
 */
export function calculateDEXPriceDifference(dexPrice, exchangePrice) {
    if (!dexPrice || !exchangePrice || dexPrice <= 0 || exchangePrice <= 0) {
        return 'N/A';
    }
    
    // فرمول: ((sellPrice - buyPrice) / buyPrice) * 100 (بدون ضرب در -1)
    const difference = ((exchangePrice - dexPrice) / dexPrice * 100);
    return difference.toFixed(3);
}

/**
 * تشخیص نوع صرافی (دکس یا عادی)
 * @param {string} exchangeId - شناسه صرافی
 * @returns {boolean} true اگر دکس باشد
 */
export function isDEXExchange(exchangeId) {
    const dexExchanges = ['dexscreener', 'uniswap', 'pancakeswap', 'sushiswap'];
    return dexExchanges.includes(exchangeId.toLowerCase());
}

/**
 * شناسایی صرافی دکس و عادی در یک جفت
 * @param {object} exchangeA - اطلاعات صرافی A
 * @param {object} exchangeB - اطلاعات صرافی B  
 * @param {string} exchangeAId - شناسه صرافی A
 * @param {string} exchangeBId - شناسه صرافی B
 * @returns {object} {dexExchange, regularExchange, dexId, regularId}
 */
export function identifyDEXAndRegularExchange(exchangeA, exchangeB, exchangeAId, exchangeBId) {
    const isADex = isDEXExchange(exchangeAId);
    const isBDex = isDEXExchange(exchangeBId);
    
    if (isADex && !isBDex) {
        return {
            dexExchange: exchangeA,
            regularExchange: exchangeB,
            dexId: exchangeAId,
            regularId: exchangeBId
        };
    } else if (!isADex && isBDex) {
        return {
            dexExchange: exchangeB,
            regularExchange: exchangeA,
            dexId: exchangeBId,
            regularId: exchangeAId
        };
    }
    
    return null; // هیچ کدام دکس نیستند یا هر دو دکس هستند
}

/**
 * محاسبه درصد BID دکس نسبت به BID صرافی
 * @param {object} dexExchange - اطلاعات صرافی دکس
 * @param {object} regularExchange - اطلاعات صرافی عادی
 * @returns {string} درصد محاسبه شده
 */
export function calculateDEXBidPercentage(dexExchange, regularExchange) {
    return calculateDEXPriceDifference(dexExchange.bid, regularExchange.bid);
}

/**
 * محاسبه درصد BID دکس نسبت به ASK صرافی
 * @param {object} dexExchange - اطلاعات صرافی دکس
 * @param {object} regularExchange - اطلاعات صرافی عادی
 * @returns {string} درصد محاسبه شده
 */
export function calculateDEXAskPercentage(dexExchange, regularExchange) {
    return calculateDEXPriceDifference(dexExchange.bid, regularExchange.ask);
}

/**
 * تولید HTML برای سلول دکس - ردیف اول (BID)
 * @param {object} dexExchange - اطلاعات صرافی دکس
 * @param {object} regularExchange - اطلاعات صرافی عادی
 * @param {string} regularId - شناسه صرافی عادی
 * @returns {string} HTML سلول
 */
export function generateDEXBidCellHTML(dexExchange, regularExchange, regularId) {
    const percentage = calculateDEXBidPercentage(dexExchange, regularExchange);
    const spreadClass = parseFloat(percentage) > 0 ? 'profit' : 'loss';
    
    return `
        <td class="exchange-cell dex-cell">
            <div class="price-pair">
                <div class="price-row">
                    <span class="dex-bid">DEX: ${dexExchange.bid ? '$' + dexExchange.bid.toFixed(6) : 'N/A'}</span>
                    <span class="separator">vs</span>
                    <span class="bid-price">BID: ${regularExchange.bid ? '$' + regularExchange.bid.toFixed(6) : 'N/A'}</span>
                </div>
                <div class="spread-row">
                    <span class="spread ${spreadClass}">BID: ${percentage}%</span>
                </div>
            </div>
        </td>
    `;
}

/**
 * تولید HTML برای سلول دکس - ردیف دوم (ASK)
 * @param {object} dexExchange - اطلاعات صرافی دکس
 * @param {object} regularExchange - اطلاعات صرافی عادی
 * @param {string} regularId - شناسه صرافی عادی
 * @returns {string} HTML سلول
 */
export function generateDEXAskCellHTML(dexExchange, regularExchange, regularId) {
    const percentage = calculateDEXAskPercentage(dexExchange, regularExchange);
    const spreadClass = parseFloat(percentage) > 0 ? 'profit' : 'loss';
    
    return `
        <td class="exchange-cell dex-cell">
            <div class="price-pair">
                <div class="price-row">
                    <span class="dex-bid">DEX: ${dexExchange.bid ? '$' + dexExchange.bid.toFixed(6) : 'N/A'}</span>
                    <span class="separator">vs</span>
                    <span class="ask-price">ASK: ${regularExchange.ask ? '$' + regularExchange.ask.toFixed(6) : 'N/A'}</span>
                </div>
                <div class="spread-row">
                    <span class="spread ${spreadClass}">ASK: ${percentage}%</span>
                </div>
            </div>
        </td>
    `;
}

/**
 * تولید هدر برای جفت دکس
 * @param {string} dexId - شناسه صرافی دکس
 * @param {string} regularId - شناسه صرافی عادی
 * @returns {string} HTML هدر
 */
export function generateDEXPairHeader(dexId, regularId) {
    const regularName = regularId.toUpperCase();
    return `
        <th class="exchange-header dex-header">
            🟢 DEX vs ${regularName}
            <br>
            <small class="dex-sub-label">Bid/Ask محاسبات</small>
        </th>
    `;
}

/**
 * محاسبه تمام درصدهای دکس برای یک جفت
 * @param {object} dexExchange - اطلاعات صرافی دکس
 * @param {object} regularExchange - اطلاعات صرافی عادی
 * @returns {object} {bidPercentage, askPercentage}
 */
export function calculateAllDEXPercentages(dexExchange, regularExchange) {
    return {
        bidPercentage: calculateDEXBidPercentage(dexExchange, regularExchange),
        askPercentage: calculateDEXAskPercentage(dexExchange, regularExchange)
    };
}

/**
 * بررسی اینکه آیا محاسبه دکس سودآور است
 * @param {string} percentage - درصد محاسبه شده
 * @param {number} minProfitThreshold - حداقل آستانه سود (پیش‌فرض: 0.5%)
 * @returns {boolean} true اگر سودآور باشد
 */
export function isDEXCalculationProfitable(percentage, minProfitThreshold = 0.5) {
    if (percentage === 'N/A') return false;
    return parseFloat(percentage) >= minProfitThreshold;
}

export default {
    calculateDEXPriceDifference,
    isDEXExchange,
    identifyDEXAndRegularExchange,
    calculateDEXBidPercentage,
    calculateDEXAskPercentage,
    generateDEXBidCellHTML,
    generateDEXAskCellHTML,
    generateDEXPairHeader,
    calculateAllDEXPercentages,
    isDEXCalculationProfitable
};
