import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNaira, formatRelative } from '../utils/format';
import { calculateFinancials, stockOf } from '../utils/finance';

// Derive the notification list straight from the data, so it is always current.
// Pure & cheap: the app header calls this on every render for its badge dot.
export function buildNotifications(products, sales, expenses, options = {}) {
  const notes = [];
  const opts = options || {};
  const productList = Array.isArray(products) ? products : [];
  const salesList = Array.isArray(sales) ? sales : [];
  const expensesList = Array.isArray(expenses) ? expenses : [];
  const online = opts.online !== false;
  const syncError = !!opts.syncError;
  const otherDevicePending = Array.isArray(opts.otherDevicePending) ? opts.otherDevicePending : [];

  const now = new Date().toISOString();
  const stamp = Date.now();

  const { totalSales, grossProfit, totalExpenses, netProfit } = calculateFinancials(
    salesList,
    expensesList,
    productList
  );

  // Profit milestone
  if (totalSales > 0 && netProfit > 0) {
    notes.push({
      id: `profit-${stamp}`,
      icon: 'profit',
      title: 'You are making money',
      message: `After covering your goods and expenses you are ${formatNaira(netProfit)} in profit. Keep it up!`,
      time: now,
    });
  } else if (totalSales > 0 && grossProfit > 0 && netProfit <= 0) {
    notes.push({
      id: `gross-profit-${stamp}`,
      icon: 'profit',
      title: 'Sales are covering your goods',
      message: `Your products earned ${formatNaira(grossProfit)} in profit, but expenses are eating into it.`,
      time: now,
    });
  }

  // Spending too much
  if (totalSales > 0 && totalExpenses >= totalSales) {
    notes.push({
      id: `spending-${stamp}`,
      icon: 'spending',
      title: 'Spending too much',
      message: `Your expenses (${formatNaira(totalExpenses)}) have matched or passed everything you made (${formatNaira(totalSales)}). Trim costs before you run dry.`,
      time: now,
    });
  } else if (totalExpenses > 0 && totalExpenses >= grossProfit) {
    notes.push({
      id: `spending-profit-${stamp}`,
      icon: 'spending',
      title: 'Expenses are wiping out your profit',
      message: `You spent ${formatNaira(totalExpenses)} while your products only made ${formatNaira(grossProfit)}. Watch your spending.`,
      time: now,
    });
  }

  // Break-even / payback reached per product
  productList.forEach((p) => {
    if (!p) return;
    const s = stockOf(p, salesList);
    if (s.moneyMade > 0 && s.fractionConsumed >= 1) {
      notes.push({
        id: `break-even-${p.id}-${stamp}`,
        icon: 'break-even',
        title: `${p.name} is fully paid back`,
        message: `Every naira you spent on ${p.name} (${formatNaira(s.goodsCost)}) has been recovered. It is now pure profit.`,
        time: now,
      });
    } else if (s.moneyMade > 0 && s.fractionConsumed >= 0.5 && s.fractionConsumed < 1) {
      notes.push({
        id: `halfway-${p.id}-${stamp}`,
        icon: 'break-even',
        title: `${p.name} is halfway to breaking even`,
        message: `You have recovered ${(s.fractionConsumed * 100).toFixed(0)}% of the ${formatNaira(s.goodsCost)} it cost. Keep selling.`,
        time: now,
      });
    }
  });

  // Offline / unsynced data (mobile adds these on top of the web rules)
  if (!online) {
    notes.push({
      id: `offline-${stamp}`,
      icon: 'offline',
      title: 'You are offline',
      message: 'Records you add are saved on this device and will reach the cloud once you are back online.',
      time: now,
    });
  } else if (syncError) {
    notes.push({
      id: `unsynced-${stamp}`,
      icon: 'offline',
      title: 'Changes have not synced yet',
      message: 'Your latest records have not reached the cloud. Tap the sync button to try again.',
      time: now,
    });
  }

  if (otherDevicePending.length > 0) {
    notes.push({
      id: `other-device-${stamp}`,
      icon: 'offline',
      title: 'Another device has unsaved records',
      message:
        otherDevicePending.length > 1
          ? `${otherDevicePending.length} devices recorded data that hasn't synced yet. Go online on that device so everything appears here.`
          : "A device recorded data that hasn't reached the cloud yet. Go online on that device so everything appears here.",
      time: now,
    });
  }

  notes.sort((a, b) => (a.time < b.time ? 1 : -1));
  return notes.slice(0, 8);
}

