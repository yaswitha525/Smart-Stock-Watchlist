const API_KEY = 'bsk_live_A-muLrvNTqhxz06fJ7S4vwhaQhX71d-MD4HzsNkuPUI';

const candidates = [
  // Tiingo
  { name: 'Tiingo query', url: `https://api.tiingo.com/tiingo/daily/aapl/prices?token=${API_KEY}` },
  { name: 'Tiingo header', url: `https://api.tiingo.com/tiingo/daily/aapl/prices`, auth: true },

  // IEX Cloud
  { name: 'IEX Cloud', url: `https://cloud.iexapis.com/stable/stock/aapl/quote?token=${API_KEY}` },

  // Alpaca
  { name: 'Alpaca Data', url: `https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=AAPL`, headers: { 'APCA-API-KEY-ID': API_KEY } },

  // MarketData.app bulk & quotes
  { name: 'MarketData.app bulk', url: `https://api.marketdata.app/v1/stocks/bulkquotes/2026-09-04/?token=${API_KEY}` },

  // Finage
  { name: 'Finage', url: `https://api.finage.co.uk/last/stock/AAPL?apikey=${API_KEY}` },

  // FinancialData
  { name: 'FinancialData', url: `https://api.financialdata.net/v1/quotes?symbols=AAPL&api_key=${API_KEY}` },

  // Upstox
  { name: 'Upstox', url: `https://api.upstox.com/v2/market-quote/quotes?symbol=NSE_EQ|INE002A01018`, auth: true },

  // Dhan
  { name: 'Dhan', url: `https://api.dhan.co/v2/marketfeed/ltp`, auth: true },
];

async function run() {
  for (const c of candidates) {
    try {
      const headers: Record<string, string> = c.headers || {};
      if (c.auth) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      const res = await fetch(c.url, { headers });
      const text = await res.text();
      console.log(`=== ${c.name} (Status ${res.status}) ===`);
      console.log(text.substring(0, 400));
      console.log('\n');
    } catch (err: any) {
      console.log(`=== ${c.name} ERROR ===`, err.message);
    }
  }
}

run();
