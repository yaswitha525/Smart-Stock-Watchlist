import React from 'react';
import { LayoutDashboard, ListFilter, Zap, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'dashboard' | 'watchlists' | 'feed' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'watchlists' | 'feed' | 'settings') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
      <div className="glass-panel rounded-2xl p-2 flex items-center justify-around border border-white/10 shadow-2xl shadow-black/80">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('watchlists')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'watchlists'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span>Watchlists</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'feed'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'settings'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
