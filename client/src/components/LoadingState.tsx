import React from 'react';

export const LoadingState: React.FC<{ count?: number; type?: 'cards' | 'table' | 'feed' }> = ({
  count = 3,
  type = 'cards',
}) => {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-white/10 rounded"></div>
              <div className="h-4 w-12 bg-white/10 rounded"></div>
            </div>
            <div className="h-7 w-32 bg-white/15 rounded"></div>
            <div className="h-3 w-full bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="glass-panel rounded-2xl p-4 border border-white/5 animate-pulse space-y-3">
        <div className="h-6 w-48 bg-white/10 rounded mb-4"></div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-white/10 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 w-20 bg-white/10 rounded"></div>
                <div className="h-3 w-32 bg-white/5 rounded"></div>
              </div>
            </div>
            <div className="h-4 w-16 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded"></div>
          <div className="h-3 w-full bg-white/5 rounded"></div>
        </div>
      ))}
    </div>
  );
};
