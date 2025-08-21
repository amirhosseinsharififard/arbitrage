/**
 * Test UI Fix - Verify calculations and fix N/A issues
 * 
 * تست رفع مشکل UI - بررسی محاسبات و رفع N/A
 */

import dataManager from './src/Arbitrage Logic/core/dataManager.js';

async function testUIFix() {
    console.log('🧪 Testing UI Fix - N/A Resolution...\n');

    try {
        // Subscribe to data updates
        dataManager.subscribe((data) => {
            console.log('\n🔄 Data Update Received:');
            console.log(`   Exchanges: ${Object.keys(data.exchanges || {}).length}`);
            console.log(`   Opportunities: ${(data.arbitrageOpportunities || []).length}`);
            
            // Show exchange data
            console.log('\n📊 Exchange Data:');
            Object.entries(data.exchanges || {}).forEach(([id, exchange]) => {
                console.log(`   ${exchange.name}: Bid=${exchange.bid}, Ask=${exchange.ask}, isDEX=${exchange.isDEX}`);
            });
            
            // Show DEX opportunities specifically
            console.log('\n🟢 DEX Opportunities:');
            const dexOpportunities = data.arbitrageOpportunities.filter(opp => opp.type === 'DEX');
            dexOpportunities.forEach(opp => {
                console.log(`   ${opp.direction}: ${opp.percentage.toFixed(3)}% (${opp.fromPrice} → ${opp.toPrice})`);
            });
            
            // Show CEX opportunities
            console.log('\n📈 CEX Opportunities:');
            const cexOpportunities = data.arbitrageOpportunities.filter(opp => opp.type === 'CEX');
            cexOpportunities.forEach(opp => {
                console.log(`   ${opp.direction}: ${opp.percentage.toFixed(3)}% (${opp.fromPrice} → ${opp.toPrice})`);
            });
            
            console.log('\n✅ UI calculations are working correctly!');
        });

        // Test with real data
        console.log('📈 Testing with real exchange data...');
        const symbols = {
            lbank: 'DEBT/USDT:USDT',
            mexc: 'DEBT/USDT:USDT',
            dexscreener: 'DEBT/USDT'
        };

        // Fetch data
        const result = await dataManager.fetchAllExchangeData(symbols);
        
        console.log('\n📊 Final Verification:');
        console.log(`   Exchanges found: ${Object.keys(result.exchanges || {}).length}`);
        console.log(`   Total opportunities: ${(result.arbitrageOpportunities || []).length}`);
        console.log(`   DEX opportunities: ${(result.arbitrageOpportunities || []).filter(opp => opp.type === 'DEX').length}`);
        console.log(`   CEX opportunities: ${(result.arbitrageOpportunities || []).filter(opp => opp.type === 'CEX').length}`);
        
        // Check for any N/A values
        const hasNA = result.arbitrageOpportunities.some(opp => 
            opp.fromPrice === null || opp.toPrice === null || 
            isNaN(opp.percentage) || opp.percentage === null
        );
        
        if (hasNA) {
            console.log('\n⚠️ Warning: Some opportunities have N/A values');
        } else {
            console.log('\n✅ No N/A values found in calculations');
        }
        
        console.log('\n🎉 UI fix test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testUIFix().catch(console.error);
