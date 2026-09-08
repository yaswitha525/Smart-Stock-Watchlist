import { IMarketDataProvider, MarketQuoteMetadata } from './provider.interface.js';

interface StockBaseline {
  price: number;
  volume: number;
  changePercent: number;
}

const STOCK_BASELINES: Record<string, StockBaseline> = {
  RELIANCE: { price: 2950.50, volume: 5420000, changePercent: 1.25 },
  TCS: { price: 2263.90, volume: 2150000, changePercent: -7.70 },
  INFY: { price: 1083.30, volume: 3890000, changePercent: -7.81 },
  HDFCBANK: { price: 704.20, volume: 8900000, changePercent: -3.67 },
  ICICIBANK: { price: 1399.40, volume: 6100000, changePercent: -1.52 },
  SBIN: { price: 1008.70, volume: 12400000, changePercent: -8.07 },
  BHARTIARTL: { price: 1838.50, volume: 4300000, changePercent: -6.19 },
  ITC: { price: 264.20, volume: 15200000, changePercent: -7.65 },
  KOTAKBANK: { price: 420.50, volume: 2800000, changePercent: 7.61 },
  LT: { price: 3967.90, volume: 19500000, changePercent: -2.17 },
};

export class MockMarketDataProvider implements IMarketDataProvider {
  public readonly providerId = 'MOCK_SIMULATOR_V1';

  private tickCount = 0;
  private isDeterministic: boolean;

  constructor(isDeterministic = true) {
    this.isDeterministic = isDeterministic;
  }

  /**
   * Allows setting deterministic tick count for predictable testing.
   */
  public setTick(tick: number): void {
    this.tickCount = tick;
  }

  /**
   * Simulates/fetches a market quote for a stock.
   */
  public async fetchQuote(symbol: string, exchange = 'NSE'): Promise<MarketQuoteMetadata> {
    const uppercaseSymbol = symbol.toUpperCase().trim();
    const uppercaseExchange = exchange.toUpperCase().trim();

    const baseline = STOCK_BASELINES[uppercaseSymbol];

    if (!baseline) {
      // Default fallback for unseeded custom symbols
      const hash = uppercaseSymbol
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

      const basePrice = (hash % 1000) + 100;
      const baseVolume = (hash % 50) * 100000 + 500000;
      const delta = this.isDeterministic ? (this.tickCount % 5) * 0.1 : (Math.random() - 0.5) * 2;

      return {
        symbol: uppercaseSymbol,
        exchange: uppercaseExchange,
        price: Number((basePrice + delta).toFixed(2)),
        volume: baseVolume,
        changePercent: Number(delta.toFixed(2)),
        dataTimestamp: new Date(),
        providerId: this.providerId,
      };
    }

    // Controlled price fluctuation calculation
    const tickDelta = this.isDeterministic
      ? (this.tickCount % 10) * 0.2
      : (Math.random() - 0.5) * 5;

    const currentPrice = Number((baseline.price + tickDelta).toFixed(2));
    const currentChangePercent = Number((baseline.changePercent + tickDelta * 0.1).toFixed(2));
    const currentVolume = baseline.volume + (this.tickCount % 5) * 10000;

    return {
      symbol: uppercaseSymbol,
      exchange: uppercaseExchange,
      price: currentPrice,
      volume: currentVolume,
      changePercent: currentChangePercent,
      dataTimestamp: new Date(),
      providerId: this.providerId,
    };
  }

  /**
   * Fetches batch quotes for multiple stocks.
   */
  public async fetchBatchQuotes(
    stocks: { symbol: string; exchange?: string }[]
  ): Promise<MarketQuoteMetadata[]> {
    this.tickCount++;
    const quotes: MarketQuoteMetadata[] = [];

    for (const stock of stocks) {
      try {
        const quote = await this.fetchQuote(stock.symbol, stock.exchange || 'NSE');
        quotes.push(quote);
      } catch (error) {
        // Skip individual unresolvable symbols in batch mode
      }
    }

    return quotes;
  }
}
