import React from 'react';
import { LayoutDashboard, ListFilter, Zap, Settings as SettingsIcon, Plus, FolderKanban } from 'lucide-react';
import { Watchlist } from '../types/api';

interface SidebarProps {
  activeTab: 'dashboard' | 'watchlists' | 'feed' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'watchlists' | 'feed' | 'settings') => void;
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string) => void;
  onOpenCreateWatchlist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  watchlists,
  activeWatchlistId,
  setActiveWatchlistId,
  onOpenCreateWatchlist,
}) => {
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-[#0a0a0b]/50 p-4 space-y-6 shrink-0">
      
      {/* Navigation Sections */}
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Overview
        </div>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('watchlists')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'watchlists'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Watchlists</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'feed'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Intelligence Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Dynamic Watchlists Section */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Your Watchlists
          </span>
          <button
            onClick={onOpenCreateWatchlist}
            title="Create Watchlist"
            className="p-1 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-1 pr-1 flex-1">
          {watchlists.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-500 border border-dashed border-white/10 rounded-xl">
              No watchlists yet
            </div>
          ) : (
            watchlists.map((wl) => {
              const isActive = activeWatchlistId === wl.id;
              return (
                <button
                  key={wl.id}
                  onClick={() => {
                    setActiveWatchlistId(wl.id);
                    setActiveTab('dashboard');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left transition-all ${
                    isActive
                      ? 'bg-white/10 text-white font-medium border border-white/10'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <FolderKanban className="w-4 h-4 text-emerald-400/70 shrink-0" />
                    <span className="truncate">{wl.name}</span>
                  </div>
                  {wl.itemCount !== undefined && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                      {wl.itemCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

    </aside>
  );
};
