import { config } from '../../config/index.js';
import { IMarketDataProvider } from './provider.interface.js';
import { MockMarketDataProvider } from './mock-provider.js';
import { RealMarketDataProvider } from './real-market-data.provider.js';

export class MarketDataProviderFactory {
  private static instance: IMarketDataProvider | null = null;

  /**
   * Instantiates or returns the configured Market Data Provider.
   * If `MARKET_DATA_PROVIDER === 'real'`, returns RealMarketDataProvider.
   * Otherwise defaults to MockMarketDataProvider.
   */
  public static getProvider(): IMarketDataProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = (config.marketData.provider || 'mock').toLowerCase().trim();

    if (providerType === 'real') {
      this.instance = new RealMarketDataProvider();
    } else {
      this.instance = new MockMarketDataProvider();
    }

    return this.instance;
  }

  /**
   * Resets singleton instance, enabling dynamic reconfiguration in test environments.
   */
  public static resetInstance(): void {
    this.instance = null;
  }
}
