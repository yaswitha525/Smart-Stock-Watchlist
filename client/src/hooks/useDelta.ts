import { useState, useEffect, useCallback } from 'react';
import { WatchlistDeltaResponse } from '../types/api';
import { deltaApi } from '../api/delta.api';

export function useDelta(watchlistId: string | null, priceThreshold = 2.0, volumeThreshold = 50.0) {
  const [delta, setDelta] = useState<WatchlistDeltaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDelta = useCallback(async () => {
    if (!watchlistId) {
      setDelta(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await deltaApi.getWatchlistDelta(watchlistId, priceThreshold, volumeThreshold);
      setDelta(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to fetch meaningful changes');
    } finally {
      setLoading(false);
    }
  }, [watchlistId, priceThreshold, volumeThreshold]);

  useEffect(() => {
    fetchDelta();
  }, [fetchDelta]);

  return {
    delta,
    loading,
    error,
    refetch: fetchDelta,
  };
}
