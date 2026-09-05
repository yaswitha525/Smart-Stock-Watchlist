import http from 'http';
import https from 'https';

const API_KEY = 'bsk_live_A-muLrvNTqhxz06fJ7S4vwhaQhX71d-MD4HzsNkuPUI';

const candidateEndpoints = [
  // StockData.org
  { name: 'StockData.org', url: `https://api.stockdata.org/v1/data/quote?symbols=RELIANCE.NS&api_token=${API_KEY}` },
  // MarketData.app
  { name: 'MarketData.app', url: `https://api.marketdata.app/v1/stocks/quotes/AAPL/?token=${API_KEY}` },
  // TwelveData
  { name: 'TwelveData', url: `https://api.twelvedata.com/quote?symbol=RELIANCE&apikey=${API_KEY}` },
  // Finnhub
  { name: 'Finnhub', url: `https://finnhub.io/api/v1/quote?symbol=RELIANCE.NS&token=${API_KEY}` },
  // FinancialModelingPrep
  { name: 'FMP', url: `https://financialmodelingprep.com/api/v3/quote/RELIANCE.NS?apikey=${API_KEY}` },
  // Marketstack
  { name: 'Marketstack', url: `http://api.marketstack.com/v1/eod?access_key=${API_KEY}&symbols=RELIANCE.NS` },
  // Polygon
  { name: 'Polygon', url: `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=${API_KEY}` },
  // EODHD
  { name: 'EODHD', url: `https://eodhd.com/api/real-time/RELIANCE.NSE?api_token=${API_KEY}&fmt=json` },
  // AlphaVantage
  { name: 'AlphaVantage', url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=RELIANCE.BSE&apikey=${API_KEY}` },
];

async function probeUrl(name: string, url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent': 'SmartMarketWatchlist/1.0',
      },
    });
    const text = await res.text();
    console.log(`=== ${name} (Status: ${res.status}) ===`);
    console.log(text.substring(0, 500));
    console.log('\n');
  } catch (err: any) {
    console.log(`=== ${name} ERROR ===`, err.message);
  }
}

async function run() {
  for (const item of candidateEndpoints) {
    await probeUrl(item.name, item.url);
  }
}

run();
