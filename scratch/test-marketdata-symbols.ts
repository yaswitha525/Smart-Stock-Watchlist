import { RealMarketDataProvider } from '../src/services/market-data/real-market-data.provider.js';

async function testSymbols() {
  const apiKey = process.env.MARKET_API_KEY || 'bsk_live_LU9lmBQIPL2o43v90i5XMIs88s_nRNgz0jE9A_BN-uY';
  const provider = new RealMarketDataProvider({
    apiKey,
    baseUrl: 'https://api.marketdata.app/v1',
    timeoutMs: 5000,
  });

  const testSymbolsList = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'NVDA', 'AMZN', 'INFY', 'TCS', 'RELIANCE'];

  console.log('Testing symbols against real MarketData.app API...\n');
  for (const sym of testSymbolsList) {
    try {
      const q = await provider.fetchQuote(sym);
      console.log(`✅ ${sym}: Price=$${q.price}, Change=${q.changePercent}%, Vol=${q.volume}`);
    } catch (err: any) {
      console.log(`❌ ${sym}: ${err.message}`);
    }
  }
}

testSymbols();
