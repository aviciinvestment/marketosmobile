import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaRound } from '../utils/format';
import { filterByPeriod } from '../utils/finance';
import { useAppT } from '../i18n';
import { ExpenseList } from '../components/ExpenseList';
import { ExpenseModal } from '../components/ExpenseModal';

const PERIODS = [
  { key: 'today', labelKey: 'period.today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All' },
];

const dayStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const periodLabel = (key, t) => {
  const p = PERIODS.find((x) => x.key === key) || PERIODS[0];
  return p.labelKey ? t(p.labelKey) : p.label;
};

export default function ExpensesScreen() {
  const { isDarkMode, expenses } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();

  const [period, setPeriod] = useState('today');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const filtered = useMemo(() => {
    if (period === 'today') return filterByPeriod(expenses, 'today');
    if (period === 'all') return filterByPeriod(expenses, 'all');
    const days = period === '7d' ? 7 : 30;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    return filterByPeriod(expenses, 'custom', dayStr(start), dayStr(new Date()));
  }, [expenses, period]);

  const total = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const count = filtered.length;

  const openAdd = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const openEdit = (expense) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: theme.foreground, letterSpacing: -0.6 }}>
          {t('expense.title')}
        </Text>
        <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 4 }}>
          {t('expense.subtitle')}
        </Text>

        <View style={styles.chipRow}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                activeOpacity={0.85}
                onPress={() => setPeriod(p.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: active ? '#000' : theme.mutedForeground,
                  }}
                >
                  {p.labelKey ? t(p.labelKey) : p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={micro}>TOTAL SPENT</Text>
            <View
              style={{
                backgroundColor: theme.red + '14',
                borderColor: theme.red + '33',
                borderWidth: 1,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '900', color: theme.red, letterSpacing: 1 }}>
                {periodLabel(period, t).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '900', color: theme.red, letterSpacing: -1 }}>
            {formatNairaRound(total)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="trending-down" size={13} color={theme.mutedForeground} />
            <Text style={{ fontSize: 12, color: theme.mutedForeground, fontWeight: '700' }}>
              {count} {count === 1 ? 'expense' : 'expenses'} in this period
            </Text>
          </View>
        </View>

        <ExpenseList title="Expense Records" onEditExpense={openEdit} onAddExpense={openAdd} />
      </ScrollView>

      <ExpenseModal
        visible={modalOpen}
        expense={editingExpense}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 },
  chip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  totalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
});
