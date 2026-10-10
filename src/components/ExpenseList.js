import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaSigned, formatDateShort, formatNumber } from '../utils/format';
import { useAppT, useAppTF } from '../i18n';

export const ExpenseList = ({ onEditExpense, limit, title, onAddExpense }) => {
  const { isDarkMode, expenses, deleteExpense, deviceId } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const tf = useAppTF();

  const timeOf = (e) => (e.date ? new Date(e.date).getTime() : 0) || Number(e.updatedAt) || 0;
  const sorted = [...(expenses || [])].sort((a, b) => timeOf(b) - timeOf(a));
  const rows = limit ? sorted.slice(0, limit) : sorted.slice(0, 20);

  const confirmDelete = (expense) => {
    Alert.alert(
      t('expense.deleteTitle'),
      tf('expense.deleteDesc', formatNumber(expense.amount || 0), expense.category || 'Expense'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: t('expense.yesDelete'), style: 'destructive', onPress: () => deleteExpense(expense.id) },
      ],
      { cancelable: true }
    );
  };

  const addButton = onAddExpense ? (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onAddExpense}
      style={[styles.addBtn, { backgroundColor: theme.primary }]}
    >
      <Ionicons name="add" size={15} color="#000" />
      <Text style={{ fontSize: 12, fontWeight: '900', color: '#000', marginLeft: 4 }}>{t('expense.record')}</Text>
    </TouchableOpacity>
  ) : null;

  const countBadge =
    sorted.length > 0 ? (
      <View
        style={[styles.countBadge, { backgroundColor: theme.amber + '1A', borderColor: theme.amber + '33' }]}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.amber }}>
          {sorted.length} {sorted.length === 1 ? 'Expense' : 'Expenses'}
        </Text>
      </View>
    ) : null;

  const deviceBadge = (expense) => {
    if (!expense.updatedByDevice) return null;
    const mine = expense.updatedByDevice === deviceId;
    const color = mine ? theme.emerald : theme.sky;
    return (
      <View
        style={{
          backgroundColor: color + '1A',
          borderColor: color + '33',
          borderWidth: 1,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: '800', color }}>{mine ? t('sale.thisDevice') : t('sale.anotherDevice')}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {title ? (
        <View style={styles.headerRow}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: theme.foreground, flexShrink: 1 }} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {countBadge}
            {addButton}
          </View>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: theme.foreground, letterSpacing: -0.3 }}>
              {t('expense.title')}
            </Text>
            <View
              style={[
                styles.expenseBadge,
                { backgroundColor: theme.amber + '26', borderColor: theme.amber + '4D' },
              ]}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: theme.amber }}>{t('expense.badge')}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 3 }}>{t('expense.subtitle')}</Text>
          {countBadge || addButton ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 12,
              }}
            >
              {countBadge}
              {addButton}
            </View>
          ) : null}
        </View>
      )}

      {rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="trending-down" size={26} color={theme.mutedForeground} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.foreground, marginTop: 8 }}>
            {t('expense.emptyTitle')}
          </Text>
          <Text style={{ fontSize: 11, color: theme.mutedForeground, textAlign: 'center', marginTop: 4 }}>
            {t('expense.emptyDesc')}
          </Text>
          {onAddExpense ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onAddExpense}
              style={[
                styles.emptyAddBtn,
                { borderColor: theme.primary + '66', backgroundColor: theme.primary + '14', marginTop: 12 },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary }}>+ {t('expense.record')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((expense) => (
            <View
              key={String(expense.id)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: theme.amber + '26', borderColor: theme.amber + '33' }]}>
                <Ionicons name="trending-down" size={16} color={theme.amber} />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 2 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: '800', color: theme.foreground, flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {expense.category || 'Expense'}
                  </Text>
                  {deviceBadge(expense)}
                </View>
                <Text style={{ fontSize: 11, color: theme.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  {expense.description ? `${expense.description} · ` : ''}
                  {formatDateShort(expense.date)}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: theme.amber,
                  backgroundColor: theme.amber + '1A',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: theme.amber + '33',
                  overflow: 'hidden',
                  marginLeft: 6,
                }}
                numberOfLines={1}
              >
                {formatNairaSigned(-(expense.amount || 0))}
              </Text>

              {onEditExpense ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onEditExpense(expense)}
                  style={[styles.actionBtn, { backgroundColor: theme.surfaceHover, borderColor: theme.border }]}
                >
                  <Ionicons name="pencil" size={13} color={theme.mutedForeground} />
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => confirmDelete(expense)}
                style={[styles.actionBtn, { backgroundColor: theme.red + '14', borderColor: theme.red + '33' }]}
              >
                <Ionicons name="trash" size={13} color={theme.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  expenseBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  emptyAddBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
});

export default ExpenseList;
