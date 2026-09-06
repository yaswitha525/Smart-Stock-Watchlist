import { apiClient, IS_DEMO_MODE } from './client';
import { Stock, PaginatedStocks, StockSnapshot } from '../types/api';

const DEMO_STOCKS: Stock[] = [
  {
    id: 'stock-1',
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance Industries Ltd.',
    sector: 'Energy',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latestSnapshot: {
      id: 'snap-1',
      stockId: 'stock-1',
      price: 2950.45,
      volume: 4850000,
      changePercent: 3.42,
      dataTimestamp: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      isStale: false,
    },
  },
  {
    id: 'stock-2',
    symbol: 'INFY',
    exchange: 'NSE',
    name: 'Infosys Limited',
    sector: 'Technology',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latestSnapshot: {
      id: 'snap-2',
      stockId: 'stock-2',
      price: 1820.10,
      volume: 6200000,
      changePercent: -2.15,
      dataTimestamp: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      isStale: false,
    },
  },
  {
    id: 'stock-3',
    symbol: 'TCS',
    exchange: 'NSE',
    name: 'Tata Consultancy Services',
    sector: 'Technology',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latestSnapshot: {
      id: 'snap-3',
      stockId: 'stock-3',
      price: 4210.80,
      volume: 2100000,
      changePercent: 0.85,
      dataTimestamp: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      isStale: false,
    },
  },
  {
    id: 'stock-4',
    symbol: 'TATAMOTORS',
    exchange: 'NSE',
    name: 'Tata Motors Limited',
    sector: 'Automobile',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    latestSnapshot: {
      id: 'snap-4',
      stockId: 'stock-4',
      price: 985.60,
      volume: 12500000,
      changePercent: 5.12,
      dataTimestamp: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      isStale: false,
    },
  },
];

export const stocksApi = {
  async getStocks(search?: string, page = 1, limit = 20): Promise<PaginatedStocks> {
    if (IS_DEMO_MODE) {
      const filtered = search
        ? DEMO_STOCKS.filter(
            (s) =>
              s.symbol.toLowerCase().includes(search.toLowerCase()) ||
              s.name.toLowerCase().includes(search.toLowerCase())
          )
        : DEMO_STOCKS;
      return {
        items: filtered,
        pagination: { page, limit, totalItems: filtered.length, totalPages: 1 },
      };
    }
    const response = await apiClient.get<PaginatedStocks>('/stocks', {
      params: { search, page, limit },
    });
    return response.data;
  },

  async getStockBySymbol(symbol: string): Promise<Stock> {
    if (IS_DEMO_MODE) {
      return DEMO_STOCKS.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase()) || DEMO_STOCKS[0];
    }
    const response = await apiClient.get(`/stocks/symbol/${symbol.toUpperCase()}`);
    const data = (response.data as any)?.data || response.data;
    return data;
  },

  async getStockHistory(symbolOrId: string, limit = 50): Promise<StockSnapshot[]> {
    if (IS_DEMO_MODE) {
      const basePrice = 2900;
      return Array.from({ length: 15 }).map((_, i) => ({
        id: `hist-${i}`,
        stockId: 'stock-1',
        price: basePrice + Math.sin(i) * 40 + i * 5,
        volume: 4000000 + Math.floor(Math.random() * 1000000),
        changePercent: (Math.sin(i) * 40) / basePrice * 100,
        dataTimestamp: new Date(Date.now() - (15 - i) * 3600000 * 4).toISOString(),
        recordedAt: new Date(Date.now() - (15 - i) * 3600000 * 4).toISOString(),
        isStale: false,
      }));
    }

    let stockId = symbolOrId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(symbolOrId);
    if (!isUuid) {
      const stock = await this.getStockBySymbol(symbolOrId);
      if (!stock || !stock.id) return [];
      stockId = stock.id;
    }

    const response = await apiClient.get(`/stocks/${stockId}/snapshots`, {
      params: { limit, order: 'desc' },
    });
    const data = (response.data as any)?.data || response.data;
    return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  },

  async refreshMarketData(): Promise<void> {
    if (IS_DEMO_MODE) return;
    await apiClient.post('/stocks/ingest');
  },
};
