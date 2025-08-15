@echo off
echo Starting Arbitrage Bot with Performance Optimizations...
node --max-old-space-size=2048 --expose-gc --optimize-for-size index.js
pause
