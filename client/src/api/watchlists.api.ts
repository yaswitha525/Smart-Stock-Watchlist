import { apiClient, IS_DEMO_MODE } from './client';
import { Watchlist, WatchlistItem } from '../types/api';

const DEMO_WATCHLISTS: Watchlist[] = [
  {
    id: 'demo-wl-1',
    userId: 'demo-user-1',
    name: 'Tech & Innovation',
    description: 'High conviciton tech growth stocks',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemCount: 4,
    lastVisitedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    items: [
      {
        id: 'item-1',
        watchlistId: 'demo-wl-1',
        stockId: 'stock-1',
        addedAt: new Date().toISOString(),
        stock: {
          id: 'stock-1',
          symbol: 'RELIANCE',
          exchange: 'NSE',
          name: 'Reliance Industries Ltd.',
          sector: 'Energy',
          isActive: true,
        },
      },
      {
        id: 'item-2',
        watchlistId: 'demo-wl-1',
        stockId: 'stock-2',
        addedAt: new Date().toISOString(),
        stock: {
          id: 'stock-2',
          symbol: 'INFY',
          exchange: 'NSE',
          name: 'Infosys Limited',
          sector: 'Technology',
          isActive: true,
        },
      },
      {
        id: 'item-3',
        watchlistId: 'demo-wl-1',
        stockId: 'stock-3',
        addedAt: new Date().toISOString(),
        stock: {
          id: 'stock-3',
          symbol: 'TCS',
          exchange: 'NSE',
          name: 'Tata Consultancy Services',
          sector: 'Technology',
          isActive: true,
        },
      },
      {
        id: 'item-4',
        watchlistId: 'demo-wl-1',
        stockId: 'stock-4',
        addedAt: new Date().toISOString(),
        stock: {
          id: 'stock-4',
          symbol: 'TATAMOTORS',
          exchange: 'NSE',
          name: 'Tata Motors Limited',
          sector: 'Automobile',
          isActive: true,
        },
      },
    ],
  },
  {
    id: 'demo-wl-2',
    userId: 'demo-user-1',
    name: 'Long Term Core',
    description: 'Dividend paying & bluechip holdings',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemCount: 2,
    lastVisitedAt: new Date(Date.now() - 86400000).toISOString(),
    items: [],
  },
];

export const watchlistsApi = {
  async getWatchlists(): Promise<Watchlist[]> {
    if (IS_DEMO_MODE) {
      return DEMO_WATCHLISTS;
    }
    const response = await apiClient.get<Watchlist[]>('/watchlists');
    return response.data;
  },

  async getWatchlistById(id: string): Promise<Watchlist> {
    if (IS_DEMO_MODE) {
      return DEMO_WATCHLISTS.find((w) => w.id === id) || DEMO_WATCHLISTS[0];
    }
    const response = await apiClient.get<Watchlist>(`/watchlists/${id}`);
    return response.data;
  },

  async createWatchlist(name: string, description?: string): Promise<Watchlist> {
    if (IS_DEMO_MODE) {
      const newWl: Watchlist = {
        id: `demo-wl-${Date.now()}`,
        userId: 'demo-user-1',
        name,
        description: description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 0,
        items: [],
      };
      DEMO_WATCHLISTS.push(newWl);
      return newWl;
    }
    const response = await apiClient.post<Watchlist>('/watchlists', { name, description });
    return response.data;
  },

  async updateWatchlist(id: string, name?: string, description?: string): Promise<Watchlist> {
    if (IS_DEMO_MODE) {
      const wl = DEMO_WATCHLISTS.find((w) => w.id === id);
      if (wl) {
        if (name) wl.name = name;
        if (description !== undefined) wl.description = description;
      }
      return wl || DEMO_WATCHLISTS[0];
    }
    const response = await apiClient.put<Watchlist>(`/watchlists/${id}`, { name, description });
    return response.data;
  },

  async deleteWatchlist(id: string): Promise<void> {
    if (IS_DEMO_MODE) {
      const idx = DEMO_WATCHLISTS.findIndex((w) => w.id === id);
      if (idx !== -1) DEMO_WATCHLISTS.splice(idx, 1);
      return;
    }
    await apiClient.delete(`/watchlists/${id}`);
  },

  async addStockToWatchlist(watchlistId: string, symbol: string, exchange: string = 'NSE'): Promise<WatchlistItem> {
    if (IS_DEMO_MODE) {
      const item: WatchlistItem = {
        id: `item-${Date.now()}`,
        watchlistId,
        stockId: `stock-${Date.now()}`,
        addedAt: new Date().toISOString(),
        stock: {
          id: `stock-${Date.now()}`,
          symbol: symbol.toUpperCase(),
          exchange,
          name: `${symbol.toUpperCase()} Ltd.`,
          sector: 'General',
          isActive: true,
        },
      };
      return item;
    }
    const response = await apiClient.post<WatchlistItem>(`/watchlists/${watchlistId}/items`, {
      symbol: symbol.toUpperCase(),
      exchange: exchange.toUpperCase(),
    });
    return response.data;
  },

  async removeStockFromWatchlist(watchlistId: string, stockId: string): Promise<void> {
    if (IS_DEMO_MODE) {
      return;
    }
    await apiClient.delete(`/watchlists/${watchlistId}/items/${stockId}`);
  },

  async recordVisit(watchlistId: string): Promise<{ lastVisitedAt: string }> {
    if (IS_DEMO_MODE) {
      const wl = DEMO_WATCHLISTS.find((w) => w.id === watchlistId);
      const now = new Date().toISOString();
      if (wl) wl.lastVisitedAt = now;
      return { lastVisitedAt: now };
    }
    const response = await apiClient.post<{ lastVisitedAt: string }>(`/watchlists/${watchlistId}/visit`);
    return response.data;
  },
};
