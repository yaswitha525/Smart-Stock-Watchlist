import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Clock, Activity, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { stocksApi } from '../api/stocks.api';
import { Stock, StockSnapshot } from '../types/api';
import { LoadingState } from '../components/LoadingState';

interface StockDetailProps {
  symbol: string | null;
  onClose: () => void;
}

export const StockDetail: React.FC<StockDetailProps> = ({ symbol, onClose }) => {
  const [stock, setStock] = useState<Stock | null>(null);
  const [history, setHistory] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

  useEffect(() => {
    if (!symbol) return;
    async function loadData() {
      setLoading(true);
      try {
        const [stockRes, histRes] = await Promise.all([
          stocksApi.getStockBySymbol(symbol!),
          stocksApi.getStockHistory(symbol!, 50),
        ]);
        setStock(stockRes);
        setHistory(histRes);
      } catch (err) {
        console.error('Failed to load stock detail', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [symbol]);

  if (!symbol) return null;

  const currentPrice = stock?.latestSnapshot?.price;
  const dayChange = stock?.latestSnapshot?.changePercent ?? 0;
  const isPositive = dayChange >= 0;
  const isStale = stock?.latestSnapshot?.isStale;

  const chartData = [...history].reverse().map((snap) => ({
    time: new Date(snap.dataTimestamp || snap.recordedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: snap.price,
    volume: snap.volume,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-extrabold text-white font-mono tracking-tight">{symbol}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                {stock?.exchange || 'NSE'}
              </span>
              {isStale && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Stale Snapshot</span>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">{stock?.name} {stock?.sector ? `· ${stock.sector}` : ''}</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12">
            <LoadingState count={3} type="table" />
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto">
            
            {/* Price & Day Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  ₹{currentPrice ? currentPrice.toLocaleString('en-IN') : 'N/A'}
                </div>
                <div
                  className={`flex items-center space-x-1 text-sm font-bold font-mono mt-1 ${
                    isPositive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>
                    {isPositive ? '+' : ''}
                    {dayChange.toFixed(2)}% Today
                  </span>
                </div>
              </div>

              {/* Timeframe Controls */}
              <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
                {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      timeframe === tf ? 'bg-emerald-500 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="glass-panel p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Historical Price Chart ({chartData.length} Snapshots)
              </h4>

              {chartData.length < 2 ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-500 font-mono">
                  No historical data available yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={isPositive ? '#10b981' : '#ef4444'}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={isPositive ? '#10b981' : '#ef4444'}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLine={false} />
                      <YAxis
                        domain={['auto', 'auto']}
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#16161a',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? '#10b981' : '#ef4444'}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Historical Snapshot Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Recent Price Snapshots
              </h4>
              <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4 text-right">Change %</th>
                      <th className="py-2.5 px-4 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.slice(0, 5).map((snap) => (
                      <tr key={snap.id} className="hover:bg-white/5">
                        <td className="py-2.5 px-4 text-gray-300">
                          {new Date(snap.dataTimestamp || snap.recordedAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-gray-100">
                          ₹{snap.price.toFixed(2)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-bold ${
                            snap.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {snap.changePercent >= 0 ? '+' : ''}
                          {snap.changePercent.toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-400">
                          {snap.volume.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
