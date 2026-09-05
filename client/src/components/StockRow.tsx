import React from 'react';
import { Trash2, TrendingUp, TrendingDown, Zap, Clock } from 'lucide-react';
import { WatchlistItem, StockDeltaAnalysis } from '../types/api';
import { SparklineChart } from './SparklineChart';

interface StockRowProps {
  item: WatchlistItem;
  deltaAnalysis?: StockDeltaAnalysis;
  onSelectStock: (symbol: string) => void;
  onRemoveStock?: (stockId: string) => void;
}

export const StockRow: React.FC<StockRowProps> = ({
  item,
  deltaAnalysis,
  onSelectStock,
  onRemoveStock,
}) => {
  const stock = item.stock;
  if (!stock) return null;

  const currentPrice = deltaAnalysis?.currentPrice;
  const dayChange = deltaAnalysis?.priceChangePercent ?? 0;
  const isPositive = dayChange >= 0;

  const renderSignalBadge = () => {
    if (!deltaAnalysis || !deltaAnalysis.isMeaningful) return null;

    if (deltaAnalysis.signals.includes('SIGNIFICANT_GAIN')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <TrendingUp className="w-3 h-3" />
          <span>GAIN</span>
        </span>
      );
    }
    if (deltaAnalysis.signals.includes('SIGNIFICANT_DROP')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20">
          <TrendingDown className="w-3 h-3" />
          <span>DROP</span>
        </span>
      );
    }
    if (deltaAnalysis.signals.includes('VOLUME_SURGE')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Zap className="w-3 h-3" />
          <span>SURGE</span>
        </span>
      );
    }
    return null;
  };

  return (
    <tr
      onClick={() => onSelectStock(stock.symbol)}
      className="group hover:bg-white/[0.04] transition-colors border-b border-white/5 cursor-pointer text-sm"
    >
      {/* Stock Symbol & Info */}
      <td className="py-3.5 px-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-gray-200 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 transition-all">
            {stock.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white font-mono tracking-tight">{stock.symbol}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/5">
                {stock.exchange}
              </span>
            </div>
            <span className="text-xs text-gray-400 block truncate max-w-[160px]">{stock.name}</span>
          </div>
        </div>
      </td>

      {/* Current Price */}
      <td className="py-3.5 px-4 font-mono font-semibold text-gray-100 text-right">
        {currentPrice !== undefined && currentPrice !== null
          ? `₹${currentPrice.toLocaleString('en-IN')}`
          : '—'}
      </td>

      {/* Daily / Delta Change % */}
      <td className="py-3.5 px-4 text-right font-mono font-semibold">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs ${
            isPositive
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-red-400 bg-red-500/10 border border-red-500/20'
          }`}
        >
          {isPositive ? '+' : ''}
          {dayChange.toFixed(2)}%
        </span>
      </td>

      {/* Signal / Delta Status */}
      <td className="py-3.5 px-4 text-center">{renderSignalBadge() || <span className="text-xs text-gray-500">—</span>}</td>

      {/* Sparkline (Visual Indicator) */}
      <td className="py-3.5 px-4 hidden md:table-cell">
        <div className="flex justify-center">
          <SparklineChart
            data={deltaAnalysis ? [deltaAnalysis.baselinePrice || currentPrice || 100, currentPrice || 100] : [100, 102]}
            color={isPositive ? '#10b981' : '#ef4444'}
          />
        </div>
      </td>

      {/* Actions */}
      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        {onRemoveStock && (
          <button
            onClick={() => onRemoveStock(stock.id)}
            title="Remove from watchlist"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </td>
    </tr>
  );
};
