import React, { useState } from 'react';
import { Plus, Trash2, FolderKanban, ArrowRight } from 'lucide-react';
import { Watchlist } from '../types/api';
import { StockRow } from '../components/StockRow';
import { EmptyState } from '../components/EmptyState';

interface WatchlistsProps {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string) => void;
  activeWatchlist: Watchlist | null;
  onSelectStock: (symbol: string) => void;
  onOpenSearch: () => void;
  onCreateWatchlist: (name: string, desc?: string) => Promise<any>;
  onDeleteWatchlist: (id: string) => Promise<void>;
  onRemoveStock: (watchlistId: string, stockId: string) => Promise<void>;
}

export const Watchlists: React.FC<WatchlistsProps> = ({
  watchlists,
  activeWatchlistId,
  setActiveWatchlistId,
  activeWatchlist,
  onSelectStock,
  onOpenSearch,
  onCreateWatchlist,
  onDeleteWatchlist,
  onRemoveStock,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreateWatchlist(name, desc);
      setName('');
      setDesc('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create watchlist', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Watchlist Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Organize your stock portfolios into dynamic watchlists.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>New Watchlist</span>
        </button>
      </div>

      {/* Watchlist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {watchlists.map((wl) => {
          const isActive = activeWatchlistId === wl.id;
          return (
            <div
              key={wl.id}
              onClick={() => setActiveWatchlistId(wl.id)}
              className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                isActive
                  ? 'border-emerald-500/40 bg-white/[0.08] shadow-lg shadow-emerald-500/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete watchlist "${wl.name}"?`)) {
                      onDeleteWatchlist(wl.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Watchlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{wl.name}</h3>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {wl.description || 'No description provided'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-400">
                <span className="font-mono">{wl.itemCount ?? wl.items?.length ?? 0} Stocks</span>
                <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Watchlist Details */}
      {activeWatchlist && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{activeWatchlist.name} Items</h2>
            <button
              onClick={onOpenSearch}
              className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock to {activeWatchlist.name}</span>
            </button>
          </div>

          {!activeWatchlist.items || activeWatchlist.items.length === 0 ? (
            <EmptyState
              title="No stocks in this watchlist"
              description="Add stocks to monitor live market changes."
              actionLabel="Add Stock"
              onAction={onOpenSearch}
            />
          ) : (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Day Change</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Trend</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeWatchlist.items.map((item) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      onSelectStock={onSelectStock}
                      onRemoveStock={(sId) => onRemoveStock(activeWatchlist.id, sId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Watchlist</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Watchlist Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Energy & Utilities"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Description (Optional)</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Notes about this portfolio strategy..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Creating...' : 'Create Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
