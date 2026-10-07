import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getApiEndpoints, sendTelemetry } from '../config/api';

// Per-user AsyncStorage keys. Shared with SyncContext (logout wipe) — keep stable.
export const getUserStorageKeys = (explicitUid) => {
  const pfx = explicitUid ? `marketos_${explicitUid}` : 'marketos';
  return {
    p: `${pfx}_products_v2`,
    s: `${pfx}_sales_v2`,
    e: `${pfx}_expenses_v2`,
    deleted: `${pfx}_deleted_v2`,
    hash: `${pfx}_synced_hash`,
    lastSync: `${pfx}_last_sync`,
    tombstones: `${pfx}_known_tombstones`,
  };
};

const EMPTY_DELETED = '{"products":[],"sales":[],"expenses":[]}';

export function useSync(user) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [online, setOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [otherDevicePending, setOtherDevicePending] = useState([]);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [deviceId, setDeviceId] = useState('');

  const syncedHashRef = useRef('');
  const dirtyRef = useRef(false);
  const onlineRef = useRef(true);
  const userRef = useRef(null);
  const deviceIdRef = useRef('');
  const dataRef = useRef({ products: [], sales: [], expenses: [] });

  const setDirtyBoth = (v) => {
    dirtyRef.current = v;
    setDirty(v);
  };

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const dataKeys = () => getUserStorageKeys(userRef.current ? userRef.current.uid : undefined);
  const deletedCacheKey = () => dataKeys().deleted;
  const syncedHashKey = () => dataKeys().hash;
  const lastSyncKey = () => dataKeys().lastSync;

  // ---- Device id + network listener ----
  useEffect(() => {
    const initDevice = async () => {
      let d = await AsyncStorage.getItem('marketos_device_id');
      if (!d) {
        d = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await AsyncStorage.setItem('marketos_device_id', d);
      }
      deviceIdRef.current = d;
      setDeviceId(d);
    };
    initDevice();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      const wasOnline = onlineRef.current;
      if (wasOnline && !connected) {
        setOnline(false);
        setDirtyBoth(true);
        setSyncError(true);
      } else if (!wasOnline && connected) {
        setOnline(true);
        if (userRef.current && deviceIdRef.current) {
          syncCycleRef.current().catch(() => {});
        }
      }
    });
    return unsubscribe;
  }, []);

  const getKnownTombstones = async () => {
    try {
      const raw = await AsyncStorage.getItem(dataKeys().tombstones);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { products: {}, sales: {}, expenses: {} };
  };

  const saveKnownTombstones = async (tombstones) => {
    try {
      await AsyncStorage.setItem(dataKeys().tombstones, JSON.stringify(tombstones));
    } catch {}
  };

  const recentFirst = (arr) =>
    [...arr].sort((a, b) => {
      const at = Number(a?.updatedAt) || (a?.timestamp ? new Date(a.timestamp).getTime() : 0) || 0;
      const bt = Number(b?.updatedAt) || (b?.timestamp ? new Date(b.timestamp).getTime() : 0) || 0;
      return bt - at;
    });

  // Newest-wins merge; tombstoned items are strictly dropped so deletes made on
  // any device can never be resurrected (identical to the web implementation).
  const mergeRecords = (localArr, remoteArr, tombstonesMap = {}, pendingDeletedIds = new Set()) => {
    const isItemTombstoned = (r) => {
      if (!r || r.id == null) return true;
      const rid = String(r.id);
      if (pendingDeletedIds.has(rid)) return true;
      const tomb = tombstonesMap[rid];
      if (tomb && tomb.deletedAt) {
        const itemTime = Number(r.updatedAt) || (r.timestamp ? new Date(r.timestamp).getTime() : 0) || 0;
        if (itemTime <= tomb.deletedAt) return true;
      }
      return false;
    };

    const byId = new Map();
    for (const r of localArr || []) {
      if (r && r.id != null && !isItemTombstoned(r)) byId.set(String(r.id), r);
    }
    const out = [];
    for (const r of remoteArr || []) {
      if (!r || r.id == null) continue;
      const rid = String(r.id);
      if (isItemTombstoned(r)) continue;

      const local = byId.get(rid);
      if (local) byId.delete(rid);
      const rT = Number(r.updatedAt) || (r.timestamp ? new Date(r.timestamp).getTime() : 0) || 0;
      const lT = local ? (Number(local.updatedAt) || (local.timestamp ? new Date(local.timestamp).getTime() : 0) || 0) : 0;
      if (!local) {
        if (!r.deleted) out.push(r);
      } else if (r.deleted) {
        if (lT > rT) out.push(local);
      } else if (lT >= rT) {
        out.push(local);
      } else {
        out.push(r);
      }
    }
    for (const r of byId.values()) {
      if (!isItemTombstoned(r)) out.push(r);
    }
    return out;
  };

  // Cross-device "pending" flags so other devices know this one has unsynced data.
  const notifyPending = () => {
    const u = userRef.current;
    if (!u || !onlineRef.current || !deviceIdRef.current) return;
    getApiEndpoints()
      .then((endpoints) =>
        fetch(endpoints.flagPending, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.uid, deviceId: deviceIdRef.current }),
        }).catch(() => {})
      )
      .catch(() => {});
  };

  const clearOwnPending = () => {
    const u = userRef.current;
    if (!u || !deviceIdRef.current) return;
    getApiEndpoints()
      .then((endpoints) =>
        fetch(endpoints.flagClear, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.uid, deviceId: deviceIdRef.current }),
        }).catch(() => {})
      )
      .catch(() => {});
  };

  // Remember a local delete so it propagates to every device via tombstones.
  const markDeleted = async (kind, id) => {
    const sId = String(id);
    const now = Date.now();
    try {
      const dk = deletedCacheKey();
      const str = await AsyncStorage.getItem(dk);
      const cache = str ? JSON.parse(str) : { products: [], sales: [], expenses: [] };
      if (!cache[kind]) cache[kind] = [];
      if (sId && !cache[kind].includes(sId)) cache[kind].push(sId);
      await AsyncStorage.setItem(dk, JSON.stringify(cache));

      const currentTombstones = await getKnownTombstones();
      if (!currentTombstones[kind]) currentTombstones[kind] = {};
      currentTombstones[kind][sId] = { deletedAt: now, device: deviceIdRef.current };
      await saveKnownTombstones(currentTombstones);
    } catch {}

    if (onlineRef.current && userRef.current) {
      pushPayload(dataRef.current).catch(() => {});
    }
  };

  const pushPayload = async (data) => {
    const u = userRef.current;
    if (!u || !deviceIdRef.current) return;
    const endpoints = await getApiEndpoints();

    let deleted = { products: [], sales: [], expenses: [] };
    try {
      const delStr = await AsyncStorage.getItem(deletedCacheKey());
      if (delStr) deleted = JSON.parse(delStr);
    } catch {}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoints.sync, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        userId: u.uid,
        userEmail: u.email || '',
        userName: u.displayName || 'Merchant',
        deviceId: deviceIdRef.current,
        ...data,
        deleted,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      sendTelemetry({
        userId: u.email || u.uid,
        status: res.status,
        path: '/api/sync',
        detail: `Client sync push failed with HTTP ${res.status}`,
      });
      throw new Error(await res.text());
    }

    const hash = JSON.stringify(data);
    syncedHashRef.current = hash;
    setDirtyBoth(false);
    await AsyncStorage.setItem(syncedHashKey(), hash);
    await AsyncStorage.setItem(deletedCacheKey(), EMPTY_DELETED);
    clearOwnPending();
  };

  // One full round: push pending changes/deletions, pull, merge, push again if needed.
  const syncCycle = useCallback(async () => {
    const u = userRef.current;
    if (!u || !onlineRef.current || !deviceIdRef.current) {
      setDirtyBoth(true);
      setSyncError(true);
      return;
    }
    setIsSyncing(true);
    try {
      let deletedObj = { products: [], sales: [], expenses: [] };
      try {
        const delStr = await AsyncStorage.getItem(deletedCacheKey());
        if (delStr) deletedObj = JSON.parse(delStr);
      } catch {}

      const hasDeletions =
        (deletedObj.products?.length || 0) > 0 ||
        (deletedObj.sales?.length || 0) > 0 ||
        (deletedObj.expenses?.length || 0) > 0;

      if (hasDeletions || dirtyRef.current) {
        try {
          await pushPayload(dataRef.current);
        } catch (e) {
          console.warn('Pre-sync push failed, will merge with local tombstones:', e?.message || String(e));
        }
      }

      const endpoints = await getApiEndpoints();
      const uName = encodeURIComponent(u.displayName || 'Merchant');
      const uEmail = encodeURIComponent(u.email || '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(
        `${endpoints.data}?userId=${encodeURIComponent(u.uid)}&name=${uName}&email=${uEmail}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!res.ok) {
        sendTelemetry({
          userId: u.email || u.uid,
          status: res.status,
          path: '/api/data',
          detail: `Client pull failed with HTTP ${res.status}`,
        });
        throw new Error('pull failed');
      }
      const remote = await res.json();

      const localTombstones = await getKnownTombstones();
      if (remote.tombstones) {
        for (const type of ['products', 'sales', 'expenses']) {
          const remoteMap = remote.tombstones[type] || {};
          if (!localTombstones[type]) localTombstones[type] = {};
          for (const [id, t] of Object.entries(remoteMap)) {
            const existing = localTombstones[type][id];
            const rT = Number(t.deletedAt) || 0;
            if (!existing || (existing.deletedAt || 0) < rT) {
              localTombstones[type][id] = t;
            }
          }
        }
        await saveKnownTombstones(localTombstones);
      }

      // Always re-read freshest local state so offline additions are never overwritten.
      const ks = dataKeys();
      const pStr = await AsyncStorage.getItem(ks.p);
      const sStr = await AsyncStorage.getItem(ks.s);
      const eStr = await AsyncStorage.getItem(ks.e);
      const currentLocalP = pStr ? JSON.parse(pStr) : [];
      const currentLocalS = sStr ? JSON.parse(sStr) : [];
      const currentLocalE = eStr ? JSON.parse(eStr) : [];

      const delP = new Set((deletedObj.products || []).map(String));
      const delS = new Set((deletedObj.sales || []).map(String));
      const delE = new Set((deletedObj.expenses || []).map(String));

      const mergedP = mergeRecords(currentLocalP, remote.products || [], localTombstones.products || {}, delP);
      const mergedS = recentFirst(mergeRecords(currentLocalS, remote.sales || [], localTombstones.sales || {}, delS));
      const mergedE = recentFirst(mergeRecords(currentLocalE, remote.expenses || [], localTombstones.expenses || {}, delE));

      await AsyncStorage.setItem(ks.p, JSON.stringify(mergedP));
      await AsyncStorage.setItem(ks.s, JSON.stringify(mergedS));
      await AsyncStorage.setItem(ks.e, JSON.stringify(mergedE));

      dataRef.current = { products: mergedP, sales: mergedS, expenses: mergedE };
      setProducts(mergedP);
      setSales(mergedS);
      setExpenses(mergedE);

      const dIds = (remote.meta?.pendingDeviceIds || []).filter((d) => d !== deviceIdRef.current);
      setOtherDevicePending(dIds);

      const ours = { products: mergedP, sales: mergedS, expenses: mergedE };
      const currentHash = JSON.stringify(ours);
      if (currentHash !== syncedHashRef.current) {
        await pushPayload(ours);
      } else {
        setDirtyBoth(false);
      }
      setSyncError(false);
      const nowTs = Date.now();
      setLastSyncAt(nowTs);
      AsyncStorage.setItem(lastSyncKey(), String(nowTs)).catch(() => {});
    } catch (e) {
      setSyncError(true);
      setDirtyBoth(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const syncCycleRef = useRef(syncCycle);
  useEffect(() => {
    syncCycleRef.current = syncCycle;
  }, [syncCycle]);

  // Auto sync every 10 seconds while signed in (matches web).
  useEffect(() => {
    if (!user || !deviceId) return;
    syncCycleRef.current().catch(() => {});
    const intervalId = setInterval(() => {
      syncCycleRef.current().catch(() => {});
    }, 10000);
    return () => clearInterval(intervalId);
  }, [user, deviceId]);

  // On login: migrate legacy global data (first time), load this user's records.
  // On logout: wipe in-memory state so the next account never sees it.
  useEffect(() => {
    const loadForUser = async () => {
      const ks = dataKeys();
      const hasOwn =
        (await AsyncStorage.getItem(ks.p)) ||
        (await AsyncStorage.getItem(ks.s)) ||
        (await AsyncStorage.getItem(ks.e));
      if (!hasOwn) {
        const legacyP = await AsyncStorage.getItem('marketos_products_v2');
        const legacyS = await AsyncStorage.getItem('marketos_sales_v2');
        const legacyE = await AsyncStorage.getItem('marketos_expenses_v2');
        if (legacyP) await AsyncStorage.setItem(ks.p, legacyP);
        if (legacyS) await AsyncStorage.setItem(ks.s, legacyS);
        if (legacyE) await AsyncStorage.setItem(ks.e, legacyE);
      }

      const pStr = await AsyncStorage.getItem(ks.p);
      const sStr = await AsyncStorage.getItem(ks.s);
      const eStr = await AsyncStorage.getItem(ks.e);
      const loadedP = pStr ? JSON.parse(pStr) : [];
      const loadedS = sStr ? JSON.parse(sStr) : [];
      const loadedE = eStr ? JSON.parse(eStr) : [];

      dataRef.current = { products: loadedP, sales: loadedS, expenses: loadedE };
      setProducts(loadedP);
      setSales(loadedS);
      setExpenses(loadedE);

      const savedHash = (await AsyncStorage.getItem(ks.hash)) || '';
      syncedHashRef.current = savedHash;
      const savedSync = Number((await AsyncStorage.getItem(ks.lastSync)) || 0);
      setLastSyncAt(savedSync || null);
      setDirtyBoth(JSON.stringify({ products: loadedP, sales: loadedS, expenses: loadedE }) !== savedHash);
    };

    if (user) {
      loadForUser();
    } else {
      setOtherDevicePending([]);
      setDirtyBoth(false);
      setSyncError(false);
      setLastSyncAt(null);
      setProducts([]);
      setSales([]);
      setExpenses([]);
      dataRef.current = { products: [], sales: [], expenses: [] };
      syncedHashRef.current = '';
    }
  }, [user]);

  // ---- Actions ----
  const markChanged = () => {
    setDirtyBoth(true);
    notifyPending();
  };

  const persistProducts = async (updated) => {
    setProducts(updated);
    dataRef.current = { ...dataRef.current, products: updated };
    await AsyncStorage.setItem(dataKeys().p, JSON.stringify(updated));
  };
  const persistSales = async (updated) => {
    setSales(updated);
    dataRef.current = { ...dataRef.current, sales: updated };
    await AsyncStorage.setItem(dataKeys().s, JSON.stringify(updated));
  };
  const persistExpenses = async (updated) => {
    setExpenses(updated);
    dataRef.current = { ...dataRef.current, expenses: updated };
    await AsyncStorage.setItem(dataKeys().e, JSON.stringify(updated));
  };

  const saveProduct = async (savedProduct) => {
    if (!savedProduct) return;
    const now = Date.now();
    const withTimestamp = { ...savedProduct, updatedAt: now, updatedByDevice: deviceIdRef.current };
    const exists = dataRef.current.products.some((p) => p.id === savedProduct.id);
    const updated = exists
      ? dataRef.current.products.map((p) => (p.id === savedProduct.id ? withTimestamp : p))
      : [withTimestamp, ...dataRef.current.products];
    await persistProducts(updated);
    markChanged();
  };

  const deleteProduct = async (id) => {
    const updated = dataRef.current.products.filter((p) => p.id !== id);
    await persistProducts(updated);
    await markDeleted('products', id);
    markChanged();
  };

  const addSale = async (sale) => {
    if (!sale) return;
    const now = Date.now();
    const withTimestamp = {
      ...sale,
      id: sale.id || `${now}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: sale.timestamp || new Date().toISOString(),
      updatedAt: now,
      updatedByDevice: deviceIdRef.current,
    };
    await persistSales([withTimestamp, ...dataRef.current.sales]);
    markChanged();
  };

  const updateSale = async (sale) => {
    if (!sale || sale.id == null) return;
    const now = Date.now();
    const withTimestamp = {
      ...sale,
      timestamp: sale.timestamp || new Date().toISOString(),
      updatedAt: now,
      updatedByDevice: deviceIdRef.current,
    };
    const updated = dataRef.current.sales.map((s) => (s.id === sale.id ? withTimestamp : s));
    await persistSales(updated);
    markChanged();
  };

  const deleteSale = async (id) => {
    const updated = dataRef.current.sales.filter((s) => s.id !== id);
    await persistSales(updated);
    await markDeleted('sales', id);
    markChanged();
  };

  const saveExpense = async (savedExpense) => {
    if (!savedExpense) return;
    const now = Date.now();
    const withTimestamp = {
      ...savedExpense,
      date: savedExpense.date || new Date().toISOString(),
      updatedAt: now,
      updatedByDevice: deviceIdRef.current,
    };
    const exists = dataRef.current.expenses.some((e) => e.id === savedExpense.id);
    const updated = exists
      ? dataRef.current.expenses.map((e) => (e.id === savedExpense.id ? withTimestamp : e))
      : [withTimestamp, ...dataRef.current.expenses];
    await persistExpenses(updated);
    markChanged();
  };

  const deleteExpense = async (id) => {
    const updated = dataRef.current.expenses.filter((e) => e.id !== id);
    await persistExpenses(updated);
    await markDeleted('expenses', id);
    markChanged();
  };

  // Danger zone: tombstone every record on this device, then empty local state.
  const clearAllData = async () => {
    const now = Date.now();
    const kinds = [
      ['products', dataRef.current.products],
      ['sales', dataRef.current.sales],
      ['expenses', dataRef.current.expenses],
    ];
    try {
      const dk = deletedCacheKey();
      const str = await AsyncStorage.getItem(dk);
      const cache = str ? JSON.parse(str) : { products: [], sales: [], expenses: [] };
      const tombstones = await getKnownTombstones();
      for (const [kind, list] of kinds) {
        if (!cache[kind]) cache[kind] = [];
        if (!tombstones[kind]) tombstones[kind] = {};
        for (const item of list || []) {
          if (item && item.id != null) {
            const sId = String(item.id);
            if (!cache[kind].includes(sId)) cache[kind].push(sId);
            tombstones[kind][sId] = { deletedAt: now, device: deviceIdRef.current };
          }
        }
      }
      await AsyncStorage.setItem(dk, JSON.stringify(cache));
      await saveKnownTombstones(tombstones);
    } catch {}

    await persistProducts([]);
    await persistSales([]);
    await persistExpenses([]);
    markChanged();
    if (onlineRef.current && userRef.current) {
      pushPayload(dataRef.current).catch(() => {});
    }
  };

  const forceSync = async () => {
    await syncCycleRef.current();
  };

  return {
    products,
    sales,
    expenses,
    online,
    isSyncing,
    syncError,
    lastSyncAt,
    otherDevicePending,
    dirty,
    deviceId,
    saveProduct,
    deleteProduct,
    addSale,
    updateSale,
    deleteSale,
    saveExpense,
    deleteExpense,
    clearAllData,
    forceSync,
  };
}
