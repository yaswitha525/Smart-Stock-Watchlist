const API_KEY = 'bsk_live_A-muLrvNTqhxz06fJ7S4vwhaQhX71d-MD4HzsNkuPUI';

interface MarketQuoteMetadata {
  symbol: string;
  exchange: string;
  price: number;
  volume: number;
  changePercent: number;
  dataTimestamp: Date;
  providerId: string;
}

function parseExternalQuote(symbol: string, exchange: string, data: any, providerId: string): MarketQuoteMetadata {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON object response from market data provider');
  }

  if (data.s === 'error') {
    throw new Error(`Market provider error: ${data.errmsg || 'Unknown provider error'}`);
  }

  // Handle MarketData.app array format or flat object format
  const rawPrice = Array.isArray(data.last) ? data.last[0] : (data.price ?? data.last ?? data.c ?? data.close);
  const rawVolume = Array.isArray(data.volume) ? data.volume[0] : (data.volume ?? data.v);
  const rawChangePct = Array.isArray(data.changepct) ? data.changepct[0] : (data.changePercent ?? data.change_percent ?? data.changepct ?? data.dp);
  const rawTimestamp = Array.isArray(data.updated) ? data.updated[0] : (data.dataTimestamp ?? data.timestamp ?? data.updated ?? data.t);

  if (rawPrice === undefined || rawPrice === null || typeof rawPrice !== 'number' || isNaN(rawPrice)) {
    throw new Error(`Invalid or missing price field in response for symbol ${symbol}`);
  }

  if (rawVolume === undefined || rawVolume === null || typeof rawVolume !== 'number' || isNaN(rawVolume)) {
    throw new Error(`Invalid or missing volume field in response for symbol ${symbol}`);
  }

  const price = Number(rawPrice);
  const volume = Math.max(0, Math.floor(Number(rawVolume)));

  // If changePct is fractional (e.g. -0.0256 for -2.56%), convert to percent scale if appropriate
  let changePercent = Number(rawChangePct ?? 0);
  if (Math.abs(changePercent) > 0 && Math.abs(changePercent) <= 1 && data.changepct) {
    changePercent = Number((changePercent * 100).toFixed(2));
  } else {
    changePercent = Number(changePercent.toFixed(2));
  }

  let dataTimestamp: Date;
  if (typeof rawTimestamp === 'number') {
    // If seconds epoch (10 digits), convert to ms
    const ms = rawTimestamp < 10000000000 ? rawTimestamp * 1000 : rawTimestamp;
    dataTimestamp = new Date(ms);
  } else if (typeof rawTimestamp === 'string') {
    dataTimestamp = new Date(rawTimestamp);
  } else {
    dataTimestamp = new Date();
  }

  if (isNaN(dataTimestamp.getTime())) {
    dataTimestamp = new Date();
  }

  return {
    symbol: symbol.toUpperCase(),
    exchange: exchange.toUpperCase(),
    price,
    volume,
    changePercent,
    dataTimestamp,
    providerId,
  };
}

async function runRealTest() {
  const url = `https://api.marketdata.app/v1/stocks/quotes/AAPL/?token=${API_KEY}`;
  console.log('Fetching live quote from URL:', url.replace(API_KEY, '***MASKED***'));
  const res = await fetch(url);
  const rawJson = await res.json();
  console.log('Raw API Response:', JSON.stringify(rawJson));

  const quote = parseExternalQuote('AAPL', 'NASDAQ', rawJson, 'REAL_MARKET_DATA_APP');
  console.log('Successfully Mapped MarketQuoteMetadata:');
  console.dir(quote);
}

runRealTest();
