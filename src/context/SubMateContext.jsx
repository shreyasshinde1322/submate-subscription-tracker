import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';

const SubMateContext = createContext(null);

export function SubMateProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const toastTimer = useRef(null);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: Date.now() });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [catalogRes, subsRes, dashRes, settingsRes] = await Promise.all([
        api.catalog(),
        api.subscriptions.list(),
        api.dashboard(),
        api.settings.get(),
      ]);
      setCatalog(catalogRes);
      setSubscriptions(subsRes.subscriptions);
      setDashboard(dashRes);
      setSettings(settingsRes.settings);
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('retry');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const [, subsRes, dashRes] = await Promise.all([
      api.catalog(),
      api.subscriptions.list(),
      api.dashboard(),
    ]);
    setSubscriptions(subsRes.subscriptions);
    setDashboard(dashRes);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const catalogByKey = useMemo(() => {
    const map = {};
    if (catalog && Array.isArray(catalog.services)) {
      for (const service of catalog.services) map[service.key] = service;
    }
    return map;
  }, [catalog]);

  const categories = useMemo(() => {
    if (catalog && Array.isArray(catalog.categories)) return catalog.categories;
    return [
      'Video & Streaming',
      'Music & Audio',
      'Productivity & Collaboration',
      'Developer & Creative',
      'Gaming',
      'Shopping & Memberships',
      'Cloud, Storage & Security',
      'Fitness, Health & Learning',
      'News & Reading',
      'Other',
    ];
  }, [catalog]);

  const createSubscription = useCallback(
    async (payload, force = false) => {
      const result = await api.subscriptions.create(payload, force);
      await refresh();
      notify('Subscription added.');
      return result;
    },
    [refresh, notify],
  );

  const updateSubscription = useCallback(
    async (id, payload, force = false) => {
      const result = await api.subscriptions.update(id, payload, force);
      await refresh();
      notify('Subscription updated.');
      return result;
    },
    [refresh, notify],
  );

  const setSubscriptionStatus = useCallback(
    async (id, status) => {
      await api.subscriptions.setStatus(id, status);
      await refresh();
      notify(`Subscription marked ${status}.`);
      return status;
    },
    [refresh, notify],
  );

  const removeSubscription = useCallback(
    async (id) => {
      await api.subscriptions.remove(id);
      await refresh();
      notify('Subscription deleted.');
    },
    [refresh, notify],
  );

  const saveSettings = useCallback(
    async (payload) => {
      const result = await api.settings.update(payload);
      setSettings(result.settings);
      const { dashboard: freshDash } = await Promise.all([Promise.resolve(), api.dashboard()]);
      setDashboard(freshDash);
      notify('Settings saved.');
      return result;
    },
    [notify],
  );

  const value = useMemo(
    () => ({
      status,
      error,
      refreshing,
      catalog,
      catalogByKey,
      categories,
      subscriptions,
      dashboard,
      settings,
      toast,
      retry: loadAll,
      refresh,
      notify,
      createSubscription,
      updateSubscription,
      setSubscriptionStatus,
      removeSubscription,
      saveSettings,
      downloadCsv: api.exportUrl,
    }),
    [
      status, error, refreshing, catalog, catalogByKey, categories, subscriptions,
      dashboard, settings, toast, loadAll, refresh, notify, createSubscription,
      updateSubscription, setSubscriptionStatus, removeSubscription, saveSettings,
    ],
  );

  return <SubMateContext.Provider value={value}>{children}</SubMateContext.Provider>;
}

export function useSubMate() {
  const context = useContext(SubMateContext);
  if (!context) {
    throw new Error('useSubMate must be used within a SubMateProvider.');
  }
  return context;
}