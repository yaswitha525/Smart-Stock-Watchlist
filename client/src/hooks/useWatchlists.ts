import { useState, useEffect, useCallback } from 'react';
import { Watchlist } from '../types/api';
import { watchlistsApi } from '../api/watchlists.api';

export function useWatchlists(isAuthenticated: boolean) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchlists = useCallback(async () => {
    if (!isAuthenticated) {
      setWatchlists([]);
      setActiveWatchlistId(null);
      setActiveWatchlist(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await watchlistsApi.getWatchlists();
      setWatchlists(data);
      if (data.length > 0) {
        if (!activeWatchlistId || !data.some((w) => w.id === activeWatchlistId)) {
          setActiveWatchlistId(data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch watchlists');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeWatchlistId]);

  const fetchSingleWatchlist = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await watchlistsApi.getWatchlistById(id);
      setActiveWatchlist(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load watchlist details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeWatchlistId) {
      fetchSingleWatchlist(activeWatchlistId);
    }
  }, [activeWatchlistId]);

  const createWatchlist = async (name: string, description?: string) => {
    const newWl = await watchlistsApi.createWatchlist(name, description);
    setWatchlists((prev) => [...prev, newWl]);
    setActiveWatchlistId(newWl.id);
    return newWl;
  };

  const deleteWatchlist = async (id: string) => {
    await watchlistsApi.deleteWatchlist(id);
    const updated = watchlists.filter((w) => w.id !== id);
    setWatchlists(updated);
    if (activeWatchlistId === id) {
      setActiveWatchlistId(updated[0]?.id || null);
    }
  };

  const addStock = async (watchlistId: string, symbol: string) => {
    await watchlistsApi.addStockToWatchlist(watchlistId, symbol);
    await fetchSingleWatchlist(watchlistId);
    await fetchWatchlists();
  };

  const removeStock = async (watchlistId: string, stockId: string) => {
    await watchlistsApi.removeStockFromWatchlist(watchlistId, stockId);
    await fetchSingleWatchlist(watchlistId);
    await fetchWatchlists();
  };

  const recordVisit = async (watchlistId: string) => {
    const res = await watchlistsApi.recordVisit(watchlistId);
    if (activeWatchlist && activeWatchlist.id === watchlistId) {
      setActiveWatchlist({ ...activeWatchlist, lastVisitedAt: res.lastVisitedAt });
    }
    return res;
  };

  return {
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    activeWatchlist,
    loading,
    error,
    refetch: fetchWatchlists,
    createWatchlist,
    deleteWatchlist,
    addStock,
    removeStock,
    recordVisit,
  };
}
