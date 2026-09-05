import React from 'react';
import { TrendingUp, TrendingDown, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StockDeltaAnalysis } from '../types/api';

interface ChangeCardProps {
  item: StockDeltaAnalysis;
  onSelectStock: (symbol: string) => void;
}

export const ChangeCard: React.FC<ChangeCardProps> = ({ item, onSelectStock }) => {
  const isGain = item.signals.includes('SIGNIFICANT_GAIN');
  const isDrop = item.signals.includes('SIGNIFICANT_DROP');
  const isVolume = item.signals.includes('VOLUME_SURGE');

  let badgeColor = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  let badgeIcon = <Zap className="w-3.5 h-3.5" />;
  let signalTitle = 'MEANINGFUL CHANGE';
  let cardBorder = 'border-white/10';

  if (isGain) {
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    badgeIcon = <TrendingUp className="w-3.5 h-3.5" />;
    signalTitle = 'SIGNIFICANT GAIN';
    cardBorder = 'border-emerald-500/20 hover:border-emerald-500/40';
  } else if (isDrop) {
    badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
    badgeIcon = <TrendingDown className="w-3.5 h-3.5" />;
    signalTitle = 'SIGNIFICANT DROP';
    cardBorder = 'border-red-500/20 hover:border-red-500/40';
  } else if (isVolume) {
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    badgeIcon = <Zap className="w-3.5 h-3.5" />;
    signalTitle = 'UNUSUAL VOLUME';
    cardBorder = 'border-amber-500/20 hover:border-amber-500/40';
  }

  return (
    <div
      onClick={() => onSelectStock(item.symbol)}
      className={`glass-panel-interactive p-5 rounded-2xl border ${cardBorder} flex flex-col justify-between cursor-pointer space-y-4`}
    >
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold font-mono tracking-wide ${badgeColor}`}>
          {badgeIcon}
          <span>{signalTitle}</span>
        </div>
        <span className="text-xs font-mono text-gray-500">{item.exchange}</span>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{item.symbol}</h3>
            <p className="text-xs text-gray-400 truncate max-w-[180px]">{item.name}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-mono text-gray-100">
              ₹{item.currentPrice ? item.currentPrice.toLocaleString('en-IN') : 'N/A'}
            </div>
            <div
              className={`flex items-center justify-end text-xs font-bold font-mono ${
                item.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {item.priceChangePercent >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>
                {item.priceChangePercent >= 0 ? '+' : ''}
                {item.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic insight text from DeltaService */}
      <div className="pt-3 border-t border-white/5">
        <p className="text-xs text-gray-300 leading-relaxed font-sans">{item.insight}</p>
      </div>

      {/* Volume info */}
      {item.volumeChangePercent !== null && (
        <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 bg-white/5 px-3 py-1.5 rounded-xl">
          <span>Volume Delta:</span>
          <span className={item.volumeChangePercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-gray-300'}>
            {item.volumeChangePercent >= 0 ? '+' : ''}
            {item.volumeChangePercent.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};
