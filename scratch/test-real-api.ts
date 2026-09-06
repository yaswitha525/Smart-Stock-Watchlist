import { RealMarketDataProvider } from '../src/services/market-data/real-market-data.provider.js';

async function testApi() {
  const apiKey = process.env.MARKET_API_KEY || 'bsk_live_LU9lmBQIPL2o43v90i5XMIs88s_nRNgz0jE9A_BN-uY';
  console.log('Testing RealMarketDataProvider with API key:', apiKey.slice(0, 10) + '...');

  // Try standard base URLs
  const baseUrls = [
    'https://api.marketdata.app/v1',
    'https://api.bharatapi.dev/v1',
    'https://api.stockdata.org/v1',
  ];

  for (const url of baseUrls) {
    console.log(`\n--- Testing Base URL: ${url} ---`);
    const provider = new RealMarketDataProvider({ apiKey, baseUrl: url, timeoutMs: 5000 });
    try {
      const quote = await provider.fetchQuote('INFY', 'NSE');
      console.log('SUCCESS for INFY:', quote);
    } catch (err: any) {
      console.log('Failed for INFY:', err.message);
    }

    try {
      const quoteUs = await provider.fetchQuote('AAPL', 'NASDAQ');
      console.log('SUCCESS for AAPL:', quoteUs);
    } catch (err: any) {
      console.log('Failed for AAPL:', err.message);
    }
  }
}

testApi();
