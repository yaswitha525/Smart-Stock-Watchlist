import { IMarketDataProvider, MarketQuoteMetadata } from './provider.interface.js';

interface StockBaseline {
  price: number;
  volume: number;
  changePercent: number;
}

const STOCK_BASELINES: Record<string, StockBaseline> = {
  RELIANCE: { price: 2950.50, volume: 5420000, changePercent: 1.25 },
  TCS: { price: 4120.00, volume: 2150000, changePercent: -0.45 },
  INFY: { price: 1850.75, volume: 3890000, changePercent: 0.85 },
  HDFCBANK: { price: 1680.20, volume: 8900000, changePercent: -0.15 },
  ICICIBANK: { price: 1230.40, volume: 6100000, changePercent: 1.10 },
  SBIN: { price: 820.60, volume: 12400000, changePercent: 2.30 },
  BHARTIARTL: { price: 1540.10, volume: 4300000, changePercent: 0.50 },
  ITC: { price: 490.80, volume: 15200000, changePercent: -0.20 },
  KOTAKBANK: { price: 1780.30, volume: 2800000, changePercent: 0.10 },
  LT: { price: 3650.90, volume: 19500000, changePercent: 1.75 },
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
