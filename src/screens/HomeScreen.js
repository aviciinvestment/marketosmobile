import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNaira, formatNumber } from '../utils/format';
import { saleRevenue } from '../utils/finance';
import { useAppT, useAppTF } from '../i18n';
import { SaleModal } from '../components/SaleModal';
import { EditSaleModal } from '../components/EditSaleModal';
import { ExpenseList } from '../components/ExpenseList';
import { ExpenseModal } from '../components/ExpenseModal';

const saleTime = (s) => Number(s.updatedAt) || (s.timestamp ? new Date(s.timestamp).getTime() : 0) || 0;

export default function HomeScreen({ navigation }) {
  const { isDarkMode, products, sales, deleteSale, deviceId } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const tf = useAppTF();

  const [saleProduct, setSaleProduct] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const recentSales = useMemo(
    () => [...sales].sort((a, b) => saleTime(b) - saleTime(a)).slice(0, 10),
    [sales]
  );

  const confirmDeleteSale = (sale) => {
    Alert.alert(
      t('edit.deleteTitle'),
      tf('confirm.deleteSaleDesc', sale.productName || 'Product', formatNumber(saleRevenue(sale))),
      [
        { text: t('action.cancel'), style: 'cancel' },
        { text: t('confirm.yesDeleteSale'), style: 'destructive', onPress: () => deleteSale(sale.id) },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Friendly Greeting so the page is easy to understand at a glance */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: theme.foreground, letterSpacing: -0.5 }}>
            {t('title.home')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.mutedForeground, marginTop: 4, lineHeight: 20 }}>
            {t('home.greeting')}
          </Text>
        </View>

        {/* Quick Sell Register - bright yellow so it stands out as the main action */}
        <LinearGradient
          colors={['#FDE68A', '#FCD34D', '#FBBF24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.quickSellCard]}
        >
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 19, fontWeight: '900', color: '#451a03', letterSpacing: -0.4 }}>
                {t('home.quickSell')}
              </Text>
              <View style={styles.tapBadge}>
                <Text style={styles.tapBadgeText}>{t('home.tapToRecord')}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(120,53,15,0.8)', marginTop: 5 }}>
              {t('home.quickSellSubtitle')}
            </Text>
            {products.length > 0 && (
              <Text style={{ fontSize: 12, color: '#78350f', fontWeight: '700', marginTop: 8 }}>
                {products.length} {products.length === 1 ? t('home.itemInStock') : t('home.itemsInStock')}
              </Text>
            )}
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyStock}>
              <Ionicons name="cube-outline" size={30} color="rgba(120,53,15,0.6)" />
              <View>
                <Text style={{ fontWeight: '800', color: '#451a03', fontSize: 14, textAlign: 'center' }}>
                  {t('home.noStock')}
                </Text>
                <Text style={{ color: 'rgba(120,53,15,0.8)', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                  {t('home.goToStock')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation && navigation.navigate('Products')}
                style={[styles.goldBtn, { backgroundColor: '#F5C518' }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#000' }}>{t('home.goToStockBtn')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {products.map((product) => {
                const displayPrice =
                  product.sellingUnits?.length > 0 ? product.sellingUnits[0].price : product.purchasePrice || 0;
                const unitName =
                  product.sellingUnits?.length > 0 ? product.sellingUnits[0].name : product.purchaseUnit || 'Unit';
                return (
                  <TouchableOpacity
                    key={String(product.id)}
                    activeOpacity={0.85}
                    onPress={() => setSaleProduct(product)}
                    style={styles.productCard}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <View style={styles.productIcon}>
                        <Ionicons name="bag-handle-outline" size={20} color="#78350f" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: '800', color: '#451a03', lineHeight: 20 }}
                          numberOfLines={1}
                        >
                          {product.name}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: 'rgba(120,53,15,0.7)', fontWeight: '600', marginTop: 1 }}
                          numberOfLines={1}
                        >
                          • {unitName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.productPrice}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#fefce8' }}>
                        {formatNaira(Number(displayPrice) || 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

        </LinearGradient>

        {/* Recent Quick Sells - Mistaken Entry Management (Edit & Delete) */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: theme.foreground, letterSpacing: -0.3 }}>
                {t('home.recentQuickSells')}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 3 }}>
              {t('home.recentQuickSellsSub')}
            </Text>
            {sales.length > 0 && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.emerald + '1A',
                  borderColor: theme.emerald + '33',
                  borderWidth: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  marginTop: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.emerald }}>
                  {sales.length} Total {sales.length === 1 ? 'Sale' : 'Sales'}
                </Text>
              </View>
            )}
          </View>

          {recentSales.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ fontSize: 12, color: theme.mutedForeground, textAlign: 'center' }}>
                {t('home.noSalesYet')}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {recentSales.map((sale) => (
                <View
                  key={String(sale.id)}
                  style={[styles.sellRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.emerald + '26', borderColor: theme.emerald + '33' }]}>
                    <Ionicons name="bag-handle-outline" size={16} color={theme.emerald} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 3 }}>
                      <Text
                        style={{ color: theme.foreground, fontWeight: '800', fontSize: 13, flexShrink: 1 }}
                        numberOfLines={1}
                      >
                        {tf('sale.soldName', sale.productName || 'Product')}
                      </Text>
                      <View
                        style={{
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: theme.border,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: theme.mutedForeground, fontSize: 10, fontWeight: '600' }}>
                          {sale.quantitySold || 1} {sale.unitName || 'Unit'}
                        </Text>
                      </View>
                      {sale.updatedByDevice ? (
                        <View
                          style={[
                            styles.deviceChip,
                            {
                              backgroundColor:
                                (sale.updatedByDevice === deviceId ? theme.emerald : theme.sky) + '10',
                              borderColor: (sale.updatedByDevice === deviceId ? theme.emerald : theme.sky) + '33',
                            },
                          ]}
                        >
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: sale.updatedByDevice === deviceId ? theme.emerald : theme.sky,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: sale.updatedByDevice === deviceId ? theme.emerald : theme.sky,
                            }}
                          >
                            {sale.updatedByDevice === deviceId ? t('sale.thisDevice') : t('sale.anotherDevice')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                      {sale.timestamp
                        ? new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : t('sale.recently')}
                      {sale.sellingPricePerUnit ? ` · ${formatNaira(sale.sellingPricePerUnit)} each` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ color: theme.emerald, fontWeight: '900', fontSize: 15 }}>
                      +{formatNaira(saleRevenue(sale))}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setEditingSale(sale)}
                        style={[styles.miniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Ionicons name="pencil" size={13} color={theme.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => confirmDeleteSale(sale)}
                        style={[styles.miniBtn, { backgroundColor: theme.rose + '1A', borderColor: theme.rose + '33' }]}
                      >
                        <Ionicons name="trash" size={13} color={theme.rose} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Business Expenses Component */}
        <ExpenseList
          onEditExpense={(expense) => {
            setEditingExpense(expense);
            setExpenseModalOpen(true);
          }}
          onAddExpense={() => {
            setEditingExpense(null);
            setExpenseModalOpen(true);
          }}
        />

        <View style={{ height: 12 }} />
      </ScrollView>

      <SaleModal visible={!!saleProduct} product={saleProduct} onClose={() => setSaleProduct(null)} />
      <EditSaleModal visible={!!editingSale} sale={editingSale} onClose={() => setEditingSale(null)} />
      <ExpenseModal
        visible={expenseModalOpen}
        expense={editingExpense}
        onClose={() => setExpenseModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 28 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  quickSellCard: {
    borderColor: 'rgba(251, 191, 36, 0.7)',
    shadowColor: '#F5C518',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tapBadge: {
    backgroundColor: 'rgba(69, 26, 3, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.2)',
  },
  tapBadgeText: { fontSize: 10, fontWeight: '700', color: '#451a03' },
  emptyStock: {
    paddingVertical: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(120, 53, 15, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  goldBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.1)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPrice: {
    backgroundColor: '#451a03',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.1)',
  },
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
