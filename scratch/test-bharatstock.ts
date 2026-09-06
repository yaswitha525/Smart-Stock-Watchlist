import { RealMarketDataProvider } from '../src/services/market-data/real-market-data.provider.js';

async function testBharatStock() {
  const apiKey = process.env.MARKET_API_KEY || 'bsk_live_LU9lmBQIPL2o43v90i5XMIs88s_nRNgz0jE9A_BN-uY';
  
  const urls = [
    'https://api.bharatstockapi.com/v1',
    'https://bharatstockapi.com/api/v1',
    'https://bharatstock.in/api/v1',
    'https://api.bharatstock.in/v1',
  ];

  for (const baseUrl of urls) {
    console.log(`\nTesting ${baseUrl}...`);
    try {
      const res = await fetch(`${baseUrl}/quote/INFY?apiKey=${apiKey}`);
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text.slice(0, 200));
    } catch (err: any) {
      console.log('Fetch error:', err.message);
    }
  }
}

testBharatStock();
