/**
 * Standardized quote metadata returned by any Market Data Provider implementation.
 */
export interface MarketQuoteMetadata {
  symbol: string;
  exchange: string;
  price: number;
  volume: number;
  changePercent: number;
  dataTimestamp: Date;
  providerId: string;
}

/**
 * Abstraction interface for Market Data Providers.
 * Supports swappable quote ingestion (e.g. Mock Provider, Yahoo Finance, Finnhub, AlphaVantage).
 */
export interface IMarketDataProvider {
  /**
   * Unique identifier for the provider implementation (e.g. 'MOCK_SIMULATOR_V1', 'GROWW_API_V1').
   */
  readonly providerId: string;

  /**
   * Fetches the market quote for a single stock symbol.
   */
  fetchQuote(symbol: string, exchange?: string): Promise<MarketQuoteMetadata>;

  /**
   * Fetches market quotes in batch for a list of stock symbols.
   */
  fetchBatchQuotes(
    stocks: { symbol: string; exchange?: string }[]
  ): Promise<MarketQuoteMetadata[]>;
}
