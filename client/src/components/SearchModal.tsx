import React, { useState, useEffect } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { stocksApi } from '../api/stocks.api';
import { Stock, Watchlist } from '../types/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  onAddStock: (watchlistId: string, symbol: string) => Promise<void>;
  onCreateWatchlist?: (name: string, description?: string) => Promise<Watchlist>;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  watchlists,
  activeWatchlistId,
  onAddStock,
  onCreateWatchlist,
  isAuthenticated,
  onOpenAuth,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(activeWatchlistId);
  const [addedSymbols, setAddedSymbols] = useState<Record<string, boolean>>({});
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (activeWatchlistId) setSelectedWatchlistId(activeWatchlistId);
  }, [activeWatchlistId]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setAddError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await stocksApi.getStocks(query, 1, 10);
        if (res && Array.isArray(res.items)) {
          setResults(res.items);
        } else if (Array.isArray(res)) {
          setResults(res);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Failed to search stocks', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (symbol: string) => {
    if (isAuthenticated === false && onOpenAuth) {
      onOpenAuth();
      return;
    }

    setAddError(null);
    setAddingSymbol(symbol);

    try {
      let targetWlId = selectedWatchlistId || activeWatchlistId || watchlists[0]?.id;

      // Auto-create default watchlist if user has no watchlists yet
      if (!targetWlId && onCreateWatchlist) {
        const newWl = await onCreateWatchlist('My Watchlist', 'Primary watchlist');
        targetWlId = newWl.id;
        setSelectedWatchlistId(newWl.id);
      }

      if (!targetWlId) {
        setAddError('No active watchlist found. Please create a watchlist first.');
        return;
      }

      await onAddStock(targetWlId, symbol);
      setAddedSymbols((prev) => ({ ...prev, [symbol]: true }));
      setTimeout(() => {
        setAddedSymbols((prev) => ({ ...prev, [symbol]: false }));
      }, 2500);
    } catch (err: any) {
      console.error('Failed to add stock', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to add stock';
      setAddError(msg);
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 flex items-center space-x-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stock symbol or name (e.g., RELIANCE, INFY)..."
            className="w-full bg-transparent text-gray-100 text-sm focus:outline-none placeholder-gray-500 font-sans"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Watchlist Target Selector */}
        <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>Target Watchlist:</span>
          {watchlists.length > 0 ? (
            <select
              value={selectedWatchlistId || watchlists[0]?.id || ''}
              onChange={(e) => setSelectedWatchlistId(e.target.value)}
              className="bg-[#0a0a0b] text-gray-200 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              {watchlists.map((wl) => (
                <option key={wl.id} value={wl.id}>
                  {wl.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-amber-400 font-medium">Will auto-create "My Watchlist"</span>
          )}
        </div>

        {/* Error Alert Banner */}
        {addError && (
          <div className="mx-4 mt-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex justify-between items-center">
            <span>{addError}</span>
            <button onClick={() => setAddError(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 font-mono animate-pulse">
              Searching market database...
            </div>
          ) : !Array.isArray(results) || results.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No matching stocks found. Try searching for RELIANCE, INFY, TCS, or TATAMOTORS.
            </div>
          ) : (
            results.map((stock) => {
              const isAdded = addedSymbols[stock.symbol];
              const isAdding = addingSymbol === stock.symbol;
              return (
                <div
                  key={stock.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-gray-200">
                      {stock.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white font-mono">{stock.symbol}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5">
                          {stock.exchange}
                        </span>
                        {stock.latestSnapshot && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              Number(stock.latestSnapshot.changePercent) >= 0
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-red-400 bg-red-500/10 border border-red-500/20'
                            }`}
                          >
                            ₹{Number(stock.latestSnapshot.price).toFixed(2)} (
                            {Number(stock.latestSnapshot.changePercent) >= 0 ? '+' : ''}
                            {Number(stock.latestSnapshot.changePercent).toFixed(2)}%)
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 block">{stock.name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdd(stock.symbol)}
                    disabled={isAdded || isAdding}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : isAdding
                        ? 'bg-white/10 text-gray-400 cursor-wait'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : isAdding ? (
                      <span>Adding...</span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stock</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
