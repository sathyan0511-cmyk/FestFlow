import React, { useState } from 'react';
import { useSyncStatus } from '../context/SyncStatusContext';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function SyncStatusBadge() {
  const {
    overallStatus,
    localDbReady,
    cloudAtlasReady,
    queueStats,
    browserOnline,
    refresh,
    loading
  } = useSyncStatus();

  const [isOpen, setIsOpen] = useState(false);

  // Configuration for each required status
  const getBadgeConfig = () => {
    switch (overallStatus) {
      case 'CONFLICT':
        return {
          label: 'CONFLICT',
          bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
          dot: 'bg-red-500',
          icon: AlertTriangle,
          pulse: true
        };
      case 'SYNC ERROR':
        return {
          label: 'SYNC ERROR',
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          pulse: false
        };
      case 'SYNCING':
        return {
          label: 'SYNCING',
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          icon: RefreshCw,
          spin: true
        };
      case 'PENDING CHANGES':
        return {
          label: `PENDING (${queueStats.pending})`,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: Clock,
          pulse: true
        };
      case 'SYNCED':
        return {
          label: 'SYNCED',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: CheckCircle2,
          pulse: false
        };
      case 'ONLINE':
        return {
          label: 'ONLINE',
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: Cloud,
          pulse: false
        };
      case 'OFFLINE':
      default:
        return {
          label: 'OFFLINE',
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          icon: CloudOff,
          pulse: false
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-150 hover:shadow-sm ${config.bg}`}
        title="View Synchronization and Database Status"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
            config.pulse ? 'animate-pulse' : ''
          }`}
        />
        <IconComponent className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
        <span>{config.label}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                Offline-First Sync Status
              </span>
              <button
                onClick={refresh}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2.5 mt-3">
              {/* Local Database */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Database className="w-3.5 h-3.5" />
                  <span>Local MongoDB</span>
                </span>
                <span
                  className={`font-semibold ${
                    localDbReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {localDbReady ? 'Connected (Primary)' : 'Unavailable'}
                </span>
              </div>

              {/* Cloud Database */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>MongoDB Atlas</span>
                </span>
                <span
                  className={`font-semibold ${
                    cloudAtlasReady
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cloudAtlasReady ? 'Connected (Destination)' : 'Offline / Standby'}
                </span>
              </div>

              {/* Browser Internet Connection */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  {browserOnline ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Device Network</span>
                </span>
                <span className="text-slate-500">
                  {browserOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Pending Queue Depth */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Pending Changes</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {queueStats.pending}
                </span>
              </div>

              {/* Conflicts */}
              {queueStats.unresolvedConflicts > 0 && (
                <div className="flex items-center justify-between text-red-500 font-bold">
                  <span>Unresolved Conflicts</span>
                  <span>{queueStats.unresolvedConflicts}</span>
                </div>
              )}

              {/* Sync Errors */}
              {queueStats.failed > 0 && (
                <div className="flex items-center justify-between text-amber-500 font-bold">
                  <span>Failed Retries</span>
                  <span>{queueStats.failed}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center">
              Local writes persist durably even with zero internet.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
