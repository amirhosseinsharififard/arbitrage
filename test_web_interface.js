import WebInterface from './web_interface.js';

async function testWebInterface() {
    console.log('🧪 Testing web interface...');
    
    try {
        const webInterface = new WebInterface();
        await webInterface.start();
        
        console.log('✅ Web interface started successfully!');
        console.log('🌐 Open your browser and go to: http://localhost:3000');
        console.log('📊 The dashboard should display real-time trading data');
        console.log('⏹️  Press Ctrl+C to stop the test');
        
        // Keep the server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping web interface...');
            webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start web interface:', error.message);
        process.exit(1);
    }
}

testWebInterface();
