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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNaira } from '../utils/format';
import { useAppT, useAppTF } from '../i18n';

export default function ProductModal({ visible, product, onClose, onSave }) {
  const ctx = useSyncContext();
  const { isDarkMode, saveProduct } = ctx;
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const tf = useAppTF();

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

  if (!visible || !form) return null;

  const unitFallback = t('product.thisUnit');
  const purchasePrice = Number(form.purchasePrice) || 0;
  const qtyPurchased = Number(form.quantityPurchased) || 0;

  const addSellingUnit = () => {
    setForm({
      ...form,
      sellingUnits: [
        ...(form.sellingUnits || []),
        { id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: '', yieldFromTotal: 0, price: '' },
      ],
    });
  };

  const updateSellingUnit = (id, field, value) => {
    setForm({
      ...form,
      sellingUnits: (form.sellingUnits || []).map((u) => (u.id === id ? { ...u, [field]: value } : u)),
    });
  };

  const removeSellingUnit = (id) => {
    setForm({
      ...form,
      sellingUnits: (form.sellingUnits || []).filter((u) => u.id !== id),
    });
  };

  const handleSave = () => {
    if (!form.name || !form.purchasePrice || !form.quantityPurchased || !form.purchaseUnit) {
      setError(t('product.errBasic'));
      return;
    }
    const units = form.sellingUnits || [];
    if (units.length === 0) {
      setError(t('product.errNoWays'));
      return;
    }
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.name || !u.price || Number(u.price) <= 0) {
        setError(tf('product.errWay', u.name || unitFallback));
        return;
      }
    }
    const defaultYield = qtyPurchased || 1;
    const sellingUnits = units.map((u) => {
      const y = Number(u.yieldFromTotal);
      const yieldFromTotal = y > 0 ? y : defaultYield;
      return { ...u, yieldFromTotal, price: Number(u.price) || 0 };
    });
    const saved = {
      ...form,
      id: form.id || Date.now().toString(),
      name: String(form.name).trim(),
      purchasePrice,
      quantityPurchased: qtyPurchased,
      sellingUnits,
    };
    setError('');
    if (typeof onSave === 'function') onSave(saved);
    else {
      saveProduct(saved);
      handleClose();
    }
  };

  const renderSectionHead = (num, title, right) => (
    <View style={[styles.sectionHead, { borderBottomColor: theme.border }]}>
      <View style={styles.sectionHeadLeft}>
        <View style={[styles.numCircle, { backgroundColor: theme.primary + '26', borderColor: theme.primary + '4D' }]}>
          <Text style={[styles.numText, { color: theme.primary }]}>{num}</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>{title}</Text>
      </View>
      {right}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.header}>
              <Text style={[styles.chip, { color: theme.gold }]}>
                {product && product.name ? t('product.editChip') : t('product.newChip')}
              </Text>
              <Text style={[styles.headerTitle, { color: theme.foreground }]}>
                {product && product.name ? t('product.editTitle') : t('product.newTitle')}
              </Text>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: theme.rose + '1A', borderColor: theme.rose + '4D' },
                  ]}
                >
                  <Ionicons name="alert-circle" size={16} color={theme.rose} />
                  <Text style={[styles.errorText, { color: theme.rose }]}>{error}</Text>
                </View>
              ) : null}

              {/* 1. Item name */}
              <View style={styles.section}>
                {renderSectionHead('1', t('product.sec1Title'))}
                <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('product.nameLabel')}</Text>
                <TextInput
                  value={form.name || ''}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder={t('product.namePlaceholder')}
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
                />
              </View>

              {/* 2. What you paid */}
              <View style={styles.section}>
                {renderSectionHead('2', t('product.sec2Title'))}

                <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('product.qtyLabel')}</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(form.quantityPurchased || '')}
                  onChangeText={(v) => setForm({ ...form, quantityPurchased: parseFloat(v) || 0 })}
                  placeholder={t('product.qtyPlaceholder')}
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
                />

                <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('product.boughtAsLabel')}</Text>
                <TextInput
                  value={form.purchaseUnit || ''}
                  onChangeText={(v) => setForm({ ...form, purchaseUnit: v })}
                  placeholder={t('product.boughtAsPlaceholder')}
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
                />
                <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('product.boughtAsHint')}</Text>

                <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('product.totalCostLabel')}</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(form.purchasePrice || '')}
                  onChangeText={(v) => setForm({ ...form, purchasePrice: parseFloat(v) || 0 })}
                  placeholder={t('product.totalCostPlaceholder')}
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }]}
                />
              </View>

              {/* 3. How you sell it */}
              <View style={styles.section}>
                {renderSectionHead(
                  '3',
                  t('product.sec3Title'),
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={addSellingUnit}
                    style={[styles.addWayBtn, { backgroundColor: theme.primary }]}
                  >
                    <Ionicons name="add" size={14} color="#000" />
                    <Text style={styles.addWayBtnText}>{t('product.addWay')}</Text>
                  </TouchableOpacity>
                )}

                {(form.sellingUnits || []).length === 0 ? (
                  <View style={[styles.emptyWays, { borderColor: theme.border }]}>
                    <Text style={[styles.emptyWaysText, { color: theme.mutedForeground }]}>{t('product.noWays')}</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={addSellingUnit}
                      style={[styles.addWayBtn, { backgroundColor: theme.primary }]}
                    >
                      <Ionicons name="add" size={14} color="#000" />
                      <Text style={styles.addWayBtnText}>{t('product.addWay')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  (form.sellingUnits || []).map((unit) => {
                    const unitName = unit.name || unitFallback;
                    const y = Number(unit.yieldFromTotal) || 0;
                    const priceU = Number(unit.price) || 0;
                    const costPerItem = y > 0 ? purchasePrice / y : 0;
                    const profitPerItem = priceU - costPerItem;
                    const isLoss = y > 0 && priceU > 0 && profitPerItem < 0;

                    return (
                      <View
                        key={unit.id}
                        style={[styles.unitCard, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => removeSellingUnit(unit.id)}
                          style={[styles.removeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.mutedForeground} />
                        </TouchableOpacity>

                        <Text style={[styles.label, { color: theme.mutedForeground }]}>{t('product.soldAsLabel')}</Text>
                        <TextInput
                          value={unit.name || ''}
                          onChangeText={(v) => updateSellingUnit(unit.id, 'name', v)}
                          placeholder={t('product.soldAsPlaceholder')}
                          placeholderTextColor={theme.mutedForeground}
                          style={[styles.input, styles.inputSm, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
                        />

                        <Text style={[styles.label, { color: theme.mutedForeground }]}>
                          {tf('product.priceLabel', unitName)}
                        </Text>
                        <TextInput
                          keyboardType="numeric"
                          value={unit.price === 0 || unit.price === '' ? '' : String(unit.price)}
                          onChangeText={(v) => updateSellingUnit(unit.id, 'price', parseFloat(v) || 0)}
                          placeholder={tf('product.pricePlaceholder', unitName)}
                          placeholderTextColor={theme.mutedForeground}
                          style={[styles.input, styles.inputSm, { backgroundColor: theme.card, borderColor: theme.border, color: theme.foreground }]}
                        />

                        <View
                          style={[
                            styles.yieldBox,
                            isLoss
                              ? { backgroundColor: theme.rose + '1A', borderColor: theme.rose + '4D' }
                              : { backgroundColor: theme.card, borderColor: theme.border },
                          ]}
                        >
                          <Text style={[styles.yieldLabel, { color: isLoss ? theme.rose : theme.foreground }]}>
                            {tf('product.yieldLabel', unitName)}
                          </Text>
                          <View style={styles.yieldRow}>
                            <Text style={[styles.yieldText, { color: theme.mutedForeground }]}>{tf('product.yieldPrefix')}</Text>
                            <TextInput
                              keyboardType="numeric"
                              value={y === 0 ? '' : String(y)}
                              onChangeText={(v) => updateSellingUnit(unit.id, 'yieldFromTotal', parseFloat(v) || 0)}
                              placeholder={tf('product.yieldPlaceholder', unitName)}
                              placeholderTextColor={theme.mutedForeground}
                              style={[
                                styles.yieldInput,
                                { backgroundColor: theme.background, borderColor: theme.border, color: theme.foreground },
                              ]}
                            />
                            <Text style={[styles.yieldText, { color: theme.mutedForeground }]}>{tf('product.yieldTotal', unitName)}</Text>
                          </View>
                          <Text style={[styles.hint, { color: theme.mutedForeground, marginTop: 6 }]}>
                            {tf('product.yieldHint', unitName)}
                          </Text>

                          {y > 0 && priceU > 0 && purchasePrice > 0 ? (
                            <View style={[styles.calcRow, { borderTopColor: theme.border }]}>
                              <View style={[styles.calcTile, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Text style={[styles.calcLabel, { color: theme.mutedForeground }]}>
                                  {tf('product.costPer', unitName)}
                                </Text>
                                <Text style={[styles.calcValue, { color: theme.foreground }]}>
                                  {formatNaira(costPerItem)}
                                </Text>
                              </View>
                              <View style={[styles.calcTile, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Text style={[styles.calcLabel, { color: theme.mutedForeground }]}>
                                  {tf('product.profitPer', unitName)}
                                </Text>
                                <Text style={[styles.calcValue, { color: isLoss ? theme.rose : theme.emerald }]}>
                                  {isLoss ? '' : '+'}
                                  {formatNaira(profitPerItem)}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleClose}
                style={[styles.footerBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[styles.footerBtnText, { color: theme.foreground }]}>{t('product.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                style={[styles.footerBtn, styles.footerBtnPrimary, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.footerBtnText, styles.footerBtnPrimaryText]}>
                  {product && product.name ? t('product.saveEdit') : t('product.saveNew')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: { marginBottom: 18 },
  chip: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { fontSize: 12, fontWeight: '700', flex: 1 },
  section: { gap: 8, marginBottom: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 13, fontWeight: '900' },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  hint: { fontSize: 10, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  inputSm: { paddingVertical: 10, fontSize: 13 },
  addWayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  addWayBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },
  emptyWays: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyWaysText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  unitCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    marginTop: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  yieldBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  yieldLabel: { fontSize: 12, fontWeight: '800', marginBottom: 10 },
  yieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  yieldText: { fontSize: 12, fontWeight: '600' },
  yieldInput: {
    width: 84,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 14,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  calcTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  calcLabel: { fontSize: 11, fontWeight: '700' },
  calcValue: { fontSize: 14, fontWeight: '900' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  footerBtnPrimary: { borderWidth: 0 },
  footerBtnText: { fontWeight: '800', fontSize: 14 },
  footerBtnPrimaryText: { color: '#000' },
});
