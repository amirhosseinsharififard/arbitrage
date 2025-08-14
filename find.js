import ccxt from 'ccxt';

(async() => {
    try {
        const lbank = new ccxt.lbank();
        await lbank.loadMarkets();
        const symbols = Object.keys(lbank.markets).filter(s => s.includes('DEBT'));
        if (symbols.length > 0) {
            console.log('📌 سمبل‌های موجود برای DEBT در LBank:');
            symbols.forEach(s => console.log(' -', s));
        } else {
            console.log('❌ هیچ سمبلی با نام DEBT در LBank پیدا نشد.');
        }
    } catch (err) {
        console.error('خطا:', err);
    }
})();