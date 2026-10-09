import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNaira, formatNumber, formatRelative } from '../utils/format';
import { stockOf, saleRevenue } from '../utils/finance';
import { useAppT, useAppTF } from '../i18n';
import { SaleModal } from '../components/SaleModal';
import { EditSaleModal } from '../components/EditSaleModal';
import { ExpenseList } from '../components/ExpenseList';
import { ExpenseModal } from '../components/ExpenseModal';

const saleTime = (s) => Number(s.updatedAt) || (s.timestamp ? new Date(s.timestamp).getTime() : 0) || 0;

export default function HomeScreen({ navigation }) {
  const { isDarkMode, products, sales, expenses, deleteSale, deviceId } = useSyncContext();
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
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: theme.foreground, letterSpacing: -0.5 }}>
            {t('title.home')}
          </Text>
          <Text style={{ fontSize: 14, color: theme.mutedForeground, marginTop: 4, lineHeight: 20 }}>
            {t('home.greeting')}
          </Text>
        </View>

        {/* Quick Sell Register */}
        <LinearGradient
          colors={['#FDE68A', '#FCD34D', '#FBBF24']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.card, {
            borderColor: 'rgba(9, 9, 11, 0.3)',
            borderWidth: 1.5,
            shadowColor: '#F5C518',
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
          }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: '#09090B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="flash" size={17} color="#FFD54A" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#09090B', letterSpacing: -0.4 }}>
                  {t('home.quickSell')}
                </Text>
                <View
                  style={{
                    backgroundColor: '#09090B',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFD54A' }}>{t('home.tapToRecord')}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: 'rgba(9, 9, 11, 0.72)', marginTop: 6 }}>
                {t('home.quickSellSubtitle')}
              </Text>
            </View>
            {products.length > 0 && (
              <View
                style={{
                  backgroundColor: '#09090B',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  marginLeft: 10,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFD54A' }}>
                  {products.length} {products.length === 1 ? t('home.itemInStock') : t('home.itemsInStock')}
                </Text>
              </View>
            )}
          </View>

          {products.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="cube-outline" size={30} color={theme.mutedForeground} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.foreground, marginTop: 10 }}>
                {t('home.noStock')}
              </Text>
              <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 4 }}>
                {t('home.goToStock')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation && navigation.navigate('Products')}
                style={[styles.goldBtn, { backgroundColor: theme.primary, marginTop: 14 }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#000' }}>{t('home.goToStockBtn')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(9, 9, 11, 0.16)', paddingTop: 14 }}>
              {products.map((product) => {
                const st = stockOf(product, sales);
                const primaryUnit = Array.isArray(product.sellingUnits) && product.sellingUnits.length > 0
                  ? product.sellingUnits[0]
                  : null;
                const displayPrice = primaryUnit ? primaryUnit.price : product.purchasePrice || 0;
                const unitName = primaryUnit ? primaryUnit.name : product.purchaseUnit || 'Unit';
                return (
                  <TouchableOpacity
                    key={String(product.id)}
                    activeOpacity={0.85}
                    onPress={() => setSaleProduct(product)}
                    style={[styles.sellRow, {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      borderLeftWidth: 4,
                      borderLeftColor: theme.primary,
                    }]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: theme.primary + '14', borderColor: theme.primary + '33' }]}>
                      <Ionicons name="bag-handle" size={17} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: theme.foreground, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                        • {product.category || 'General'} · {unitName}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View
                        style={{
                          backgroundColor: theme.primary + '14',
                          borderColor: theme.primary + '33',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 9,
                        }}
                      >
                        <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 12 }}>
                          {formatNaira(Number(displayPrice) || 0)}
                        </Text>
                      </View>
                      <Text style={{ color: theme.mutedForeground, fontSize: 10, fontWeight: '700', marginTop: 4 }}>
                        {Math.round(st.remainingPercentage)}% left
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.mutedForeground} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </LinearGradient>

        {/* Recent Quick Sells */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: theme.foreground, letterSpacing: -0.3 }}>
                {t('home.recentQuickSells')}
              </Text>
              <Text style={{ fontSize: 12, color: theme.mutedForeground, marginTop: 3 }}>
                {t('home.recentQuickSellsSub')}
              </Text>
            </View>
            {sales.length > 0 && (
              <View
                style={{
                  backgroundColor: theme.emerald + '14',
                  borderColor: theme.emerald + '33',
                  borderWidth: 1,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginLeft: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.emerald }}>
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
            <View style={{ gap: 10 }}>
              {recentSales.map((sale) => (
                <View
                  key={String(sale.id)}
                  style={[styles.sellRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: theme.emerald + '14', borderColor: theme.emerald + '33' }]}>
                    <Ionicons name="trending-up" size={17} color={theme.emerald} />
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
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: theme.mutedForeground, fontSize: 10, fontWeight: '800' }}>
                          {sale.quantitySold || 1} {sale.unitName || 'Unit'}
                        </Text>
                      </View>
                      {sale.updatedByDevice ? (
                        <View
                          style={{
                            backgroundColor:
                              (sale.updatedByDevice === deviceId ? theme.emerald : theme.sky) + '1A',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: sale.updatedByDevice === deviceId ? theme.emerald : theme.sky,
                            }}
                          >
                            {sale.updatedByDevice === deviceId ? t('sale.thisDevice') : t('sale.anotherDevice')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                      {formatRelative(sale.timestamp)}
                      {sale.sellingPricePerUnit ? ` · ${formatNaira(sale.sellingPricePerUnit)} each` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ color: theme.emerald, fontWeight: '900', fontSize: 14 }}>
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
                        style={[styles.miniBtn, { backgroundColor: theme.red + '14', borderColor: theme.red + '33' }]}
                      >
                        <Ionicons name="trash" size={13} color={theme.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Expenses preview */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: theme.foreground, letterSpacing: -0.3 }}>
              {t('expense.title')}
            </Text>
            {navigation ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Expenses')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary }}>View all</Text>
                <Ionicons name="chevron-forward" size={13} color={theme.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ExpenseList
            limit={4}
            onEditExpense={(expense) => {
              setEditingExpense(expense);
              setExpenseModalOpen(true);
            }}
            onAddExpense={() => {
              setEditingExpense(null);
              setExpenseModalOpen(true);
            }}
          />
        </View>

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
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  kpi: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    minWidth: 0,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  goldBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
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
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
