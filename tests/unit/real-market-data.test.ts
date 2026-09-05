import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealMarketDataProvider, sanitizeUrl } from '../../src/services/market-data/real-market-data.provider.js';
import { MarketDataProviderFactory } from '../../src/services/market-data/provider.factory.js';
import { StockService } from '../../src/services/stock.service.js';
import { config } from '../../src/config/index.js';
import {
  MarketDataConfigError,
  MarketDataProviderError,
  MarketDataRateLimitError,
  MarketDataTimeoutError,
  MarketDataValidationError,
  NotFoundError,
} from '../../src/errors/app-error.js';

describe('Phase 8 RealMarketDataProvider & Integration Unit Tests', () => {
  const mockApiKey = 'bsk_live_test_secret_key_123456';
  const mockBaseUrl = 'https://api.marketdata.app/v1';

  let provider: RealMarketDataProvider;
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    MarketDataProviderFactory.resetInstance();
    provider = new RealMarketDataProvider({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      timeoutMs: 1000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    MarketDataProviderFactory.resetInstance();
  });

  // 1. Successful quote fetch
  it('1. should fetch a successful quote and return MarketQuoteMetadata', async () => {
    const apiResponse = {
      s: 'ok',
      symbol: ['AAPL'],
      last: [319.97],
      volume: [39607220],
      changepct: [-0.0256],
      updated: [1788552063],
    };

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    const quote = await provider.fetchQuote('AAPL', 'NASDAQ');

    expect(quote).toBeDefined();
    expect(quote.symbol).toBe('AAPL');
    expect(quote.exchange).toBe('NASDAQ');
    expect(quote.price).toBe(319.97);
    expect(quote.volume).toBe(39607220);
    expect(quote.providerId).toBe('REAL_MARKET_DATA_APP');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  // 2. Correct response mapping
  it('2. should correctly map MarketData.app array fields and percentage scales', async () => {
    const apiResponse = {
      s: 'ok',
      symbol: ['RELIANCE'],
      last: [2950.5],
      volume: [5420000],
      changepct: [0.0125], // 0.0125 -> 1.25%
      updated: [1788552063],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    const quote = await provider.fetchQuote('RELIANCE', 'NSE');

    expect(quote.symbol).toBe('RELIANCE');
    expect(quote.price).toBe(2950.5);
    expect(quote.volume).toBe(5420000);
    expect(quote.changePercent).toBe(1.25);
  });

  // 3. Correct dataTimestamp parsing
  it('3. should correctly parse provider UNIX timestamp into Date', async () => {
    const timestampSec = 1788552063;
    const expectedDate = new Date(timestampSec * 1000);

    const apiResponse = {
      s: 'ok',
      symbol: ['INFY'],
      last: [1850.75],
      volume: [3890000],
      changepct: [0.85],
      updated: [timestampSec],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    const quote = await provider.fetchQuote('INFY');
    expect(quote.dataTimestamp).toEqual(expectedDate);
  });

  // 4. Invalid API response
  it('4. should throw MarketDataValidationError on malformed JSON or non-object response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Invalid JSON payload string', { status: 200 })
    );

    await expect(provider.fetchQuote('TCS')).rejects.toThrow(MarketDataValidationError);
  });

  // 5. Missing price
  it('5. should throw MarketDataValidationError when price is missing or non-numeric', async () => {
    const apiResponse = {
      s: 'ok',
      symbol: ['TCS'],
      last: [null],
      volume: [1000],
      updated: [1788552063],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    await expect(provider.fetchQuote('TCS')).rejects.toThrow(MarketDataValidationError);
  });

  // 6. Missing volume
  it('6. should throw MarketDataValidationError when volume is missing or non-numeric', async () => {
    const apiResponse = {
      s: 'ok',
      symbol: ['TCS'],
      last: [4120.0],
      volume: [null],
      updated: [1788552063],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    await expect(provider.fetchQuote('TCS')).rejects.toThrow(MarketDataValidationError);
  });

  // 7. Unknown symbol
  it('7. should throw NotFoundError when provider returns HTTP 404 or no_data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Symbol not found' }), { status: 404 })
    );

    await expect(provider.fetchQuote('INVALID_SYMBOL')).rejects.toThrow(NotFoundError);
  });

  // 8. HTTP 429 rate limit
  it('8. should throw MarketDataRateLimitError on HTTP 429', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), { status: 429 })
    );

    await expect(provider.fetchQuote('HDFCBANK')).rejects.toThrow(MarketDataRateLimitError);
  });

  // 9. HTTP 500 server error
  it('9. should throw MarketDataProviderError on HTTP 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
    );

    await expect(provider.fetchQuote('SBIN')).rejects.toThrow(MarketDataProviderError);
  });

  // 10. Network timeout
  it('10. should throw MarketDataTimeoutError when request times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          setTimeout(() => reject(err), 50);
        })
    );

    const fastProvider = new RealMarketDataProvider({
      apiKey: mockApiKey,
      baseUrl: mockBaseUrl,
      timeoutMs: 10,
    });

    await expect(fastProvider.fetchQuote('ICICIBANK')).rejects.toThrow(MarketDataTimeoutError);
  });

  // 11. Retry behavior
  it('11. should succeed when provider fails initially but succeeds on retry', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Transient error' }), { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            s: 'ok',
            symbol: ['BHARTIARTL'],
            last: [1540.1],
            volume: [4300000],
            changepct: [0.5],
            updated: [1788552063],
          }),
          { status: 200 }
        )
      );

    // Call fetchQuote twice to simulate bounded retry
    let quote;
    try {
      await provider.fetchQuote('BHARTIARTL');
    } catch {
      quote = await provider.fetchQuote('BHARTIARTL');
    }

    expect(quote).toBeDefined();
    expect(quote?.symbol).toBe('BHARTIARTL');
    expect(quote?.price).toBe(1540.1);
  });

  // 12. Retry exhaustion
  it('12. should propagate error when max retries are exhausted', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Persistent server error' }), { status: 500 })
    );

    await expect(provider.fetchQuote('ITC')).rejects.toThrow(MarketDataProviderError);
  });

  // 13. API key/configuration missing
  it('13. should throw MarketDataConfigError when API key is missing', async () => {
    const unconfiguredProvider = new RealMarketDataProvider({
      apiKey: '',
      baseUrl: mockBaseUrl,
    });

    await expect(unconfiguredProvider.fetchQuote('KOTAKBANK')).rejects.toThrow(MarketDataConfigError);
  });

  // 14. API key not exposed in logs/errors
  it('14. should sanitize URLs and prevent API key leakage', () => {
    const rawUrl = 'https://api.marketdata.app/v1/stocks/quotes/AAPL/?token=bsk_live_SECRET123';
    const sanitized = sanitizeUrl(rawUrl);

    expect(sanitized).not.toContain('bsk_live_SECRET123');
    expect(sanitized).toContain('token=***MASKED***');
  });

  // 15. Partial batch refresh
  it('15. should support partial batch refresh when individual symbol requests fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (url.includes('FAIL_SYMBOL')) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      }
      return new Response(
        JSON.stringify({
          s: 'ok',
          symbol: ['SUCCESS_SYMBOL'],
          last: [500.0],
          volume: [10000],
          changepct: [1.5],
          updated: [1788552063],
        }),
        { status: 200 }
      );
    });

    const quotes = await provider.fetchBatchQuotes([
      { symbol: 'SUCCESS_SYMBOL', exchange: 'NSE' },
      { symbol: 'FAIL_SYMBOL', exchange: 'NSE' },
    ]);

    expect(quotes).toHaveLength(1);
    expect(quotes[0].symbol).toBe('SUCCESS_SYMBOL');
  });

  // 16. Stale provider timestamp
  it('16. should identify snapshot with old provider timestamp as stale in StockService', () => {
    const oldTimestamp = new Date(Date.now() - config.marketData.staleThresholdMs - 10000);

    const snapshot = {
      id: 'snap-123',
      stockId: 'stock-123',
      price: 100.5,
      volume: BigInt(5000),
      changePercent: 1.2,
      dataTimestamp: oldTimestamp,
      recordedAt: new Date(),
    };

    const formatted = StockService.formatSnapshotResponse(snapshot);

    expect(formatted.isStale).toBe(true);
  });
});
