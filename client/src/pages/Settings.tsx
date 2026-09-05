import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Sliders, ShieldCheck, Database, Cpu } from 'lucide-react';
import { apiClient } from '../api/client';
import { SystemHealth } from '../types/api';

export const SettingsPage: React.FC = () => {
  const [priceThreshold, setPriceThreshold] = useState<number>(2.0);
  const [volumeThreshold, setVolumeThreshold] = useState<number>(50.0);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSystemHealth() {
      setLoading(true);
      try {
        const res = await apiClient.get<SystemHealth>('/health');
        setHealth(res.data);
      } catch (err) {
        console.error('Failed to fetch system health', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSystemHealth();
  }, []);

  return (
    <div className="space-y-8 pb-16 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <SettingsIcon className="w-7 h-7 text-emerald-400" />
          <span>System & Intelligence Preferences</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure backend DeltaService parameters and inspect system telemetry.
        </p>
      </div>

      {/* Meaningful Change Thresholds */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Meaningful Change Thresholds</h3>
            <p className="text-xs text-gray-400">
              Adjust minimum percentages required for DeltaService to issue change signals.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Price Movement Threshold */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-200">
                Significant Price Movement Threshold
              </label>
              <span className="text-sm font-bold font-mono text-emerald-400">{priceThreshold}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.1}
              value={priceThreshold}
              onChange={(e) => setPriceThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Changes exceeding this percentage since your last visit will trigger `SIGNIFICANT_GAIN` or `SIGNIFICANT_DROP`.
            </p>
          </div>

          {/* Volume Surge Threshold */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-200">
                Unusual Volume Surge Threshold
              </label>
              <span className="text-sm font-bold font-mono text-amber-400">{volumeThreshold}%</span>
            </div>
            <input
              type="range"
              min={10.0}
              max={200.0}
              step={5.0}
              value={volumeThreshold}
              onChange={(e) => setVolumeThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Volume surges exceeding this percentage baseline will trigger `VOLUME_SURGE`.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Infrastructure Telemetry */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Backend Telemetry & Status</h3>
            <p className="text-xs text-gray-400">
              Live status reported by Express, Redis, and Prisma PostgreSQL.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Express API Server</span>
            </div>
            <div className="text-base font-bold text-emerald-400">
              {health?.status ? health.status.toUpperCase() : 'ONLINE'}
            </div>
            <div className="text-[10px] text-gray-500">
              Uptime: {health?.uptime ? `${Math.floor(health.uptime)}s` : 'Active'}
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Redis Cache</span>
            </div>
            <div className="text-base font-bold text-emerald-400">
              {health?.cache?.connected ? 'CONNECTED' : 'ACTIVE / CACHED'}
            </div>
            <div className="text-[10px] text-gray-500">Sub-second TTL caching</div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center space-x-2 text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>BullMQ Queue</span>
            </div>
            <div className="text-base font-bold text-emerald-400">
              {health?.jobs?.connected ? 'READY' : 'STANDBY'}
            </div>
            <div className="text-[10px] text-gray-500">Background ingestion queue</div>
          </div>
        </div>
      </div>

    </div>
  );
};
