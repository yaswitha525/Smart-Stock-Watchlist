import React from 'react';
import { CheckCircle2, Clock, Plus, Zap, AlertTriangle } from 'lucide-react';
import { User, Watchlist } from '../types/api';
import { useDelta } from '../hooks/useDelta';
import { ChangeCard } from '../components/ChangeCard';
import { StockRow } from '../components/StockRow';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

interface DashboardProps {
  user: User | null;
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string) => void;
  activeWatchlist: Watchlist | null;
  onSelectStock: (symbol: string) => void;
  onOpenSearch: () => void;
  onOpenCreateWatchlist: () => void;
  onRemoveStock: (watchlistId: string, stockId: string) => Promise<void>;
  onRecordVisit: (watchlistId: string) => Promise<any>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  watchlists,
  activeWatchlistId,
  setActiveWatchlistId,
  activeWatchlist,
  onSelectStock,
  onOpenSearch,
  onOpenCreateWatchlist,
  onRemoveStock,
  onRecordVisit,
}) => {
  const { delta, loading: deltaLoading, error: deltaError, refetch } = useDelta(activeWatchlistId);

  const handleMarkReviewed = async () => {
    if (!activeWatchlistId) return;
    try {
      await onRecordVisit(activeWatchlistId);
      await refetch();
    } catch (err) {
      console.error('Failed to record visit', err);
    }
  };

  const meaningfulItems = delta?.items.filter((item) => item.isMeaningful) || [];

  const formatLastVisitDate = (isoString?: string | null) => {
    if (!isoString) return 'First visit today';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Greeting Banner & Watchlist Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-emerald-400">{user?.name || user?.email?.split('@')[0] || 'Investor'}</span> 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>
              Reference timestamp:{' '}
              <strong className="text-gray-200 font-mono">
                {formatLastVisitDate(delta?.referenceTimestamp || activeWatchlist?.lastVisitedAt)}
              </strong>
            </span>
          </p>
        </div>

        {/* Dynamic Watchlist Selector Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
          {watchlists.map((wl) => {
            const isActive = activeWatchlistId === wl.id;
            return (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                {wl.name}
              </button>
            );
          })}
          <button
            onClick={onOpenCreateWatchlist}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
            title="Create Watchlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Intelligence Section ("What Changed Since Your Last Visit?") */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                WHAT CHANGED SINCE YOUR LAST VISIT?
              </h2>
              <p className="text-xs text-gray-400">
                {delta?.summaryInsight || 'Calculated by backend DeltaService analysis'}
              </p>
            </div>
          </div>

          {activeWatchlistId && (
            <button
              onClick={handleMarkReviewed}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all hover:scale-105"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Watchlist as Reviewed</span>
            </button>
          )}
        </div>

        {/* Delta Cards Grid */}
        {deltaLoading ? (
          <LoadingState count={3} type="cards" />
        ) : deltaError ? (
          <ErrorState message={deltaError} onRetry={refetch} />
        ) : meaningfulItems.length === 0 ? (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 text-center space-y-2">
            <p className="text-sm text-gray-300 font-medium">Your watchlist is quiet.</p>
            <p className="text-xs text-gray-500">
              No stock exceeded your 2.0% price or 50% volume change thresholds since your last visit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {meaningfulItems.map((item) => (
              <ChangeCard key={item.stockId} item={item} onSelectStock={onSelectStock} />
            ))}
          </div>
        )}
      </section>

      {/* Main Stock Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {activeWatchlist?.name || 'Watchlist Stocks'}
          </h2>
          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
        </div>

        {!activeWatchlist || activeWatchlist.items?.length === 0 ? (
          <EmptyState
            title="Watchlist is empty"
            description="Add stocks to start monitoring price changes, volume surges, and meaningful market intelligence."
            actionLabel="Search & Add Stock"
            onAction={onOpenSearch}
          />
        ) : (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                    <th className="py-3 px-4 text-right">Day / Delta Change</th>
                    <th className="py-3 px-4 text-center">Signal</th>
                    <th className="py-3 px-4 text-center hidden md:table-cell">Trend Sparkline</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeWatchlist.items?.map((item) => {
                    const deltaAnalysis = delta?.items.find((d) => d.stockId === item.stockId);
                    return (
                      <StockRow
                        key={item.id}
                        item={item}
                        deltaAnalysis={deltaAnalysis}
                        onSelectStock={onSelectStock}
                        onRemoveStock={(sId) => onRemoveStock(activeWatchlist.id, sId)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};
