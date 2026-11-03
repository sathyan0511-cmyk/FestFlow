import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export default function DatabaseStatusBadge() {
  const [status, setStatus] = useState('CHECKING'); // 'CONNECTED' | 'DISCONNECTED' | 'CHECKING'
  const [details, setDetails] = useState({
    host: '127.0.0.1',
    dbName: 'festflow',
    lastChecked: null,
    error: null
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverRef = useRef(null);
  const isCheckingRef = useRef(false);

  const checkHealth = useCallback(async (manual = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    if (manual) {
      setIsRefreshing(true);
    }

    try {
      const res = await api.get('/health', { timeout: 4000 });
      const localDb = res.data?.database?.local;

      if (localDb?.connected) {
        setStatus('CONNECTED');
        setDetails({
          host: localDb.host || '127.0.0.1:27017',
          dbName: localDb.name || 'festflow',
          lastChecked: new Date(),
          error: null
        });
      } else {
        setStatus('DISCONNECTED');
        setDetails(prev => ({
          ...prev,
          lastChecked: new Date(),
          error: 'Local MongoDB is not connected (readyState !== 1).'
        }));
      }
    } catch (err) {
      setStatus('DISCONNECTED');
      setDetails(prev => ({
        ...prev,
        lastChecked: new Date(),
        error: err.response?.data?.message || 'Backend server or local database is unreachable.'
      }));
    } finally {
      isCheckingRef.current = false;
      if (manual) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Periodic polling every 10 seconds and on window focus
  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => checkHealth(), 10000);

    const onFocus = () => checkHealth();
    const onOnline = () => checkHealth();
    const onOffline = () => setStatus('DISCONNECTED');

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [checkHealth]);

  // Click outside listener for popover dismissal
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Badge appearance configuration
  const getBadgeConfig = () => {
    switch (status) {
      case 'CONNECTED':
        return {
          label: 'CONNECTED',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          dotClass: 'bg-emerald-500',
          icon: CheckCircle2,
          tooltip: 'Local MongoDB is connected and ready (127.0.0.1:27017)'
        };
      case 'DISCONNECTED':
        return {
          label: 'DISCONNECTED',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
          dotClass: 'bg-rose-500 animate-pulse',
          icon: AlertCircle,
          tooltip: 'Local MongoDB connection is unavailable'
        };
      case 'CHECKING':
      default:
        return {
          label: 'CHECKING',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          dotClass: 'bg-amber-500',
          icon: RefreshCw,
          tooltip: 'Checking local MongoDB connection status...'
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.icon;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Compact Status Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title={config.tooltip}
        aria-label={`Database Status: ${config.label}`}
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ink-primary/20 ${config.badgeClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
        <Database className="w-3.5 h-3.5 opacity-80" />
        <span>{config.label}</span>
      </button>

      {/* Explanatory Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white dark:bg-stone-900 border border-edge shadow-xl p-4 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2.5 border-b border-edge">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-ink-primary dark:text-stone-200" />
              <h4 className="text-xs font-bold text-ink-primary dark:text-stone-200 uppercase tracking-wider">
                Database Status
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-ink-muted hover:text-ink-primary rounded transition-colors"
              aria-label="Close status popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Connection:</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${
                status === 'CONNECTED'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : status === 'DISCONNECTED'
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                <IconComponent className={`w-3.5 h-3.5 ${status === 'CHECKING' ? 'animate-spin' : ''}`} />
                {status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Target:</span>
              <span className="font-mono text-[11px] text-ink-primary dark:text-stone-200 font-medium">
                mongodb://127.0.0.1:27017
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Database:</span>
              <span className="font-mono text-[11px] text-ink-primary dark:text-stone-200 font-medium">
                {details.dbName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Architecture:</span>
              <span className="text-ink-secondary dark:text-stone-300 font-medium">
                Standalone Local MongoDB
              </span>
            </div>

            {details.lastChecked && (
              <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1">
                <span>Last Checked:</span>
                <span>{details.lastChecked.toLocaleTimeString()}</span>
              </div>
            )}

            {details.error && (
              <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300">
                {details.error}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-edge flex items-center justify-between">
            <span className="text-[10px] text-ink-muted">Auto-refreshes every 10s</span>
            <button
              type="button"
              onClick={() => checkHealth(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-canvas-muted hover:bg-canvas-warm border border-edge text-ink-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Check Now'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
