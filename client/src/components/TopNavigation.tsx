import React from 'react';
import { Activity, Search, User as UserIcon, LogOut, ShieldAlert } from 'lucide-react';
import { User } from '../types/api';
import { IS_DEMO_MODE } from '../api/client';
import { getISTMarketStatus } from '../utils/marketStatus';

interface TopNavigationProps {
  user: User | null;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  lastUpdatedTimestamp?: string;
  isStale?: boolean;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  user,
  isAuthenticated,
  onOpenAuth,
  onLogout,
  onOpenSearch,
  lastUpdatedTimestamp,
  isStale = false,
}) => {
  const marketInfo = getISTMarketStatus();

  const formatMarketStatus = () => {
    if (marketInfo.status === 'WEEKEND') {
      return {
        label: `Market Closed · ${marketInfo.sessionDateFormatted}`,
        color: 'bg-amber-500',
      };
    }
    if (marketInfo.status === 'CLOSED') {
      return {
        label: `Market Closed · ${marketInfo.sessionDateFormatted}`,
        color: 'bg-amber-500',
      };
    }
    if (isStale) {
      return {
        label: `Data Delayed · ${marketInfo.sessionDateFormatted}`,
        color: 'bg-amber-500 animate-pulse',
      };
    }
    return {
      label: `NSE Live · ${marketInfo.sessionDateFormatted}`,
      color: 'bg-emerald-500 animate-pulse',
    };
  };

  const status = formatMarketStatus();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Live Market Badge */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              Market<span className="text-emerald-400">Pulse</span>
            </span>
          </div>

          {/* Dynamic Market Status Badge */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
            <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
            <span className="font-mono text-gray-300">{status.label}</span>
          </div>

          {IS_DEMO_MODE && (
            <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Demo Mode</span>
            </div>
          )}
        </div>

        {/* Global Search Bar Trigger */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm transition-all"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span>Search stocks (e.g. RELIANCE, INFY)...</span>
            </div>
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-white/10 rounded text-gray-400">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* User Account / Auth Actions */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-gray-200">{user.name || 'User'}</div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{user.email}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
