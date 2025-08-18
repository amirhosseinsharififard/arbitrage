import { CalculationUtils, FormattingUtils } from './src/Arbitrage Logic/utils/index.js';

console.log('🧪 Testing DEX-CEX Positioning and Percentage Calculations...\n');

// Mock data for testing
const mockData = {
    mexc: {
        bid: 0.000872,  // MEXC bid price
        ask: 0.000873,  // MEXC ask price
        id: 'mexc'
    },
    lbank: {
        bid: 0.000870,  // LBANK bid price
        ask: 0.000871,  // LBANK ask price
        id: 'lbank'
    },
    dexscreener: {
        bid: 0.0008869, // DEX bid price
        ask: null,      // DEX has no ask
        id: 'dexscreener',
        isDEX: true
    }
};

console.log('📊 Mock Data:');
console.log(`   MEXC Bid: $${mockData.mexc.bid}, Ask: $${mockData.mexc.ask}`);
console.log(`   LBANK Bid: $${mockData.lbank.bid}, Ask: $${mockData.lbank.ask}`);
console.log(`   DEX Bid: $${mockData.dexscreener.bid}, Ask: ${mockData.dexscreener.ask}`);
console.log('');

// Test the corrected DEX-CEX positioning logic
console.log('🔄 Testing Corrected DEX-CEX Positioning:');

// Case 1: MEXC Bid -> DEX Bid (DEX first, CEX second)
if (mockData.mexc.bid != null && mockData.dexscreener.bid != null) {
    const dexBidToMexcBid = CalculationUtils.calculatePriceDifference(mockData.dexscreener.bid, mockData.mexc.bid);
    console.log(`🟢 DEX ${mockData.dexscreener.id.toUpperCase()}(Bid:$${mockData.dexscreener.bid}) -> ${mockData.mexc.id.toUpperCase()}(Bid:$${mockData.mexc.bid}) => ${FormattingUtils.formatPercentageColored(dexBidToMexcBid)}`);
}

// Case 2: MEXC Ask -> DEX Bid (DEX first, CEX second)
if (mockData.mexc.ask != null && mockData.dexscreener.bid != null) {
    const dexBidToMexcAsk = CalculationUtils.calculatePriceDifference(mockData.dexscreener.bid, mockData.mexc.ask);
    console.log(`🟢 DEX ${mockData.dexscreener.id.toUpperCase()}(Bid:$${mockData.dexscreener.bid}) -> ${mockData.mexc.id.toUpperCase()}(Ask:$${mockData.mexc.ask}) => ${FormattingUtils.formatPercentageColored(dexBidToMexcAsk)}`);
}

console.log('');

// Case 3: LBANK Bid -> DEX Bid (DEX first, CEX second)
if (mockData.lbank.bid != null && mockData.dexscreener.bid != null) {
    const dexBidToLbankBid = CalculationUtils.calculatePriceDifference(mockData.dexscreener.bid, mockData.lbank.bid);
    console.log(`🟢 DEX ${mockData.dexscreener.id.toUpperCase()}(Bid:$${mockData.dexscreener.bid}) -> ${mockData.lbank.id.toUpperCase()}(Bid:$${mockData.lbank.bid}) => ${FormattingUtils.formatPercentageColored(dexBidToLbankBid)}`);
}

// Case 4: LBANK Ask -> DEX Bid (DEX first, CEX second)
if (mockData.lbank.ask != null && mockData.dexscreener.bid != null) {
    const dexBidToLbankAsk = CalculationUtils.calculatePriceDifference(mockData.dexscreener.bid, mockData.lbank.ask);
    console.log(`🟢 DEX ${mockData.dexscreener.id.toUpperCase()}(Bid:$${mockData.dexscreener.bid}) -> ${mockData.lbank.id.toUpperCase()}(Ask:$${mockData.lbank.ask}) => ${FormattingUtils.formatPercentageColored(dexBidToLbankAsk)}`);
}

console.log('');

console.log('✅ DEX-CEX Positioning Test Complete!');
console.log('');
console.log('📋 Expected Output Format:');
console.log('🟢 DEX DEXSCREENER(Bid:$0.0008869) -> MEXC(Bid:$0.000872) => 1.709%');
console.log('🟢 DEX DEXSCREENER(Bid:$0.0008869) -> MEXC(Ask:$0.000873) => 1.592%');
console.log('🟢 DEX DEXSCREENER(Bid:$0.0008869) -> LBANK(Bid:$0.000870) => 1.945%');
console.log('🟢 DEX DEXSCREENER(Bid:$0.0008869) -> LBANK(Ask:$0.000871) => 1.828%');
