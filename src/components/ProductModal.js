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
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';

const CATEGORY_OPTIONS = [
  'General',
  'Food & Drinks',
  'Beauty',
  'Stationery',
  'Electronics',
  'Other'
];

const STATUS_OPTIONS = ['Active', 'Draft', 'Archived'];

const PURCHASE_UNIT_OPTIONS = [
  'Units',
  'Litres',
  'Bags',
  'Cartons',
  'Packs',
  'Pieces',
  'Kg',
  'g',
  'ml',
  'Boxes',
  'Rolls'
];

export default function ProductModal({ visible, product, onClose }) {
  const ctx = useSyncContext();
  const { isDarkMode, saveProduct } = ctx;
  const theme = getTheme(isDarkMode);

  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && product) {
      setForm({ ...product });
      setError('');
    } else if (!visible) {
      setForm(null);
      setError('');
    }
  }, [visible, product]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const addSellingUnit = () => {
    if (!form) return;
    const newUnit = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: '',
      yieldFromTotal: '',
      price: 0
    };
    setForm({
      ...form,
      sellingUnits: [...(form.sellingUnits || []), newUnit]
    });
  };

  const updateSellingUnit = (id, field, value) => {
    if (!form) return;
    setForm({
      ...form,
      sellingUnits: form.sellingUnits.map((u) =>
        u.id === id ? { ...u, [field]: value } : u
      )
    });
  };

  const removeSellingUnit = (id) => {
    if (!form) return;
    const units = form.sellingUnits || [];
    if (units.length <= 1) return;
    setForm({
      ...form,
      sellingUnits: units.filter((u) => u.id !== id)
    });
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.name || !form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    const qty = Number(form.quantityPurchased) || 0;
    if (qty <= 0) {
      setError('Quantity purchased must be greater than 0.');
      return;
    }

    const units = form.sellingUnits || [];
    if (units.length === 0) {
      setError('Please add at least one selling unit.');
      return;
    }

    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.name || !u.name.trim()) {
        setError('Each selling unit must have a name.');
        return;
      }
    }

    const defaultYield = qty || 1;
    const sellingUnits = units.map((u) => {
      const y = Number(u.yieldFromTotal) || 0;
      const yieldFromTotal = y > 0 ? y : defaultYield;
      const price = Number(u.price) || 0;
      return {
        ...u,
        name: (u.name || '').trim(),
        yieldFromTotal,
        price
      };
    });

    const saved = {
      ...form,
      id: form.id || Date.now().toString(),
      name: form.name.trim(),
      category: form.category || 'General',
      purchasePrice: Number(form.purchasePrice) || 0,
      quantityPurchased: qty,
      purchaseUnit: form.purchaseUnit || 'Units',
      datePurchased: form.datePurchased || new Date().toISOString(),
      fractionConsumed: form.fractionConsumed || 0,
      status: form.status || 'Active',
      sellingUnits,
      updatedAt: Date.now()
    };

    setError('');
    saveProduct(saved);
    handleClose();
  };

  if (!visible || !form) return null;

  const purchasePrice = Number(form.purchasePrice) || 0;
  const qtyPurchased = Number(form.quantityPurchased) || 0;
  const costPerUnit = (qtyPurchased > 0 ? purchasePrice / qtyPurchased : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>
              {product && product.name ? 'Edit Item' : 'Add New Item to Stock'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: `${theme.rose}10`, borderColor: `${theme.rose}40` }
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={theme.rose} />
                <Text style={[styles.errorText, { color: theme.rose }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Product Details</Text>

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Item Name</Text>
              <TextInput
                value={form.name || ''}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Kings Cooking Oil"
                placeholderTextColor={theme.mutedForeground}
                style={[
                  styles.input,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                ]}
              />

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Category</Text>
              <View style={styles.chipRowWrap}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = (form.category || 'General') === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setForm({ ...form, category: cat })}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? theme.primary : theme.surface,
                          borderColor: theme.border
                        }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? '#000' : theme.foreground }]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Status</Text>
              <View style={styles.chipRowWrap}>
                {STATUS_OPTIONS.map((st) => {
                  const selected = (form.status || 'Active') === st;
                  let bg = theme.surface;
                  if (selected) {
                    if (st === 'Active') bg = theme.emerald;
                    else if (st === 'Draft') bg = theme.amber;
                    else bg = theme.muted;
                  }
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setForm({ ...form, status: st })}
                      style={[
                        styles.chip,
                        { backgroundColor: bg, borderColor: theme.border }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? '#000' : theme.foreground }]}>
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Purchase Info</Text>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Quantity Purchased</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={form.quantityPurchased === 0 ? '' : String(form.quantityPurchased)}
                    onChangeText={(v) => setForm({ ...form, quantityPurchased: parseFloat(v) || 0 })}
                    placeholder="1"
                    placeholderTextColor={theme.mutedForeground}
                    style={[
                      styles.input,
                      { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                    ]}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>Purchase Unit</Text>
                  <View style={styles.chipRowWrap}>
                    {PURCHASE_UNIT_OPTIONS.slice(0, 6).map((unit) => {
                      const selected = (form.purchaseUnit || 'Units') === unit;
                      return (
                        <Pressable
                          key={unit}
                          onPress={() => setForm({ ...form, purchaseUnit: unit })}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? theme.primary : theme.surface,
                              borderColor: theme.border
                            }
                          ]}
                        >
                          <Text style={[styles.chipText, { color: selected ? '#000' : theme.foreground }]}>
                            {unit}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={form.purchaseUnit || ''}
                    onChangeText={(v) => setForm({ ...form, purchaseUnit: v })}
                    placeholder="e.g. Litres, Bags"
                    placeholderTextColor={theme.mutedForeground}
                    style={[
                      styles.input,
                      { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground, marginTop: 8 }
                    ]}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Total Cost (₦)</Text>
              <TextInput
                keyboardType="numeric"
                value={form.purchasePrice === 0 ? '' : String(form.purchasePrice)}
                onChangeText={(v) => setForm({ ...form, purchasePrice: parseFloat(v) || 0 })}
                placeholder="0"
                placeholderTextColor={theme.mutedForeground}
                style={[
                  styles.input,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                ]}
              />

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Date Purchased (YYYY-MM-DD)</Text>
              <TextInput
                value={form.datePurchased ? form.datePurchased.slice(0, 10) : ''}
                onChangeText={(v) => {
                  const iso = v ? new Date(v).toISOString() : new Date().toISOString();
                  setForm({ ...form, datePurchased: iso });
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.mutedForeground}
                style={[
                  styles.input,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                ]}
              />
              <Pressable
                onPress={() => setForm({ ...form, datePurchased: new Date().toISOString() })}
                style={[styles.todayBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.todayBtnText, { color: theme.foreground }]}>Today</Text>
              </Pressable>

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Supplier Info (optional)</Text>
              <TextInput
                value={form.supplierInfo || ''}
                onChangeText={(v) => setForm({ ...form, supplierInfo: v })}
                placeholder="Supplier name/contact"
                placeholderTextColor={theme.mutedForeground}
                style={[
                  styles.input,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                ]}
              />

              <Text style={[styles.label, { color: theme.mutedForeground }]}>Notes (optional)</Text>
              <TextInput
                value={form.notes || ''}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder="Any notes"
                placeholderTextColor={theme.mutedForeground}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
                ]}
              />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Selling Units</Text>
                <Pressable
                  onPress={addSellingUnit}
                  style={[styles.addUnitBtn, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="add" size={16} color="#000" />
                  <Text style={styles.addUnitBtnText}>Add Unit</Text>
                </Pressable>
              </View>

              {(form.sellingUnits || []).map((unit) => {
                const y = Number(unit.yieldFromTotal) || 0;
                const priceU = Number(unit.price) || 0;
                const costPerItem = y > 0 ? purchasePrice / y : 0;
                const profitPerItem = priceU - costPerItem;
                const isLoss = y > 0 && priceU > 0 && profitPerItem < 0;

                return (
                  <View
                    key={unit.id}
                    style={[
                      styles.unitCard,
                      { backgroundColor: theme.surface, borderColor: theme.border }
                    ]}
                  >
                    <View style={styles.unitHeader}>
                      <Text style={[styles.unitTitle, { color: theme.foreground }]}>Selling Unit</Text>
                      <Pressable
                        onPress={() => removeSellingUnit(unit.id)}
                        disabled={(form.sellingUnits || []).length <= 1}
                        style={[
                          styles.removeBtn,
                          {
                            opacity: (form.sellingUnits || []).length <= 1 ? 0.4 : 1,
                            borderColor: theme.border
                          }
                        ]}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.rose} />
                      </Pressable>
                    </View>

                    <Text style={[styles.label, { color: theme.mutedForeground }]}>Sold As (e.g. Cup)</Text>
                    <TextInput
                      value={unit.name || ''}
                      onChangeText={(v) => updateSellingUnit(unit.id, 'name', v)}
                      placeholder="e.g. Cup"
                      placeholderTextColor={theme.mutedForeground}
                      style={[
                        styles.input,
                        { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }
                      ]}
                    />

                    <Text style={[styles.label, { color: theme.mutedForeground }]}>
                      Selling Price for 1 {unit.name || 'unit'} (₦)
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={priceU === 0 ? '' : String(priceU)}
                      onChangeText={(v) => updateSellingUnit(unit.id, 'price', parseFloat(v) || 0)}
                      placeholder="0"
                      placeholderTextColor={theme.mutedForeground}
                      style={[
                        styles.input,
                        { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }
                      ]}
                    />

                    <Text style={[styles.label, { color: theme.mutedForeground }]}>
                      Yield From Total (optional — how many {unit.name || 'units'} from bulk)
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={y === 0 ? '' : String(y)}
                      onChangeText={(v) => updateSellingUnit(unit.id, 'yieldFromTotal', parseFloat(v) || 0)}
                      placeholder={`e.g. ${qtyPurchased || 1}`}
                      placeholderTextColor={theme.mutedForeground}
                      style={[
                        styles.input,
                        { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }
                      ]}
                    />

                    {y > 0 && priceU > 0 && purchasePrice > 0 ? (
                      <View style={styles.hintRow}>
                        <Text style={[styles.hintText, { color: theme.mutedForeground }]}>
                          Cost per {unit.name || 'unit'}: {costPerItem.toFixed(2)}
                        </Text>
                        <Text style={[styles.hintText, { color: isLoss ? theme.rose : theme.emerald }]}>
                          {isLoss ? '' : '+'}Profit: {profitPerItem.toFixed(2)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={handleClose}
              style={[styles.footerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.footerBtnText, { color: theme.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: theme.primary }]}
            >
              <Text style={[styles.footerBtnText, styles.footerBtnPrimaryText]}>Save Item</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  errorText: { fontSize: 12, fontWeight: '700', flex: 1 },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  todayBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6
  },
  todayBtnText: { fontSize: 11, fontWeight: '700' },
  unitCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginTop: 10
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  unitTitle: { fontSize: 14, fontWeight: '800' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  addUnitBtnText: { color: '#000', fontWeight: '800', fontSize: 12 },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  hintText: { fontSize: 11, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center'
  },
  footerBtnPrimary: { borderWidth: 0 },
  footerBtnText: { fontWeight: '800' },
  footerBtnPrimaryText: { color: '#000' }
});
