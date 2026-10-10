import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaRound, formatRelative, formatDate, formatDuration, formatQty } from '../utils/format';
import { getApiEndpoints, ADMIN_EMAIL } from '../config/api';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'logs', label: 'Logs' },
  { key: 'complaints', label: 'Complaints' },
  { key: 'payments', label: 'Payments' },
];

const LOG_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'errors', label: 'Errors' },
  { key: '200', label: '200' },
  { key: '401', label: '401' },
  { key: '500', label: '500' },
];

const STATUS_LABELS = {
  '200': '200 OK',
  '201': '201 Created',
  '400': '400 Bad Request',
  '401': '401 Unauthorized',
  '403': '403 Forbidden',
  '404': '404 Not Found',
  '500': '500 Server Error',
  other: 'Other',
};

const statusDotColor = (theme, code) => {
  const c = String(code);
  if (c === '200') return theme.emerald;
  if (c === '400') return theme.amber;
  if (c === '401') return theme.sky;
  if (c === '500') return theme.red;
  return theme.mutedForeground;
};

const logStatusColor = (theme, status) => {
  const s = Number(status) || 0;
  if (s >= 500) return theme.red;
  if (s === 401) return theme.sky;
  if (s >= 400) return theme.amber;
  return theme.emerald;
};

const isErrorLog = (log) => {
  const s = Number(log?.status) || 0;
  return s >= 500 || log?.isClientIssue === true || s === 401;
};

const initialsFor = (name, email) => {
  const src = String(name || '').trim();
  if (src) {
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return String(email || '?').slice(0, 2).toUpperCase();
};

const midTrunc = (value, max = 18) => {
  const str = String(value || '');
  if (str.length <= max) return str;
  const half = Math.floor((max - 1) / 2);
  return `${str.slice(0, half)}…${str.slice(-half)}`;
};

async function safeFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(url, options) {
  try {
    const res = await safeFetch(url, options);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

const KpiCard = ({ theme, icon, label, value, color, sub, onPress }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
    onPress={onPress}
    style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text numberOfLines={2} style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 0.5, flex: 1, marginRight: 6, lineHeight: 13 }}>
        {label}
      </Text>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text numberOfLines={2} style={{ fontSize: 19, fontWeight: '900', color: theme.foreground, lineHeight: 22 }}>
      {value}
    </Text>
    <Text numberOfLines={2} style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 6, lineHeight: 13 }}>
      {sub}
    </Text>
  </TouchableOpacity>
);