const ICONS = {
  profit: { name: 'trending-up', bg: 'emerald' },
  'break-even': { name: 'flag-outline', bg: 'primary' },
  spending: { name: 'trending-down', bg: 'rose' },
  offline: { name: 'cloud-offline-outline', bg: 'sky' },
};

export default function NotificationsPanel({ visible, onClose }) {
  const { isDarkMode, products, sales, expenses, online, lastSyncAt, syncError, otherDevicePending, forceSync, isSyncing } =
    useSyncContext();
  const theme = getTheme(isDarkMode);

  const pending = Array.isArray(otherDevicePending) ? otherDevicePending : [];

  const notes = useMemo(
    () => buildNotifications(products, sales, expenses, { online, lastSyncAt, syncError, otherDevicePending: pending }),
    [products, sales, expenses, online, lastSyncAt, syncError, pending.length]
  );

  // The pending-device card below already covers this case (web parity).
  const listNotes = notes.filter((n) => !String(n.id).startsWith('other-device-'));
  const showEmpty = listNotes.length === 0 && pending.length === 0;

  const chipColors = {
    emerald: theme.emerald,
    primary: theme.primary,
    rose: theme.rose,
    sky: theme.sky,
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.foreground, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 }}>
                Notifications
              </Text>
              <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 2 }}>
                Milestones, warnings & sync updates
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Ionicons name="close" size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} showsVerticalScrollIndicator={false}>
            {pending.length > 0 && (
              <View
                style={[
                  styles.pendingCard,
                  { backgroundColor: theme.sky + '1A', borderColor: theme.sky + '4D' },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View
                    style={[
                      styles.noteIcon,
                      { backgroundColor: theme.sky + '26', borderColor: theme.sky + '40' },
                    ]}
                  >
                    <Ionicons name="cloud-offline-outline" size={16} color={theme.sky} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.foreground }}>
                      Another device has unsaved records
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.sky, marginTop: 3, lineHeight: 16 }}>
                      {pending.length > 1
                        ? `${pending.length} devices recorded data that hasn't synced yet.`
                        : "A device recorded data that hasn't reached the cloud yet."}{' '}
                      Go online on that device so everything appears here.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSyncing}
                  onPress={() => !isSyncing && forceSync && forceSync()}
                  style={[styles.retryBtn, { backgroundColor: theme.sky, opacity: isSyncing ? 0.6 : 1 }]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="refresh" size={13} color="#fff" />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', marginLeft: isSyncing ? 6 : 5 }}>
                    {isSyncing ? 'Pulling...' : 'Pull latest now'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {showEmpty ? (
              <View style={styles.empty}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons name="sparkles-outline" size={24} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.foreground, marginTop: 14 }}>
                  All quiet for now
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.mutedForeground,
                    marginTop: 6,
                    textAlign: 'center',
                    lineHeight: 18,
                    paddingHorizontal: 24,
                  }}
                >
                  You will get notified here when you reach break-even, start profiting, or spend too much.
                </Text>
              </View>
            ) : (
              listNotes.map((note) => {
                const ico = ICONS[note.icon] || ICONS.offline;
                const color = chipColors[ico.bg] || theme.primary;
                return (
                  <View
                    key={note.id}
                    style={[
                      styles.noteCard,
                      { backgroundColor: theme.surface + '80', borderColor: theme.border },
                    ]}
                  >
                    <View
                      style={[styles.noteIcon, { backgroundColor: color + '26', borderColor: color + '40' }]}
                    >
                      <Ionicons name={ico.name} size={16} color={color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.foreground }}>{note.title}</Text>
                      <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 4, lineHeight: 17 }}>
                        {note.message}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.mutedForeground, marginTop: 6, fontWeight: '700' }}>
                        {formatRelative(note.time)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  pendingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  noteIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  empty: { alignItems: 'center', paddingVertical: 44 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
