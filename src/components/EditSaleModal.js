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
import { formatNaira, formatNairaSigned } from '../utils/format';
import { useAppT, useAppTF } from '../i18n';

export const EditSaleModal = ({ visible, sale, onClose }) => {
  const { isDarkMode, products, updateSale, deleteSale } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const tf = useAppTF();

  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitName, setUnitName] = useState('Piece');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    if (visible && sale) {
      setQuantity(String(sale.quantitySold || 1));
      setUnitPrice(
        String(
          sale.sellingPricePerUnit ||
            (sale.totalRevenue && sale.quantitySold
              ? Math.round(sale.totalRevenue / sale.quantitySold)
              : 0)
        )
      );
      setUnitName(sale.unitName || 'Piece');
      if (sale.timestamp) {
        const d = new Date(sale.timestamp);
        setDateStr(isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16));
      } else {
        setDateStr('');
      }
    }
  }, [visible, sale]);

  if (!visible || !sale) return null;

  const qtyNum = Math.max(1, parseInt(quantity, 10) || 1);
  const priceNum = Math.max(0, parseFloat(unitPrice) || 0);
  const totalRevenue = qtyNum * priceNum;

  const product = products.find((p) => p.id === sale.productId);
  const goodsCost = product ? product.purchasePrice || 0 : 0;
  const fractionOfTotalSold =
    product && goodsCost > 0
      ? Math.min(1, totalRevenue / goodsCost)
      : Number(sale.fractionOfTotalSold) || 0;

  const handleSave = () => {
    let timestamp = sale.timestamp;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) timestamp = parsed.toISOString();
    }
    updateSale({
      ...sale,
      quantitySold: qtyNum,
      sellingPricePerUnit: priceNum,
      unitName: unitName.trim() || 'Piece',
      totalRevenue,
      fractionOfTotalSold,
      timestamp,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      t('edit.deleteTitle'),
      tf('edit.deleteDesc', sale.productName || 'item'),
      [
        { text: t('action.cancel'), style: 'cancel' },
        {
          text: t('edit.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            deleteSale(sale.id);
            onClose();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const micro = { fontSize: 11, fontWeight: '800', color: theme.mutedForeground, letterSpacing: 1 };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: theme.amber + '14', borderColor: theme.amber + '33' },
                ]}
              >
                <Ionicons name="bag-handle-outline" size={16} color={theme.amber} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: theme.foreground }}>
                  {t('edit.title')}
                </Text>
                <Text style={{ fontSize: 12, color: theme.mutedForeground }} numberOfLines={1}>
                  {sale.productName || 'Sale Entry'}
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

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ paddingTop: 18 }}>
                <Text style={[micro, { marginBottom: 8 }]}>{t('sale.quantitySold')}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                  ]}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="1"
                  placeholderTextColor={theme.mutedForeground}
                />

                <Text style={[micro, { marginBottom: 8, marginTop: 14 }]}>{t('edit.sellingUnit')}</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                  ]}
                  value={unitName}
                  onChangeText={setUnitName}
                  placeholder={t('edit.unitPlaceholder')}
                  placeholderTextColor={theme.mutedForeground}
                />

                <Text style={[micro, { marginBottom: 8, marginTop: 14 }]}>
                  {tf('edit.pricePerUnit', unitName || t('edit.sellingUnit'))}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                  ]}
                  keyboardType="numeric"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="0"
                  placeholderTextColor={theme.mutedForeground}
                />

                <View
                  style={[
                    styles.totalCard,
                    { backgroundColor: theme.amber + '14', borderColor: theme.amber + '33' },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={micro}>{t('edit.totalRevenueLabel')}</Text>
                    <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 4 }}>
                      {qtyNum} × {formatNaira(priceNum)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: theme.gold, marginLeft: 12 }}>
                    {formatNairaSigned(totalRevenue)}
                  </Text>
                </View>

                {dateStr !== '' && (
                  <>
                    <Text style={[micro, { marginBottom: 8, marginTop: 14 }]}>{t('edit.saleDateTime')}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground },
                      ]}
                      value={dateStr}
                      onChangeText={setDateStr}
                      autoCapitalize="none"
                      placeholder="2025-01-31T14:30"
                      placeholderTextColor={theme.mutedForeground}
                    />
                  </>
                )}

                <View style={[styles.footer, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleDelete}
                    style={[styles.deleteBtn, { borderColor: theme.red + '40', backgroundColor: theme.red + '14' }]}
                  >
                    <Ionicons name="trash" size={14} color={theme.red} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.red }}>{t('edit.deleteSale')}</Text>
                  </TouchableOpacity>

                  <View style={styles.footerRight}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={onClose}
                      style={[styles.textBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: theme.mutedForeground }}>{t('action.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleSave}
                      style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                    >
                      <Ionicons name="checkmark" size={15} color="#000" />
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#000' }}>{t('edit.saveChanges')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={{ height: 12 }} />
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
    paddingTop: 0,
    paddingBottom: 20,
    maxHeight: '86%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '700',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
    gap: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});

export default EditSaleModal;
