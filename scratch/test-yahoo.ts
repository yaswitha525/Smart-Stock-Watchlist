async function testYahoo() {
  const symbols = ['INFY.NS', 'TCS.NS', 'RELIANCE.NS', 'HDFCBANK.NS', 'TATAMOTORS.NS'];

  for (const sym of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1d&interval=1m`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      console.log(`Status for ${sym}:`, res.status);
      const data: any = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        console.log(`✅ ${sym}: Price=₹${meta.regularMarketPrice}, PrevClose=₹${meta.chartPreviousClose}, Exchange=${meta.exchangeName}`);
      } else {
        console.log(`❌ ${sym}: No meta data found`, data);
      }
    } catch (err: any) {
      console.log(`❌ ${sym} Error:`, err.message);
    }
  }
}

testYahoo();
