const API_KEY = 'bsk_live_A-muLrvNTqhxz06fJ7S4vwhaQhX71d-MD4HzsNkuPUI';

async function testMarketDataApp() {
  console.log('--- TESTING MARKETDATA.APP ---');
  const symbols = ['AAPL', 'RELIANCE', 'RELIANCE.NS', 'INFY'];
  for (const sym of symbols) {
    try {
      const res = await fetch(`https://api.marketdata.app/v1/stocks/quotes/${sym}/?token=${API_KEY}`);
      const data = await res.json();
      console.log(`MarketData.app ${sym} (Status ${res.status}):`, JSON.stringify(data));
    } catch (err: any) {
      console.log(`MarketData.app ${sym} error:`, err.message);
    }
  }
}

async function testOtherEndpoints() {
  console.log('\n--- TESTING OTHER CANDIDATES ---');
  const candidates = [
    // Marketstack
    { name: 'Marketstack v1', url: `http://api.marketstack.com/v1/tickers?access_key=${API_KEY}` },
    // StockData
    { name: 'StockData quote', url: `https://api.stockdata.org/v1/data/quote?symbols=AAPL&api_token=${API_KEY}` },
    // TwelveData
    { name: 'TwelveData quote', url: `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${API_KEY}` },
    // Finnhub
    { name: 'Finnhub quote', url: `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${API_KEY}` },
    // Polygon
    { name: 'Polygon quote', url: `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${API_KEY}` },
    // FMP
    { name: 'FMP quote', url: `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${API_KEY}` },
  ];

  for (const c of candidates) {
    try {
      const res = await fetch(c.url);
      const text = await res.text();
      console.log(`${c.name} (Status ${res.status}):`, text.substring(0, 300));
    } catch (err: any) {
      console.log(`${c.name} error:`, err.message);
    }
  }
}

async function main() {
  await testMarketDataApp();
  await testOtherEndpoints();
}

main();