export default function AdminScreen({ navigation }) {
  const { user, isFounder, isDarkMode, online } = useSyncContext();
  const theme = getTheme(isDarkMode);

  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logFilter, setLogFilter] = useState('all');
  const [searchLog, setSearchLog] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [showPaidOnly, setShowPaidOnly] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const aliveRef = useRef(true);

  // Paywall / Paystack configuration
  const [paywall, setPaywall] = useState(null);
  const [paywallForm, setPaywallForm] = useState({ enabled: true, amount: '', durationDays: '30' });
  const [paywallSaving, setPaywallSaving] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');

  const founderOk =
    isFounder && !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const loadAll = useCallback(async () => {
    try {
      const endpoints = await getApiEndpoints();
      if (!aliveRef.current) return;
      setRefreshing(true);
      const [statsJson, logsJson, compJson] = await Promise.all([
        safeJson(endpoints.adminStats),
        safeJson(endpoints.adminLogs),
        safeJson(endpoints.adminComplaints),
      ]);
      if (!aliveRef.current) return;
      let ok = 0;
      if (statsJson && typeof statsJson === 'object') {
        setStats(statsJson);
        ok += 1;
      }
      if (logsJson && typeof logsJson === 'object') {
        setLogs(Array.isArray(logsJson.logs) ? logsJson.logs : []);
        ok += 1;
      }
      if (compJson && typeof compJson === 'object') {
        setComplaints(Array.isArray(compJson.complaints) ? compJson.complaints : []);
        ok += 1;
      }
      if (ok > 0) setLastUpdated(Date.now());
      setFetchFailed(ok < 3);
    } catch (e) {
      if (aliveRef.current) setFetchFailed(true);
    } finally {
      if (aliveRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!founderOk) return undefined;
    aliveRef.current = true;
    loadAll();
    const interval = setInterval(() => {
      loadAll();
    }, 4000);
    return () => {
      aliveRef.current = false;
      clearInterval(interval);
    };
  }, [founderOk, loadAll]);

  const fetchPaywall = useCallback(async () => {
    try {
      const endpoints = await getApiEndpoints();
      const data = await safeJson(endpoints.adminPaywall);
      if (!data || !aliveRef.current) return;
      setPaywall(data);
      setPaywallForm({
        enabled: !!data.settings?.enabled,
        amount: String(data.settings?.amount ?? ''),
        durationDays: String(data.settings?.durationDays ?? 30),
      });
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!founderOk) return undefined;
    fetchPaywall();
    return undefined;
  }, [founderOk, fetchPaywall]);

  const savePaywall = useCallback(async () => {
    const amountNum = Number(paywallForm.amount);
    const daysNum = Number(paywallForm.durationDays);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      Alert.alert('Invalid Price', 'Enter a valid price in Naira.');
      return;
    }
    if (!Number.isFinite(daysNum) || daysNum < 1) {
      Alert.alert('Invalid Duration', 'Enter a valid duration in days.');
      return;
    }
    setPaywallSaving(true);
    setPaywallMessage('');
    try {
      const endpoints = await getApiEndpoints();
      const res = await safeFetch(endpoints.adminPaywall, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: paywallForm.enabled,
          amount: amountNum,
          durationDays: Math.round(daysNum),
        }),
      });
      if (!res || !res.ok) throw new Error('request failed');
      setPaywallMessage('Paywall settings saved.');
      await fetchPaywall();
      setTimeout(() => {
        if (aliveRef.current) setPaywallMessage('');
      }, 3500);
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save paywall settings. Please try again.');
    } finally {
      if (aliveRef.current) setPaywallSaving(false);
    }
  }, [paywallForm, fetchPaywall]);

  const statusCounts = stats?.statusCounts && typeof stats.statusCounts === 'object' ? stats.statusCounts : {};
  const statusEntries = Object.keys(statusCounts).map((k) => [k, Number(statusCounts[k]) || 0]);
  const totalRequests = statusEntries.reduce((sum, pair) => sum + pair[1], 0);
  const statusMax = Math.max(1, ...statusEntries.map((p) => p[1]));

  const complaintsPending = complaints.filter((c) => c && c.status === 'pending').length;
  const pendingCount =
    typeof stats?.pendingComplaints === 'number' ? stats.pendingComplaints : complaintsPending;

  const sortedLogs = useMemo(() => {
    const arr = Array.isArray(logs) ? logs.filter(Boolean) : [];
    return [...arr].sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
  }, [logs]);

  const errorCount = sortedLogs.filter(isErrorLog).length;
  const recentErrors = sortedLogs.filter((l) => (Number(l?.status) || 0) >= 400).slice(0, 5);

  const filteredLogs = useMemo(() => {
    const q = searchLog.trim().toLowerCase();
    return sortedLogs.filter((log) => {
      if (!log) return false;
      const status = Number(log.status) || 0;
      if (q) {
        const hay =
          `${String(log.path || '')} ${String(log.method || '')} ${String(log.userId || '')} ${String(log.detail || '')} ${String(log.ip || '')} ${status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (logFilter === 'errors') return isErrorLog(log);
      if (logFilter === '200') return status === 200 || status === 201;
      if (logFilter === '401') return status === 401;
      if (logFilter === '500') return status === 500;
      return true;
    });
  }, [sortedLogs, searchLog, logFilter]);

  const filteredUsers = useMemo(() => {
    const list = stats?.userList && Array.isArray(stats.userList) ? stats.userList : [];
    const q = searchUser.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => {
      if (!u) return false;
      const name = String(u.name || '').toLowerCase();
      const email = String(u.email || '').toLowerCase();
      const uid = String(u.userId || u.id || u.uid || '').toLowerCase();
      const phone = String(u.phone || '');
      return name.includes(q) || email.includes(q) || uid.includes(q) || phone.includes(q);
    });
  }, [stats, searchUser]);

  // Users with an active paid Insight subscription (from the paywall data), so
  // the admin can spot who has paid at a glance.
  const paidAccessByUser = new Map(
    (Array.isArray(paywall?.access) ? paywall.access : []).map((a) => [a && a.userId, a])
  );
  const hasPaid = (u) =>
    u && paidAccessByUser.has(String(u.userId || u.id || u.uid || ''));
  const paidUserCount = (Array.isArray(stats?.userList) ? stats.userList : []).filter(hasPaid).length;
  const visibleUsers = showPaidOnly ? filteredUsers.filter(hasPaid) : filteredUsers;

  const copyText = async (text, label) => {
    try {
      await Clipboard.setStringAsync(String(text || ''));
      Alert.alert('Copied', `${label} copied to clipboard.`);
    } catch (e) {
      Alert.alert('Copy Failed', 'Could not copy to the clipboard.');
    }
  };

  const callPhone = (phone) => {
    const p = String(phone || '').trim();
    if (!p) return;
    Linking.openURL('tel:' + p).catch(() => {
      Alert.alert('Cannot Open Dialer', 'This device could not start a phone call.');
    });
  };

  const handleResolveComplaint = async (id) => {
    if (!id) return;
    try {
      const endpoints = await getApiEndpoints();
      const res = await safeFetch(`${endpoints.adminComplaints}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (!res || !res.ok) throw new Error('request failed');
      loadAll();
    } catch (e) {
      Alert.alert('Request Failed', 'Could not mark the complaint as resolved. Please try again.');
    }
  };

  const doClearLogs = async () => {
    setClearing(true);
    try {
      const endpoints = await getApiEndpoints();
      const res = await safeFetch(endpoints.adminLogs, { method: 'DELETE' });
      if (!res || !res.ok) throw new Error('request failed');
      setLogs([]);
      setClearMessage('All server logs cleared successfully.');
      setTimeout(() => {
        if (aliveRef.current) setClearMessage('');
      }, 3500);
      loadAll();
    } catch (e) {
      Alert.alert('Request Failed', 'Could not clear the server logs. Please try again.');
    } finally {
      if (aliveRef.current) setClearing(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Log History',
      'Are you sure you want to clear all server interaction logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Logs', style: 'destructive', onPress: () => doClearLogs() },
      ],
      { cancelable: true }
    );
  };

  if (!founderOk) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.gateScroll}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.red + '40' }]}>
            <View style={[styles.gateIcon, { backgroundColor: theme.red + '14', borderColor: theme.red + '33' }]}>
              <Ionicons name="lock-closed" size={30} color={theme.red} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.foreground, textAlign: 'center', marginTop: 14 }}>
              Access Denied: Founder Clearance Required
            </Text>
            <Text style={{ fontSize: 12, color: theme.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 19 }}>
              This administrative control system is restricted strictly to the founder email{' '}
              <Text style={{ color: theme.amber, fontWeight: '800' }}>{ADMIN_EMAIL}</Text>. Your current
              authenticated account is{' '}
              <Text style={{ color: theme.foreground, fontWeight: '700' }}>
                {user?.email || 'Unauthenticated'}
              </Text>
              .
            </Text>
            <View style={[styles.gateNote, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.foreground, marginBottom: 4 }}>
                To change admin email in production:
              </Text>
              <Text style={{ fontSize: 11, color: theme.mutedForeground, lineHeight: 16 }}>
                Update ADMIN_EMAIL in mobile/src/config/api.js and the backend .env file, then restart
                the app.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
              style={[styles.gateBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Ionicons name="chevron-back" size={15} color={theme.foreground} />
              <Text style={{ fontSize: 12, fontWeight: '900', color: theme.foreground, marginLeft: 6 }}>
                Return to App Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '900', color: theme.foreground }}>
              Mission Control
            </Text>
            <View style={[styles.founderBadge, { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '4D' }]}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: theme.primary, letterSpacing: 1 }}>FOUNDER</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 3 }}>
            Founder: {ADMIN_EMAIL} • Live telemetry for merchants &amp; active server interactions
          </Text>
        </View>
        <View style={[styles.shieldBox, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '33' }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.primary} />
        </View>
      </View>

      {(!online || fetchFailed) && (
        <View style={[styles.banner, { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '4D' }]}>
          <Ionicons
            name={!online ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={18}
            color={theme.primary}
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary }}>
              {!online ? 'You are offline' : 'Could not reach the cloud'}
            </Text>
            <Text style={{ fontSize: 11, color: theme.primary, opacity: 0.9, marginTop: 2, lineHeight: 15 }}>
              {!online
                ? 'Mission Control needs a connection to stream live server telemetry.'
                : 'The admin API did not respond. Tap retry to poll the server again.'}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => loadAll()}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="refresh" size={13} color="#000" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#000', marginLeft: 4 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.metaRow}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 0.5 }}>
          Last updated {formatRelative(lastUpdated) || '—'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {refreshing && <ActivityIndicator size="small" color={theme.primary} />}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => loadAll()}
            style={[styles.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="refresh" size={15} color={theme.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarScroll}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((t) => {
            const selected = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.85}
                onPress={() => setActiveTab(t.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={{ fontSize: 12, fontWeight: '900', color: selected ? '#000' : theme.mutedForeground }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'dashboard' && (
          <View>
            {recentErrors.length > 0 && (
              <View style={[styles.incidentBanner, { backgroundColor: theme.red + '14', borderColor: theme.red + '40' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <Ionicons name="warning-outline" size={15} color={theme.red} />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: theme.foreground }}>
                    Active User End Incident ({recentErrors.length} recent error logs)
                  </Text>
                  <View style={[styles.clientBadge, { backgroundColor: theme.red + '26', borderColor: theme.red + '59' }]}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: theme.red }}>IMMEDIATE ALERT</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: theme.red, marginTop: 6, lineHeight: 16 }}>
                  Latest error: HTTP {Number(recentErrors[0]?.status) || 0} on path{' '}
                  <Text style={{ fontWeight: '800' }}>{String(recentErrors[0]?.path || '')}</Text> from user{' '}
                  <Text style={{ fontWeight: '800' }}>
                    {String(recentErrors[0]?.userId || recentErrors[0]?.ip || 'Anonymous')}
                  </Text>
                  .
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveTab('logs');
                    setLogFilter('errors');
                  }}
                  style={[styles.incidentBtn, { backgroundColor: theme.red + '26', borderColor: theme.red + '59' }]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: theme.foreground }}>Inspect Incident Logs</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.grid}>
              <KpiCard
                theme={theme}
                icon="people-outline"
                label="TOTAL USERS"
                value={stats ? String(stats.totalUsers || 0) : '...'}
                color={theme.primary}
                sub="Active merchant accounts"
                onPress={() => setActiveTab('users')}
              />
              <KpiCard
                theme={theme}
                icon="pulse-outline"
                label="REQUESTS"
                value={String(totalRequests)}
                color={theme.emerald}
                sub="Logged HTTP interactions"
              />
              <KpiCard
                theme={theme}
                icon="chatbubble-ellipses-outline"
                label="PENDING COMPLAINTS"
                value={String(pendingCount)}
                color={theme.rose}
                sub="Requiring founder callback"
                onPress={() => setActiveTab('complaints')}
              />
              <KpiCard
                theme={theme}
                icon="time-outline"
                label="SERVER UPTIME"
                value={
                  stats && stats.serverUptimeSec != null ? formatDuration(stats.serverUptimeSec) : 'Online'
                }
                color={theme.sky}
                sub="Since last restart"
              />
              <KpiCard
                theme={theme}
                icon="clock-outline"
                label="SERVER TIME"
                value={formatDate(stats?.serverTime) || '—'}
                color={theme.amber}
                sub="Live telemetry clock"
              />
              <KpiCard
                theme={theme}
                icon="trending-up-outline"
                label="INSIGHT REVENUE"
                value={formatNairaRound(paywall?.stats?.revenue || 0)}
                color={theme.emerald}
                sub={`${paywall?.stats?.successfulPayments || 0} successful payments`}
                onPress={() => setActiveTab('payments')}
              />
              <KpiCard
                theme={theme}
                icon="card-outline"
                label="ACTIVE SUBSCRIBERS"
                value={String(paywall?.stats?.activeSubscribers || 0)}
                color={theme.primary}
                sub={paywall ? (paywall.settings?.enabled ? 'Paywall enabled' : 'Paywall disabled') : 'Loading…'}
                onPress={() => setActiveTab('payments')}
              />
            </View>

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={[styles.iconChip, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '33' }]}>
                  <Ionicons name="activity-outline" size={14} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: theme.foreground }}>
                  Live Server Telemetry Status
                </Text>
              </View>

              {statusEntries.length === 0 && (
                <Text style={{ fontSize: 12, color: theme.mutedForeground }}>
                  Waiting for the first server requests to stream in...
                </Text>
              )}

              {statusEntries.map(([code, count]) => {
                const color = statusDotColor(theme, code);
                const share = Math.max(0, Math.min(100, Math.round((count / statusMax) * 100)));
                return (
                  <View key={String(code)} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: theme.foreground }}>
                          {STATUS_LABELS[String(code)] || String(code)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '900', color }}>{count}</Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: theme.surface }]}>
                      <View style={{ width: `${share}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
                    </View>
                  </View>
                );
              })}

              <View style={[styles.divider, { borderTopColor: theme.border }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 }}>
                  SERVER UPTIME
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '900', color: theme.foreground }}>
                  {stats && stats.serverUptimeSec != null ? formatDuration(stats.serverUptimeSec) : 'Online'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'users' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: theme.foreground }}>
                  Registered Merchant Directory
                </Text>
                <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 4, lineHeight: 16 }}>
                  Full names of signed up users, emails, active phones, inventory count, and revenue volumes.
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.countBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground }}>TOTAL </Text>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: theme.primary }}>{filteredUsers.length}</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: theme.emerald + '14', borderColor: theme.emerald + '40' }]}>
                  <Ionicons name="checkmark-circle" size={11} color={theme.emerald} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: theme.emerald, marginLeft: 3 }}>PAID </Text>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: theme.emerald }}>{paidUserCount}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1 }]}>
                <Ionicons name="search" size={15} color={theme.mutedForeground} />
                <TextInput
                  value={searchUser}
                  onChangeText={setSearchUser}
                  placeholder="Search by merchant name, email, phone, or UID..."
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.searchInput, { color: theme.foreground }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!searchUser && (
                  <TouchableOpacity onPress={() => setSearchUser('')}>
                    <Ionicons name="close-circle" size={16} color={theme.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowPaidOnly((v) => !v)}
                style={[
                  styles.tinyBadge,
                  {
                    paddingHorizontal: 10,
                    paddingVertical: 9,
                    borderWidth: 1,
                    backgroundColor: showPaidOnly ? theme.emerald + '18' : theme.surface,
                    borderColor: showPaidOnly ? theme.emerald + '55' : theme.border,
                  },
                ]}
              >
                <Ionicons name={showPaidOnly ? 'shield-checkmark' : 'shield-outline'} size={13} color={showPaidOnly ? theme.emerald : theme.mutedForeground} />
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '900',
                    letterSpacing: 0.4,
                    marginLeft: 4,
                    color: showPaidOnly ? theme.emerald : theme.mutedForeground,
                  }}
                >
                  {showPaidOnly ? 'PAID ONLY' : 'PAID ONLY'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              {visibleUsers.map((u, i) => {
                const uid = String(u?.userId || u?.id || u?.uid || '');
                const name = String(u?.name || 'Merchant');
                const email = String(u?.email || '');
                const phone = String(u?.phone || '');
                const products = Number(u?.productsCount) || 0;
                const sales = Number(u?.salesCount) || 0;
                const volume = Number(u?.totalVolume) || 0;
                return (
                  <View key={uid || `user-${i}`} style={[styles.userRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={[styles.avatar, { backgroundColor: theme.primary + '1A', borderColor: theme.primary + '40' }]}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: theme.primary }}>
                          {initialsFor(name, email)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: theme.foreground }}>{name}</Text>
                          <View style={[styles.tinyBadge, { backgroundColor: theme.emerald + '14', borderColor: theme.emerald + '33' }]}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: theme.emerald, letterSpacing: 0.5 }}>
                              ACTIVE ACCOUNT
                            </Text>
                          </View>
                          {hasPaid(u) && (
                            <View style={[styles.tinyBadge, { backgroundColor: theme.amber + '18', borderColor: theme.amber + '55' }]}>
                              <Ionicons name="checkmark-circle" size={10} color={theme.amber} />
                              <Text style={{ fontSize: 9, fontWeight: '900', color: theme.amber, letterSpacing: 0.5, marginLeft: 3 }}>
                                PAID
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <Ionicons name="mail-outline" size={12} color={theme.mutedForeground} />
                          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.foreground, flex: 1 }}>
                            {email || 'No email filed'}
                          </Text>
                        </View>

                        {phone ? (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => callPhone(phone)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}
                          >
                            <Ionicons name="call-outline" size={12} color={theme.emerald} />
                            <Text style={{ fontSize: 11, color: theme.emerald, fontWeight: '700' }}>{phone}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 6 }}>
                            No phone filed
                          </Text>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                          <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground }}>
                              {formatQty(products)} products · {formatQty(sales)} sales
                            </Text>
                          </View>
                          <View style={[styles.chip, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '33' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: theme.amber }}>
                              {formatNairaRound(volume)}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 9 }}>
                          Last active {formatRelative(u?.lastActive) || 'unknown'}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 3 }}>
                          UID: {uid || '—'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => copyText(uid, 'User ID')}
                        style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Ionicons name="copy-outline" size={16} color={theme.foreground} />
                      </TouchableOpacity>
                      {phone ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => callPhone(phone)}
                          style={[styles.callBtn, { backgroundColor: theme.primary }]}
                        >
                          <Ionicons name="call" size={14} color="#000" />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#000', marginLeft: 6 }}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {visibleUsers.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={30} color={theme.mutedForeground} />
                  <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
                    {showPaidOnly
                      ? 'No paid users yet.'
                      : searchUser
                      ? `No users found matching "${searchUser}".`
                      : 'No registered merchants yet. Sign-ups will appear here in real-time.'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'logs' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={[styles.iconChip, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '33' }]}>
                <Ionicons name="terminal-outline" size={14} color={theme.primary} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '900', color: theme.foreground }}>
                Server Real-Time Interaction Logs
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {LOG_FILTERS.map((f) => {
                const selected = logFilter === f.key;
                const count =
                  f.key === 'all' ? sortedLogs.length : f.key === 'errors' ? errorCount : null;
                const label = count === null ? f.label : `${f.label} (${count})`;
                const inactiveColor = f.key === 'errors' ? theme.red : theme.mutedForeground;
                return (
                  <TouchableOpacity
                    key={f.key}
                    activeOpacity={0.85}
                    onPress={() => setLogFilter(f.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? theme.primary : theme.surface,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: selected ? '#000' : inactiveColor,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={clearing || sortedLogs.length === 0}
                onPress={handleClearLogs}
                style={[
                  styles.filterChip,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.red + '14',
                    borderColor: theme.red + '40',
                    opacity: clearing || sortedLogs.length === 0 ? 0.45 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={13} color={theme.red} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: theme.red, marginLeft: 5 }}>
                  {clearing ? 'Clearing...' : 'Clear Logs'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {!!clearMessage && (
              <View style={[styles.successMsg, { backgroundColor: theme.emerald + '14', borderColor: theme.emerald + '40' }]}>
                <Ionicons name="checkmark-circle-outline" size={15} color={theme.emerald} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.emerald, flex: 1 }}>{clearMessage}</Text>
              </View>
            )}

            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search" size={15} color={theme.mutedForeground} />
              <TextInput
                value={searchLog}
                onChangeText={setSearchLog}
                placeholder="Filter logs by endpoint path, error detail, IP, or user..."
                placeholderTextColor={theme.mutedForeground}
                style={[styles.searchInput, { color: theme.foreground }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!!searchLog && (
                <TouchableOpacity onPress={() => setSearchLog('')}>
                  <Ionicons name="close-circle" size={16} color={theme.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            <View style={{ marginTop: 14 }}>
              {filteredLogs.map((log, i) => {
                const status = Number(log?.status) || 0;
                const pill = logStatusColor(theme, status);
                const uid = String(log?.userId || '');
                return (
                  <View key={String(log?.id || `log-${i}`)} style={[styles.logRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <View style={[styles.statusPill, { backgroundColor: pill + '1F', borderColor: pill + '4D' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: pill }}>{status || '—'}</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: theme.mutedForeground, width: 56 }}>
                        {String(log?.method || '')}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.foreground, flex: 1, flexShrink: 1 }}>
                        {String(log?.path || '')}
                      </Text>
                      {log?.isClientIssue ? (
                        <View style={[styles.clientBadge, { backgroundColor: theme.red + '26', borderColor: theme.red + '59' }]}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: theme.red }}>CLIENT</Text>
                        </View>
                      ) : null}
                    </View>

                    {!!log?.detail && (
                      <Text numberOfLines={2} style={{ fontSize: 11, color: theme.amber, marginTop: 6, lineHeight: 15 }}>
                        {String(log.detail)}
                      </Text>
                    )}

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: theme.mutedForeground }}>
                        {formatDate(log?.timestamp) || '—'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                        {uid ? (
                          <View style={[styles.uidChip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Text numberOfLines={1} style={{ fontSize: 9, color: theme.mutedForeground }}>
                              {midTrunc(uid)}
                            </Text>
                          </View>
                        ) : null}
                        {!!log?.ip && (
                          <Text style={{ fontSize: 9, color: theme.mutedForeground }}>{String(log.ip)}</Text>
                        )}
                        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground }}>
                          {Number(log?.durationMs) || 0}ms
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredLogs.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="terminal-outline" size={30} color={theme.mutedForeground} />
                  <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
                    No interaction logs matching filter criteria.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'complaints' && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: theme.foreground }}>
                  Merchant Support &amp; Complaint Tickets
                </Text>
                <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 4, lineHeight: 16 }}>
                  Each complaint ticket includes the merchant&apos;s active phone number for immediate
                  call/WhatsApp follow-up.
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <View style={[styles.countBadge, { backgroundColor: theme.amber + '14', borderColor: theme.amber + '40' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.amber }}>PENDING </Text>
                <Text style={{ fontSize: 10, fontWeight: '900', color: theme.amber }}>{pendingCount}</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground }}>TOTAL TICKETS </Text>
                <Text style={{ fontSize: 10, fontWeight: '900', color: theme.primary }}>{complaints.length}</Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              {complaints.map((comp, i) => {
                const id = String(comp?.id || `comp-${i}`);
                const statusVal = String(comp?.status || 'pending');
                const resolved = statusVal === 'resolved';
                const phone = String(comp?.phoneNumber || comp?.phone_number || '');
                const email = String(comp?.userEmail || comp?.user_email || '');
                const created = comp?.createdAt || comp?.created_at;
                const category = String(comp?.category || 'General');
                const pillColor = resolved ? theme.emerald : theme.amber;
                return (
                  <View
                    key={id}
                    style={[
                      styles.complaintCard,
                      { backgroundColor: theme.surface, borderColor: resolved ? theme.border : theme.primary + '40' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <View style={[styles.statusPill, { backgroundColor: pillColor + '1F', borderColor: pillColor + '4D' }]}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: pillColor, letterSpacing: 1 }}>
                          {statusVal.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: theme.amber }}>{category}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: theme.mutedForeground }}>
                        {formatDate(created) || '—'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 11 }}>
                      {phone ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => callPhone(phone)}
                          style={[styles.callBtn, { backgroundColor: theme.primary }]}
                        >
                          <Ionicons name="call" size={13} color="#000" />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#000', marginLeft: 6 }}>
                            Call merchant
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {phone ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => copyText(phone, 'Phone number')}
                          style={[styles.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        >
                          <Ionicons name="copy-outline" size={15} color={theme.foreground} />
                        </TouchableOpacity>
                      ) : null}
                      {!resolved ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleResolveComplaint(comp?.id)}
                          style={[
                            styles.resolveBtn,
                            { backgroundColor: theme.emerald + '1F', borderColor: theme.emerald + '4D' },
                          ]}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color={theme.emerald} />
                          <Text style={{ fontSize: 11, fontWeight: '900', color: theme.emerald, marginLeft: 5 }}>
                            Mark Resolved
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      {phone ? (
                        <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: '700' }}>{phone}</Text>
                      ) : null}
                    </View>

                    <View style={[styles.messageBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={{ fontSize: 12, color: theme.foreground, lineHeight: 18 }}>
                        {String(comp?.message || '')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                      <Text style={{ fontSize: 10, color: theme.mutedForeground }}>
                        Merchant Account:{' '}
                        <Text style={{ color: theme.foreground, fontWeight: '800' }}>{email || 'Unknown'}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.mutedForeground }}>Ticket ID: {id}</Text>
                    </View>
                  </View>
                );
              })}

              {complaints.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-ellipses-outline" size={30} color={theme.mutedForeground} />
                  <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 10, textAlign: 'center', lineHeight: 18 }}>
                    No user complaints registered yet. Incoming merchant tickets will appear here with
                    phone numbers for rapid resolution.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'payments' && (
          <View>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: '900', color: theme.foreground }}>
                  Insight Paywall Configuration
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.mutedForeground, lineHeight: 16, marginBottom: 12 }}>
                Set the price and duration merchants pay to unlock Insights. Switch test/live by changing
                only PAYSTACK_SECRET_KEY on the server.
              </Text>

              <View
                style={[
                  styles.countBadge,
                  {
                    alignSelf: 'flex-start',
                    marginBottom: 14,
                    backgroundColor: paywall?.configured ? theme.emerald + '1A' : theme.red + '1A',
                    borderColor: paywall?.configured ? theme.emerald + '40' : theme.red + '40',
                  },
                ]}
              >
                <Ionicons
                  name={paywall?.configured ? 'checkmark-circle' : 'alert-circle'}
                  size={13}
                  color={paywall?.configured ? theme.emerald : theme.red}
                />
                <Text style={{ fontSize: 10, fontWeight: '900', marginLeft: 5, color: paywall?.configured ? theme.emerald : theme.red }}>
                  {paywall?.configured ? 'PAYSTACK CONNECTED' : 'PAYSTACK NOT CONFIGURED'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPaywallForm((f) => ({ ...f, enabled: !f.enabled }))}
                style={[
                  styles.tabChip,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'stretch',
                    marginBottom: 14,
                    backgroundColor: paywallForm.enabled ? theme.emerald + '1A' : theme.surface,
                    borderColor: paywallForm.enabled ? theme.emerald + '40' : theme.border,
                  },
                ]}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: paywallForm.enabled ? theme.emerald : theme.mutedForeground,
                    marginRight: 8,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: '900', color: paywallForm.enabled ? theme.emerald : theme.mutedForeground }}>
                  {paywallForm.enabled ? 'ENABLED (USERS MUST PAY)' : 'DISABLED (FREE ACCESS)'}
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground, marginBottom: 6 }}>
                PRICE (₦ NAIRA)
              </Text>
              <TextInput
                value={paywallForm.amount}
                onChangeText={(v) => setPaywallForm((f) => ({ ...f, amount: v }))}
                keyboardType="numeric"
                placeholder="e.g. 5000"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.paywallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
              />

              <Text style={{ fontSize: 10, fontWeight: '800', color: theme.mutedForeground, marginTop: 12, marginBottom: 6 }}>
                DURATION (DAYS)
              </Text>
              <TextInput
                value={paywallForm.durationDays}
                onChangeText={(v) => setPaywallForm((f) => ({ ...f, durationDays: v }))}
                keyboardType="numeric"
                placeholder="e.g. 30"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.paywallInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={paywallSaving}
                onPress={savePaywall}
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: paywallSaving ? 0.6 : 1 }]}
              >
                {paywallSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="save-outline" size={15} color="#000" />
                )}
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', marginLeft: 7 }}>
                  {paywallSaving ? 'Saving…' : 'Save Settings'}
                </Text>
              </TouchableOpacity>

              {!!paywallMessage && (
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.emerald, marginTop: 10, textAlign: 'center' }}>
                  {paywallMessage}
                </Text>
              )}
            </View>

            <View style={styles.grid}>
              <KpiCard
                theme={theme}
                icon="cash-outline"
                label="TOTAL REVENUE"
                value={formatNairaRound(paywall?.stats?.revenue || 0)}
                color={theme.emerald}
                sub="All-time successful payments"
              />
              <KpiCard
                theme={theme}
                icon="checkmark-done-outline"
                label="SUCCESSFUL"
                value={String(paywall?.stats?.successfulPayments || 0)}
                color={theme.primary}
                sub="Completed transactions"
              />
              <KpiCard
                theme={theme}
                icon="people-outline"
                label="SUBSCRIBERS"
                value={String(paywall?.stats?.activeSubscribers || 0)}
                color={theme.primary}
                sub="Active Insight access"
              />
              <KpiCard
                theme={theme}
                icon="receipt-outline"
                label="ATTEMPTS"
                value={String(paywall?.stats?.totalPayments || 0)}
                color={theme.sky}
                sub="Total payment attempts"
              />
            </View>

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: theme.foreground, marginBottom: 12 }}>
                Active Subscribers ({paywall?.access?.length || 0})
              </Text>
              {(paywall?.access || []).length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.mutedForeground, textAlign: 'center', paddingVertical: 20 }}>
                  No active subscribers yet.
                </Text>
              ) : (
                (paywall?.access || []).map((a, i) => (
                  <View
                    key={`${a.userId}-${i}`}
                    style={[styles.paywallRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: theme.foreground }}>
                        {a.email || 'No email'}
                      </Text>
                      <Text numberOfLines={1} style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 2 }}>
                        {midTrunc(a.userId, 26)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: theme.emerald }}>
                        {formatNairaRound((a.amountKobo || 0) / 100)}
                      </Text>
                      <Text style={{ fontSize: 9, color: theme.mutedForeground, marginTop: 2 }}>
                        Expires {formatDate(a.expiresAt) || '—'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: theme.foreground, marginBottom: 12 }}>
                Recent Payment Transactions ({paywall?.payments?.length || 0})
              </Text>
              {(paywall?.payments || []).length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.mutedForeground, textAlign: 'center', paddingVertical: 20 }}>
                  No payment transactions yet.
                </Text>
              ) : (
                (paywall?.payments || []).map((p, i) => {
                  const ok = p.status === 'success';
                  const pending = p.status === 'pending';
                  const tone = ok ? theme.emerald : pending ? theme.amber : theme.red;
                  return (
                    <View
                      key={`${p.reference}-${i}`}
                      style={[styles.paywallRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.paywallStatusDot, { backgroundColor: tone }]} />
                          <Text style={{ fontSize: 10, fontWeight: '900', color: tone, textTransform: 'uppercase' }}>
                            {p.status}
                          </Text>
                        </View>
                        <Text numberOfLines={1} style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 3 }}>
                          {midTrunc(p.reference, 30)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: theme.emerald }}>
                          {formatNairaRound((p.amountKobo || 0) / 100)}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 9, color: theme.mutedForeground, marginTop: 2 }}>
                          {p.email || ''}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gateScroll: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  gateIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  gateNote: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 16 },
  gateBtn: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  founderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  shieldBox: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  banner: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  refreshBtn: { width: 32, height: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabBarWrap: { flexGrow: 0, flexShrink: 0 },
  tabBarScroll: { flexGrow: 0, flexShrink: 0 },
  tabBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' },
  tabChip: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 36 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: { width: '48%', borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10, minHeight: 116, justifyContent: 'space-between' },
  iconChip: { width: 28, height: 28, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 6, borderRadius: 4, overflow: 'hidden' },
  divider: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  incidentBanner: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 14 },
  incidentBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 0 },
  paywallInput: {
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 16,
  },
  paywallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  paywallStatusDot: { width: 8, height: 8, borderRadius: 4 },
  countBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  userRow: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tinyBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, borderWidth: 1 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  actionBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  callBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 38, borderRadius: 12 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  successMsg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 12 },
  logRow: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  clientBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  uidChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, maxWidth: 150 },
  complaintCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  messageBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 36, borderRadius: 12, borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 10 },
});
