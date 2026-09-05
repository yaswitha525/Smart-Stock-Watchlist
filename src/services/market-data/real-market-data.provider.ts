import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import {
  MarketDataConfigError,
  MarketDataProviderError,
  MarketDataRateLimitError,
  MarketDataTimeoutError,
  MarketDataValidationError,
  NotFoundError,
} from '../../errors/app-error.js';
import { IMarketDataProvider, MarketQuoteMetadata } from './provider.interface.js';

export interface RealMarketDataProviderOptions {
  apiKey?: string | null;
  baseUrl?: string | null;
  timeoutMs?: number;
}

/**
 * Sanitizes URLs and log strings to prevent API keys from leaking into loggers or error tracebacks.
 */
export function sanitizeUrl(url: string): string {
  return url.replace(/([?&](?:apiKey|key|api_key|token|access_key)=)[^&]+/gi, '$1***MASKED***');
}

export class RealMarketDataProvider implements IMarketDataProvider {
  public readonly providerId = 'REAL_MARKET_DATA_APP';

  private apiKey: string | null;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: RealMarketDataProviderOptions = {}) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : config.marketData.apiKey;
    this.baseUrl = (options.baseUrl || config.marketData.baseUrl || 'https://api.marketdata.app/v1').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 5000;
  }

  /**
   * Validates provider configuration before making requests.
   */
  private ensureConfigured(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new MarketDataConfigError(
        'RealMarketDataProvider is active but MARKET_API_KEY (or MARKET_DATA_API_KEY) is missing or empty'
      );
    }
  }

  /**
   * Fetches a live market quote for a single stock symbol.
   */
  public async fetchQuote(symbol: string, exchange = 'NSE'): Promise<MarketQuoteMetadata> {
    this.ensureConfigured();

    const uppercaseSymbol = symbol.toUpperCase().trim();
    const uppercaseExchange = exchange.toUpperCase().trim();

    if (!uppercaseSymbol) {
      throw new MarketDataValidationError('Symbol parameter cannot be empty');
    }

    const requestUrl = `${this.baseUrl}/stocks/quotes/${encodeURIComponent(uppercaseSymbol)}/?token=${encodeURIComponent(this.apiKey!)}`;
    const sanitizedUrl = sanitizeUrl(requestUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SmartMarketWatchlist/1.0',
        },
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        logger.error({ url: sanitizedUrl }, 'Market data provider request timed out');
        throw new MarketDataTimeoutError(`Request timed out fetching market quote for ${uppercaseSymbol}`);
      }
      logger.error({ url: sanitizedUrl, err: err.message }, 'Network or DNS failure reaching market data provider');
      throw new MarketDataProviderError(`Network failure reaching market data provider: ${err.message}`, 502);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        logger.error({ url: sanitizedUrl, status: response.status }, 'Authentication failed for market data provider');
        throw new MarketDataProviderError('Market data provider authentication failed (Invalid API key)', 401);
      }
      if (response.status === 404) {
        throw new NotFoundError(`Stock symbol ${uppercaseSymbol} not found on market data provider`);
      }
      if (response.status === 429) {
        logger.warn({ url: sanitizedUrl }, 'Rate limit exceeded on market data provider');
        throw new MarketDataRateLimitError('Market data provider rate limit exceeded');
      }
      logger.error({ url: sanitizedUrl, status: response.status }, 'Market data provider returned server error');
      throw new MarketDataProviderError(`Market data provider HTTP ${response.status} server error`, 502);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseErr: any) {
      logger.error({ url: sanitizedUrl }, 'Malformed JSON returned by market data provider');
      throw new MarketDataValidationError(`Malformed JSON response received from market data provider for ${uppercaseSymbol}`);
    }

    return this.parseAndMapQuote(uppercaseSymbol, uppercaseExchange, data);
  }

  /**
   * Fetches live market quotes in batch across a list of stock symbols.
   * Employs resilient per-stock error isolation to support partial batch success.
   */
  public async fetchBatchQuotes(
    stocks: { symbol: string; exchange?: string }[]
  ): Promise<MarketQuoteMetadata[]> {
    this.ensureConfigured();

    if (!stocks || stocks.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      stocks.map((s) => this.fetchQuote(s.symbol, s.exchange || 'NSE'))
    );

    const quotes: MarketQuoteMetadata[] = [];
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.status === 'fulfilled') {
        quotes.push(res.value);
      } else {
        const symbol = stocks[i].symbol;
        const sanitizedMsg = res.reason?.message ? sanitizeUrl(res.reason.message) : 'Unknown error';
        logger.warn({ symbol, error: sanitizedMsg }, 'Failed to fetch quote for individual symbol during batch refresh');
      }
    }

    return quotes;
  }

  /**
   * Parses and validates raw external provider payload into MarketQuoteMetadata.
   */
  private parseAndMapQuote(symbol: string, exchange: string, data: any): MarketQuoteMetadata {
    if (!data || typeof data !== 'object') {
      throw new MarketDataValidationError(`Invalid JSON response format for symbol ${symbol}`);
    }

    if (data.s === 'error') {
      const errorMsg = data.errmsg || 'Unknown provider error';
      if (/invalid token/i.test(errorMsg)) {
        throw new MarketDataProviderError('Market data provider authentication failed (Invalid API key)', 401);
      }
      throw new MarketDataValidationError(`Provider returned error for ${symbol}: ${errorMsg}`);
    }

    if (data.s === 'no_data') {
      throw new NotFoundError(`No quote data available for symbol ${symbol}`);
    }

    // Support both MarketData.app array fields and standard flat object fields
    const rawPrice = Array.isArray(data.last)
      ? data.last[0]
      : (data.price ?? data.last ?? data.c ?? data.close);

    const rawVolume = Array.isArray(data.volume)
      ? data.volume[0]
      : (data.volume ?? data.v);

    const rawChangePct = Array.isArray(data.changepct)
      ? data.changepct[0]
      : (data.changePercent ?? data.change_percent ?? data.changepct ?? data.dp);

    const rawTimestamp = Array.isArray(data.updated)
      ? data.updated[0]
      : (data.dataTimestamp ?? data.timestamp ?? data.updated ?? data.t);

    // Strict numerical validation: do not convert invalid/missing data to 0
    if (rawPrice === undefined || rawPrice === null || typeof rawPrice !== 'number' || isNaN(rawPrice) || rawPrice <= 0) {
      throw new MarketDataValidationError(`Invalid or missing price field in provider response for symbol ${symbol}`);
    }

    if (rawVolume === undefined || rawVolume === null || typeof rawVolume !== 'number' || isNaN(rawVolume) || rawVolume < 0) {
      throw new MarketDataValidationError(`Invalid or missing volume field in provider response for symbol ${symbol}`);
    }

    const price = Number(rawPrice);
    const volume = Math.max(0, Math.floor(Number(rawVolume)));

    // Scale fractional change percent if returned on 0-1 scale
    let changePercent = Number(rawChangePct ?? 0);
    if (isNaN(changePercent)) {
      changePercent = 0;
    } else if (Math.abs(changePercent) > 0 && Math.abs(changePercent) <= 1 && data.changepct) {
      changePercent = Number((changePercent * 100).toFixed(2));
    } else {
      changePercent = Number(changePercent.toFixed(2));
    }

    // Timestamp parsing
    let dataTimestamp: Date;
    if (typeof rawTimestamp === 'number' && !isNaN(rawTimestamp)) {
      // 10-digit UNIX timestamp in seconds vs 13-digit milliseconds
      const ms = rawTimestamp < 10000000000 ? rawTimestamp * 1000 : rawTimestamp;
      dataTimestamp = new Date(ms);
    } else if (typeof rawTimestamp === 'string' && rawTimestamp.trim() !== '') {
      dataTimestamp = new Date(rawTimestamp);
    } else {
      dataTimestamp = new Date();
    }

    if (isNaN(dataTimestamp.getTime())) {
      dataTimestamp = new Date();
    }

    return {
      symbol,
      exchange,
      price,
      volume,
      changePercent,
      dataTimestamp,
      providerId: this.providerId,
    };
  }
}
