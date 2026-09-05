import { apiClient, IS_DEMO_MODE } from './client';
import { WatchlistDeltaResponse } from '../types/api';

const DEMO_DELTA: WatchlistDeltaResponse = {
  watchlistId: 'demo-wl-1',
  watchlistName: 'Tech & Innovation',
  referenceTimestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
  hasPreviousVisit: true,
  totalStocks: 4,
  meaningfulChangesCount: 3,
  summaryInsight: '3 of 4 stocks experienced meaningful changes in price or volume since your last visit (4 hours ago).',
  items: [
    {
      stockId: 'stock-1',
      symbol: 'RELIANCE',
      exchange: 'NSE',
      name: 'Reliance Industries Ltd.',
      sector: 'Energy',
      baselinePrice: 2852.80,
      currentPrice: 2950.45,
      priceDelta: 97.65,
      priceChangePercent: 3.42,
      baselineVolume: 2880000,
      currentVolume: 4850000,
      volumeDelta: 1970000,
      volumeChangePercent: 68.4,
      signals: ['SIGNIFICANT_GAIN'],
      isMeaningful: true,
      insight: 'RELIANCE gained +3.42% with a +68.4% surge in trading volume since your last visit.',
      baselineSnapshot: null,
      currentSnapshot: null,
    },
    {
      stockId: 'stock-2',
      symbol: 'INFY',
      exchange: 'NSE',
      name: 'Infosys Limited',
      sector: 'Technology',
      baselinePrice: 1860.10,
      currentPrice: 1820.10,
      priceDelta: -40.00,
      priceChangePercent: -2.15,
      baselineVolume: 5100000,
      currentVolume: 6200000,
      volumeDelta: 1100000,
      volumeChangePercent: 21.5,
      signals: ['SIGNIFICANT_DROP'],
      isMeaningful: true,
      insight: 'INFY dropped -2.15% since your last visit, crossing your 2.0% threshold.',
      baselineSnapshot: null,
      currentSnapshot: null,
    },
    {
      stockId: 'stock-4',
      symbol: 'TATAMOTORS',
      exchange: 'NSE',
      name: 'Tata Motors Limited',
      sector: 'Automobile',
      baselinePrice: 937.60,
      currentPrice: 985.60,
      priceDelta: 48.00,
      priceChangePercent: 5.12,
      baselineVolume: 5500000,
      currentVolume: 12500000,
      volumeDelta: 7000000,
      volumeChangePercent: 127.2,
      signals: ['SIGNIFICANT_GAIN', 'VOLUME_SURGE'],
      isMeaningful: true,
      insight: 'TATAMOTORS surged +5.12% with a massive +127.2% volume spike since your last visit.',
      baselineSnapshot: null,
      currentSnapshot: null,
    },
  ],
};

export const deltaApi = {
  async getWatchlistDelta(
    watchlistId: string,
    priceThreshold: number = 2.0,
    volumeThreshold: number = 50.0
  ): Promise<WatchlistDeltaResponse> {
    if (IS_DEMO_MODE) {
      return DEMO_DELTA;
    }
    const response = await apiClient.get<WatchlistDeltaResponse>(`/watchlists/${watchlistId}/delta`, {
      params: { priceThreshold, volumeThreshold },
    });
    return response.data;
  },
};
