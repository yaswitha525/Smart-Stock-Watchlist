import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWatchlists } from './hooks/useWatchlists';
import { TopNavigation } from './components/TopNavigation';
import { Sidebar } from './components/Sidebar';
import { BottomNavigation } from './components/BottomNavigation';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { Dashboard } from './pages/Dashboard';
import { Watchlists } from './pages/Watchlists';
import { IntelligenceFeed } from './pages/IntelligenceFeed';
import { StockDetail } from './pages/StockDetail';
import { SettingsPage } from './pages/Settings';

export function App() {
  const { user, isAuthenticated, login, register, logout } = useAuth();
  const {
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    activeWatchlist,
    createWatchlist,
    deleteWatchlist,
    addStock,
    removeStock,
    recordVisit,
  } = useWatchlists(isAuthenticated);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'watchlists' | 'feed' | 'settings'>('dashboard');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(null);

  // Key combination listener for Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header */}
      <TopNavigation
        user={user}
        isAuthenticated={isAuthenticated}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={logout}
        onOpenSearch={() => setShowSearchModal(true)}
        lastUpdatedTimestamp={activeWatchlist?.lastVisitedAt || undefined}
      />

      {/* Main Workspace (Sidebar + Dynamic View Content) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Desktop Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          setActiveWatchlistId={setActiveWatchlistId}
          onOpenCreateWatchlist={() => setActiveTab('watchlists')}
        />

        {/* View Content Area */}
        <main className="flex-1 min-w-0 lg:pl-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              user={user}
              watchlists={watchlists}
              activeWatchlistId={activeWatchlistId}
              setActiveWatchlistId={setActiveWatchlistId}
              activeWatchlist={activeWatchlist}
              onSelectStock={(sym) => setSelectedStockSymbol(sym)}
              onOpenSearch={() => setShowSearchModal(true)}
              onOpenCreateWatchlist={() => setActiveTab('watchlists')}
              onRemoveStock={removeStock}
              onRecordVisit={recordVisit}
            />
          )}

          {activeTab === 'watchlists' && (
            <Watchlists
              watchlists={watchlists}
              activeWatchlistId={activeWatchlistId}
              setActiveWatchlistId={setActiveWatchlistId}
              activeWatchlist={activeWatchlist}
              onSelectStock={(sym) => setSelectedStockSymbol(sym)}
              onOpenSearch={() => setShowSearchModal(true)}
              onCreateWatchlist={createWatchlist}
              onDeleteWatchlist={deleteWatchlist}
              onRemoveStock={removeStock}
            />
          )}

          {activeTab === 'feed' && (
            <IntelligenceFeed
              activeWatchlistId={activeWatchlistId}
              onSelectStock={(sym) => setSelectedStockSymbol(sym)}
            />
          )}

          {activeTab === 'settings' && <SettingsPage />}
        </main>

      </div>

      {/* Floating Bottom Navigation Dock (Mobile Devices Only) */}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Modals */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        watchlists={watchlists}
        activeWatchlistId={activeWatchlistId}
        onAddStock={addStock}
        onCreateWatchlist={createWatchlist}
        isAuthenticated={isAuthenticated}
        onOpenAuth={() => {
          setShowSearchModal(false);
          setShowAuthModal(true);
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={login}
        onRegister={register}
      />

      {selectedStockSymbol && (
        <StockDetail
          symbol={selectedStockSymbol}
          onClose={() => setSelectedStockSymbol(null)}
        />
      )}

    </div>
  );
}
export default App;
