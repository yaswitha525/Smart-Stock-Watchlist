export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MarketStatus {
  status: 'OPEN' | 'CLOSED' | 'WEEKEND';
  isWeekend: boolean;
  isMarketOpen: boolean;
  sessionDate: string;
  sessionDateFormatted: string;
  sessionDateFormattedShort: string;
  sessionDateLabel: string;
  statusMessage: string;
}

export interface StockSnapshot {
  id: string;
  stockId: string;
  price: number;
  previousClose?: number;
  changeAmount?: number;
  changePercent: number;
  direction?: 'positive' | 'negative' | 'neutral';
  volume: number;
  dataTimestamp: string;
  recordedAt: string;
  isStale: boolean;
  dataFreshnessStatus?: 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';
}

export interface StockDetail {
  id: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  isActive: boolean;
  latestSnapshot?: StockSnapshot | null;
}

export interface WatchlistItem {
  id: string;
  watchlistId: string;
  stockId: string;
  addedAt: string;
  stock?: StockDetail & { latestSnapshot?: StockSnapshot | null };
}

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  items?: WatchlistItem[];
  lastVisitedAt?: string | null;
}

export interface Stock {
  id: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  latestSnapshot?: StockSnapshot | null;
  marketStatus?: MarketStatus;
}

export interface PaginatedStocks {
  items: Stock[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export type ChangeSignal = 'SIGNIFICANT_GAIN' | 'SIGNIFICANT_DROP' | 'VOLUME_SURGE' | 'NEUTRAL';

export interface StockDeltaAnalysis {
  stockId: string;
  symbol: string;
  exchange: string;
  name: string;
  sector: string | null;
  baselinePrice: number | null;
  currentPrice: number | null;
  priceDelta: number;
  priceChangePercent: number;
  baselineVolume: number | null;
  currentVolume: number | null;
  volumeDelta: number;
  volumeChangePercent: number | null;
  signals: ChangeSignal[];
  isMeaningful: boolean;
  insight: string;
  baselineSnapshot: StockSnapshot | null;
  currentSnapshot: StockSnapshot | null;
}

export interface WatchlistDeltaResponse {
  watchlistId: string;
  watchlistName: string;
  referenceTimestamp: string;
  hasPreviousVisit: boolean;
  totalStocks: number;
  meaningfulChangesCount: number;
  summaryInsight: string;
  items: StockDeltaAnalysis[];
}

export interface SystemHealth {
  status: string;
  uptime: number;
  timestamp: string;
  cache?: {
    connected: boolean;
  };
  jobs?: {
    connected: boolean;
  };
}

export interface CacheStats {
  redisStatus: string;
  totalKeys: number;
  hitRate: number;
  memoryUsed: string;
}
