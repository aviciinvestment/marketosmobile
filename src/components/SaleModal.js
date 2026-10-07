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
import { formatNaira, formatNairaSigned, formatNumber, formatQty } from '../utils/format';
import { stockOf } from '../utils/finance';

export const SaleModal = ({ visible, product, onClose }) => {
  const { isDarkMode, sales, addSale } = useSyncContext();
  const theme = getTheme(isDarkMode);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (visible && product) {
      const units = Array.isArray(product.sellingUnits) ? product.sellingUnits : [];
      setSelectedUnitId(units.length > 0 ? units[0].id : '');
      setQuantity('1');
      setPrice('');
      setRecorded(false);
    }
  }, [visible, product]);

  if (!visible || !product) return null;

  const hasUnits = Array.isArray(product.sellingUnits) && product.sellingUnits.length > 0;
  const units = hasUnits
    ? product.sellingUnits
    : [
        {
          id: 'unit',
          name: product.purchaseUnit || 'Unit',
          price: product.purchasePrice || 0,
          yieldFromTotal: product.quantityPurchased || 1,
        },
      ];
  const activeUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  const unitPrice = Number(activeUnit.price) || 0;
  const qtyNum = parseInt(quantity, 10) || 0;
  const priceNum = price !== '' && Number(price) > 0 ? Number(price) : unitPrice;
  const revenue = qtyNum * priceNum;

  const st = stockOf(product, sales);
  const moneyMadeSoFar = st.moneyMade + revenue;
  const runningProfit = moneyMadeSoFar - st.goodsCost;
  const fractionAfter = st.goodsCost > 0 ? Math.min(1, moneyMadeSoFar / st.goodsCost) : 0;
  const remainingQty = Math.max(0, (product.quantityPurchased || 0) * (1 - fractionAfter));

  const yieldTotal = Number(activeUnit.yieldFromTotal) || 0;
  const fractionOfTotalSold = yieldTotal > 0 ? qtyNum / yieldTotal : 0;

  const canSave = qtyNum > 0 && !!activeUnit;

  const handleRecord = () => {
    if (!canSave) return;
    addSale({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      unitId: activeUnit.id,
      unitName: activeUnit.name,
      quantitySold: qtyNum,
      sellingPricePerUnit: priceNum,
      customPrice: priceNum !== unitPrice,
      totalRevenue: revenue,
      fractionOfTotalSold,
      timestamp: new Date().toISOString(),
    });
    setRecorded(true);
  };

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  const summaryRow = (label, value, valueColor, isLast) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        marginBottom: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1, flexShrink: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '900', color: valueColor || theme.foreground, marginLeft: 12 }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {recorded ? (
                <View style={{ paddingTop: 8 }}>
                  <View
                    style={[
                      styles.successIcon,
                      { backgroundColor: theme.emerald + '1A', borderColor: theme.emerald + '33' },
                    ]}
                  >
                    <Ionicons name="checkmark" size={34} color={theme.emerald} />
                  </View>
                  <Text
                    style={{
                      color: theme.foreground,
                      fontSize: 24,
                      fontWeight: '900',
                      textAlign: 'center',
                      letterSpacing: -0.5,
                    }}
                  >
                    Sale Recorded!
                  </Text>
                  <Text
                    style={{
                      color: theme.mutedForeground,
                      fontSize: 12,
                      textAlign: 'center',
                      marginTop: 4,
                      marginBottom: 20,
                    }}
                  >
                    Stock and financials updated immediately.
                  </Text>

                  <View
                    style={[
                      styles.review,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    {summaryRow('MONEY RECEIVED', formatNaira(revenue), theme.foreground, false)}
                    {summaryRow(
                      'QUANTITY SOLD',
                      `${qtyNum} ${activeUnit.name}${qtyNum > 1 ? 's' : ''}`,
                      theme.foreground,
                      false
                    )}
                    {summaryRow(
                      `PROFIT SO FAR ON ${product.name.toUpperCase()}`,
                      formatNairaSigned(runningProfit, 0),
                      runningProfit < 0 ? theme.rose : theme.emerald,
                      false
                    )}
                    {summaryRow(
                      'REMAINING STOCK',
                      `${formatQty(remainingQty)} ${product.purchaseUnit || 'units'} left`,
                      theme.foreground,
                      true
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onClose}
                    style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.primaryBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.headerRow}>
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
                        NEW SALE
                      </Text>
                      <Text
                        style={{
                          color: theme.foreground,
                          fontSize: 20,
                          fontWeight: '900',
                          letterSpacing: -0.5,
                        }}
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.headerIcon,
                        { backgroundColor: theme.amber + '14', borderColor: theme.amber + '33' },
                      ]}
                    >
                      <Ionicons name="cube-outline" size={20} color={theme.amber} />
                    </View>
                  </View>

                  {hasUnits && (
                    <View style={{ marginTop: 20 }}>
                      <Text style={[micro, { marginBottom: 10 }]}>SELECT UNIT SOLD</Text>
                      <View style={styles.unitGrid}>
                        {units.map((unit) => {
                          const active = activeUnit.id === unit.id;
                          return (
                            <TouchableOpacity
                              key={unit.id}
                              activeOpacity={0.85}
                              onPress={() => {
                                setSelectedUnitId(unit.id);
                                setPrice('');
                              }}
                              style={[
                                styles.unitChip,
                                {
                                  backgroundColor: active ? theme.primary + '14' : theme.surface,
                                  borderColor: active ? theme.primary : theme.border,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '800',
                                  color: active ? theme.foreground : theme.mutedForeground,
                                  marginBottom: 3,
                                }}
                                numberOfLines={1}
                              >
                                {unit.name}
                              </Text>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: theme.gold }}>
                                {formatNaira(Number(unit.price) || 0)} each
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  <View style={{ marginTop: 20 }}>
                    <Text style={[micro, { marginBottom: 8 }]}>SELLING PRICE</Text>
                    <View
                      style={[
                        styles.inputRow,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.mutedForeground,
                          fontWeight: '900',
                          fontSize: 15,
                          paddingLeft: 14,
                        }}
                      >
                        ₦
                      </Text>
                      <TextInput
                        style={[styles.inlineInput, { color: theme.foreground }]}
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                        placeholder={formatNumber(unitPrice)}
                        placeholderTextColor={theme.mutedForeground}
                      />
                    </View>
                    {price !== '' && Number(price) > 0 && (
                      <Text style={{ fontSize: 10, fontWeight: '800', color: theme.gold, marginTop: 6 }}>
                        Custom price{unitPrice > 0 ? ` — unit price is ${formatNaira(unitPrice)}` : ''}
                      </Text>
                    )}
                  </View>

                  <View style={{ marginTop: 20 }}>
                    <Text style={[micro, { marginBottom: 8 }]}>QUANTITY</Text>
                    <View
                      style={[
                        styles.qtyRow,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.stepBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setQuantity(String(Math.max(1, qtyNum - 1)))}
                      >
                        <Ionicons name="remove" size={20} color={theme.foreground} />
                      </TouchableOpacity>
                      <TextInput
                        style={{ flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '900', color: theme.foreground }}
                        keyboardType="numeric"
                        value={quantity}
                        onChangeText={setQuantity}
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.stepBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setQuantity(String(qtyNum + 1))}
                      >
                        <Ionicons name="add" size={20} color={theme.foreground} />
                      </TouchableOpacity>
                    </View>
                    {qtyNum <= 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.red, marginTop: 6 }}>
                        Quantity must be greater than 0.
                      </Text>
                    )}
                  </View>

                  <View style={[styles.review, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 20 }]}>
                    <View style={styles.reviewRow}>
                      <Text style={micro}>MONEY RECEIVED</Text>
                      <Text style={{ fontSize: 26, fontWeight: '900', color: theme.foreground, marginTop: 4 }}>
                        {formatNaira(revenue)}
                      </Text>
                    </View>
                    {(product.purchasePrice || 0) > 0 && (
                      <View style={[styles.reviewRow, styles.reviewDivider, { borderTopColor: theme.border }]}>
                        <Text style={{ fontSize: 12, color: theme.mutedForeground, flexShrink: 1 }}>
                          Profit so far on {product.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: (runningProfit < 0 ? theme.rose : theme.emerald) + '1A',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            marginLeft: 10,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '900',
                              color: runningProfit < 0 ? theme.rose : theme.emerald,
                            }}
                          >
                            {formatNairaSigned(runningProfit, 0)}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View
                      style={[
                        styles.reviewRow,
                        styles.reviewDivider,
                        { borderTopColor: theme.border, marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
                      ]}
                    >
                      <Text style={micro}>REMAINING STOCK</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.foreground, marginLeft: 10 }}>
                        {formatQty(remainingQty)} {product.purchaseUnit || 'units'} left
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={!canSave}
                    onPress={handleRecord}
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: theme.primary, marginTop: 20, opacity: canSave ? 1 : 0.5 },
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>Record Sale</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitChip: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inlineInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, fontWeight: '800' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
    gap: 8,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: { borderRadius: 16, borderWidth: 1, padding: 16 },
  reviewRow: {},
  reviewDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.25)',
    marginTop: 12,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
});

export default SaleModal;
