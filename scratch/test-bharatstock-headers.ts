async function testBharatStockHeaders() {
  const apiKey = process.env.MARKET_API_KEY || 'bsk_live_LU9lmBQIPL2o43v90i5XMIs88s_nRNgz0jE9A_BN-uY';

  const urls = [
    'https://bharatstockapi.com/v1/stocks/INFY',
    'https://bharatstockapi.com/v1/stocks/quotes/INFY',
    'https://api.bharatstockapi.com/v1/stocks/INFY',
  ];

  for (const url of urls) {
    console.log(`\nTesting URL: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });
      console.log('Status:', res.status);
      const text = await res.text();
      console.log('Response:', text.slice(0, 300));
    } catch (err: any) {
      console.log('Fetch error:', err.message);
    }
  }
}

testBharatStockHeaders();
