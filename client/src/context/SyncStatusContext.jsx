import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const SyncStatusContext = createContext(null);

export const SyncStatusProvider = ({ children }) => {
  const [statusData, setStatusData] = useState({
    overallStatus: 'OFFLINE',
    localDbReady: false,
    cloudAtlasReady: false,
    syncWorkerRunning: false,
    queueStats: {
      pending: 0,
      processing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
      unresolvedConflicts: 0
    },
    lastUpdated: null,
    browserOnline: navigator.onLine
  });

  const [loading, setLoading] = useState(false);

  const fetchSyncStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sync/status');
      if (res.data?.success) {
        setStatusData({
          overallStatus: res.data.overallStatus || 'OFFLINE',
          localDbReady: res.data.localDbReady,
          cloudAtlasReady: res.data.cloudAtlasReady,
          syncWorkerRunning: res.data.syncWorkerRunning,
          queueStats: res.data.queueStats || {
            pending: 0,
            processing: 0,
            synced: 0,
            failed: 0,
            conflict: 0,
            unresolvedConflicts: 0
          },
          lastUpdated: new Date(),
          browserOnline: navigator.onLine
        });
      }
    } catch (err) {
      // Backend completely unreachable
      setStatusData((prev) => ({
        ...prev,
        overallStatus: 'OFFLINE',
        localDbReady: false,
        cloudAtlasReady: false,
        lastUpdated: new Date(),
        browserOnline: navigator.onLine
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll periodic status every 5 seconds
  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 5000);

    const handleOnline = () => {
      setStatusData((prev) => ({ ...prev, browserOnline: true }));
      fetchSyncStatus();
    };

    const handleOffline = () => {
      setStatusData((prev) => ({ ...prev, browserOnline: false }));
      fetchSyncStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchSyncStatus]);

  return (
    <SyncStatusContext.Provider
      value={{
        ...statusData,
        refresh: fetchSyncStatus,
        loading
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  );
};

export const useSyncStatus = () => {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
};
