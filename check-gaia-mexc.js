import ccxt from 'ccxt';

async function getGaiaBidAsk() {
    const mexc = new ccxt.mexc({ enableRateLimit: true });

    const symbols = [
        'GAIA/USDT', // اسپات
        'GAIA/USDT:USDT' // پرپچوال
    ];

    for (const symbol of symbols) {
        try {
            const ticker = await mexc.fetchTicker(symbol);
            console.log(`\n=== ${symbol} ===`);
            console.log(`💰 Bid (بالاترین خرید): ${ticker.bid}`);
            console.log(`🏷️ Ask (پایین‌ترین فروش): ${ticker.ask}`);
        } catch (err) {
            console.log(`❌ خطا در دریافت ${symbol}:`, err.message);
        }
    }
}

getGaiaBidAsk();