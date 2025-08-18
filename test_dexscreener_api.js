import config from './src/Arbitrage Logic/config/config.js';
import { dexscreenerApiService } from './src/Arbitrage Logic/services/index.js';

console.log('🧪 Testing DexScreener API...');

(async () => {
	try {
		const result = await dexscreenerApiService.getBidPriceByToken(config.dexscreener.contractAddress);
		console.log('Result:', result);
		if (result.bid) {
			console.log('✅ API bid fetched:', result.bid);
		} else {
			console.log('⚠️ No bid in API response:', result.error || 'No error');
		}
	} catch (e) {
		console.error('❌ API test failed:', e.message);
	}
})();
