import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';

const CATEGORIES = ['Transport', 'Electricity', 'Rent', 'Packaging', 'Staff', 'Delivery', 'Other'];

const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isValidDateStr = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(`${s}T00:00:00`).getTime());

export const ExpenseModal = ({ visible, expense, onClose }) => {
  const { isDarkMode, saveExpense } = useSyncContext();
  const theme = getTheme(isDarkMode);

  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toLocalDateStr(new Date()));

  useEffect(() => {
    if (visible) {
      setCategory(expense?.category || 'Rent');
      setAmount(expense ? String(expense.amount || 0) : '');
      setDescription(expense?.description || '');
      setDate(
        expense?.date
          ? toLocalDateStr(new Date(expense.date))
          : toLocalDateStr(new Date())
      );
    }
  }, [visible, expense]);

  const amountNum = parseFloat(amount);
  const canSave = !isNaN(amountNum) && amountNum > 0 && isValidDateStr(date);

  const handleSave = () => {
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Amount Required', 'Enter how much you spent before saving.', [{ text: 'OK' }], {
        cancelable: true,
      });
      return;
    }
    if (!isValidDateStr(date)) {
      Alert.alert('Invalid Date', 'Enter the date as YYYY-MM-DD, e.g. 2026-10-07.', [{ text: 'OK' }], {
        cancelable: true,
      });
      return;
    }

    saveExpense({
      id: expense?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category,
      amount: amountNum,
      description: description.trim(),
      date: new Date(`${date}T00:00:00`).toISOString(),
    });
    onClose();
  };

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  const dateChip = (label, value) => {
    const active = date === value;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setDate(value)}
        style={[
          styles.dateChip,
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
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: theme.gold,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    {expense ? 'UPDATE' : 'NEW EXPENSE'}
                  </Text>
                  <Text style={{ color: theme.foreground, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>
                    {expense ? 'Edit Expense' : 'Record Money Spent'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 4 }}>
                    Separate from buying goods (transport, rent, fuel)
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

              <View style={{ marginTop: 20 }}>
                <Text style={[micro, { marginBottom: 10 }]}>CATEGORY</Text>
                <View style={styles.chipGrid}>
                  {CATEGORIES.map((c) => {
                    const active = category === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        activeOpacity={0.85}
                        onPress={() => setCategory(c)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: active ? theme.primary : theme.surface,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: active ? '#000' : theme.mutedForeground,
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={[micro, { marginBottom: 8 }]}>HOW MUCH DID YOU SPEND?</Text>
                <View
                  style={[
                    styles.inputRow,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.gold, fontWeight: '900', fontSize: 19, paddingLeft: 14 }}>₦</Text>
                  <TextInput
                    style={[styles.inlineInput, { color: theme.foreground }]}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={theme.mutedForeground}
                  />
                </View>
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={[micro, { marginBottom: 8 }]}>DATE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  {dateChip('Today', toLocalDateStr(new Date()))}
                  {dateChip('Yesterday', toLocalDateStr(new Date(Date.now() - 86400000)))}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                  ]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.mutedForeground}
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginTop: 20 }}>
                <Text style={[micro, { marginBottom: 8 }]}>NOTE / REASON (OPTIONAL)</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Paid okada for warehouse run"
                  placeholderTextColor={theme.mutedForeground}
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={!canSave}
                onPress={handleSave}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: theme.primary, marginTop: 24, opacity: canSave ? 1 : 0.5 },
                ]}
              >
                <Ionicons name="checkmark" size={18} color="#000" />
                <Text style={{ color: '#000', fontWeight: '900', fontSize: 15, marginLeft: 8 }}>
                  {expense ? 'Update Expense' : 'Save Expense'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 8 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inlineInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
    fontSize: 21,
    fontWeight: '900',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
  },
  dateChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ExpenseModal;
