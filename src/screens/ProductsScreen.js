import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Pressable,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { stockOf, productFinancials } from '../utils/finance';
import { formatNaira, formatNairaRound, formatQty } from '../utils/format';
import ProductModal from '../components/ProductModal';

const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'stock', label: 'Stock' },
  { id: 'views', label: 'Views' }
];

const ORDER_OPTIONS = [
  { id: 'asc', label: 'Asc' },
  { id: 'desc', label: 'Desc' }
];

export default function ProductsScreen() {
  const ctx = useSyncContext();
  const {
    isDarkMode,
    products,
    sales,
    saveProduct,
    deleteProduct
  } = ctx;

  const theme = getTheme(isDarkMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [productSortBy, setProductSortBy] = useState('name');
  const [productSortOrder, setProductSortOrder] = useState('asc');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const handleAddProduct = () => {
    const newProduct = {
      id: Date.now().toString(),
      name: '',
      category: 'General',
      purchasePrice: 0,
      quantityPurchased: 1,
      purchaseUnit: 'Units',
      datePurchased: new Date().toISOString(),
      fractionConsumed: 0,
      status: 'Active',
      sellingUnits: [
        {
          id: Date.now().toString(),
          name: 'Piece',
          yieldFromTotal: '',
          price: 0
        }
      ],
      views: 0
    };
    setEditingProduct(newProduct);
    setIsModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Product',
      'This will be permanently removed and synced across all your devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(id) }
      ],
      { cancelable: true }
    );
  };

  const handleSaveProduct = (productData) => {
    saveProduct(productData);
  };

  const filteredAndSortedProducts = [...products]
    .filter((p) => {
      const name = (p.name || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    })
    .map((p) => {
      const prodSales = (sales || []).filter((s) => s.productId === p.id);
      const stock = stockOf(p, sales);
      const pf = productFinancials(p, sales);
      return {
        ...p,
        _prodSales: prodSales,
        _stock: stock,
        _pf: pf
      };
    })
    .sort((a, b) => {
      let valA;
      let valB;
      if (productSortBy === 'price') {
        valA = a.purchasePrice || 0;
        valB = b.purchasePrice || 0;
      } else if (productSortBy === 'stock') {
        valA = (a._stock && a._stock.qtyRemaining) || 0;
        valB = (b._stock && b._stock.qtyRemaining) || 0;
      } else if (productSortBy === 'views') {
        valA = a.views || 0;
        valB = b.views || 0;
      } else {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      }

      if (valA < valB) return productSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return productSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const renderSortChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {SORT_OPTIONS.map((opt) => {
        const selected = productSortBy === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => setProductSortBy(opt.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: theme.border
              }
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? '#000' : theme.foreground }
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderOrderChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {ORDER_OPTIONS.map((opt) => {
        const selected = productSortOrder === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => setProductSortOrder(opt.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: theme.border
              }
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selected ? '#000' : theme.foreground }
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderProductRow = ({ item }) => {
    const stock = item._stock || {};
    const pf = item._pf || { moneyMade: 0, goodsCost: 0, profit: 0 };
    const remainingPercentage = stock.remainingPercentage || 0;
    const qtyRemaining = stock.qtyRemaining || 0;
    const qtySold = stock.qtySold || 0;
    const remainingValue = stock.remainingValue || 0;

    const moneyMade = pf.moneyMade || 0;
    const goodsCost = pf.goodsCost || item.purchasePrice || 0;
    const profit = pf.profit || (moneyMade - goodsCost);

    let statusPill = null;
    if (item.status === 'Active') {
      statusPill = (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${theme.emerald}15`, borderColor: `${theme.emerald}40` }
          ]}
        >
          <Text style={[styles.statusText, { color: theme.emerald }]}>Active</Text>
        </View>
      );
    } else if (item.status === 'Draft') {
      statusPill = (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${theme.amber}15`, borderColor: `${theme.amber}40` }
          ]}
        >
          <Text style={[styles.statusText, { color: theme.amber }]}>Draft</Text>
        </View>
      );
    } else if (item.status === 'Archived') {
      statusPill = (
        <View
          style={[
            styles.statusPill,
            { backgroundColor: `${theme.muted}15`, borderColor: theme.border }
          ]}
        >
          <Text style={[styles.statusText, { color: theme.mutedForeground }]}>Archived</Text>
        </View>
      );
    }

    let profitColor = theme.foreground;
    if (moneyMade > 0) {
      profitColor = profit > 0 ? theme.emerald : theme.rose;
    } else {
      profitColor = theme.foreground;
    }

    return (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border
          }
        ]}
        onPress={() => handleEditProduct(item)}
        onLongPress={() => handleDelete(item.id)}
      >
        <View style={styles.rowHeader}>
          <View style={styles.rowTitleWrap}>
            <Text
              style={[styles.rowTitle, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {statusPill}
          </View>
          <View style={styles.actionGroup}>
            <Pressable
              onPress={() => handleEditProduct(item)}
              style={[styles.iconBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Ionicons name="create-outline" size={16} color={theme.foreground} />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item.id)}
              style={[
                styles.iconBtn,
                { borderColor: `${theme.rose}40`, backgroundColor: `${theme.rose}10` }
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={theme.rose} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.rowSub, { color: theme.mutedForeground }]}>
          {item.category || 'General'}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.mutedForeground }]}>
          Bought {formatQty(item.quantityPurchased || 0)} {item.purchaseUnit || 'Units'} for {formatNaira(item.purchasePrice || 0)}
        </Text>

        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View>
              <Text style={[styles.microLabel, { color: theme.mutedForeground }]}>WHAT I HAVE LEFT</Text>
              <Text style={[styles.qtyText, { color: theme.foreground }]}>
                {formatQty(qtyRemaining)}{' '}
                <Text style={[styles.qtyUnit, { color: theme.mutedForeground }]}>
                  {item.purchaseUnit || 'Units'}
                </Text>
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.progressBg,
              { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, remainingPercentage))}%`,
                  backgroundColor:
                    remainingPercentage <= 10
                      ? theme.rose
                      : remainingPercentage <= 25
                      ? theme.gold
                      : theme.emerald
                }
              ]}
            />
          </View>

          <View style={styles.stockFooter}>
            <Text style={[styles.stockInfo, { color: theme.mutedForeground }]}>
              Sold: {formatQty(qtySold)} {item.purchaseUnit || 'Units'}
            </Text>
            <View
              style={[
                styles.valuePill,
                { backgroundColor: theme.surface, borderColor: theme.border }
              ]}
            >
              <Text style={[styles.valueText, { color: theme.foreground }]}>
                Value: {formatNaira(remainingValue)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.finRow}>
          <View style={[styles.finTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.finLabel, { color: theme.mutedForeground }]}>TOTAL SALES</Text>
            <Text
              style={[styles.finValue, { color: theme.foreground }]}
              numberOfLines={1}
            >
              {moneyMade > 0 ? formatNairaRound(moneyMade) : '-'}
            </Text>
          </View>
          <View style={[styles.finTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.finLabel, { color: theme.mutedForeground }]}>GOODS COST</Text>
            <Text
              style={[styles.finValue, { color: theme.foreground }]}
              numberOfLines={1}
            >
              {goodsCost > 0 ? formatNairaRound(goodsCost) : '-'}
            </Text>
          </View>
          <View
            style={[
              styles.finTile,
              {
                backgroundColor:
                  moneyMade === 0 ? theme.surface : profit > 0 ? `${theme.emerald}10` : `${theme.rose}10`,
                borderColor:
                  moneyMade === 0 ? theme.border : profit > 0 ? `${theme.emerald}40` : `${theme.rose}40`
              }
            ]}
          >
            <Text style={[styles.finLabel, { color: theme.mutedForeground }]}>GROSS PROFIT</Text>
            <Text
              style={[
                styles.finValue,
                { color: moneyMade === 0 ? theme.foreground : profitColor }
              ]}
              numberOfLines={1}
            >
              {moneyMade > 0 ? formatNairaRound(profit) : '-'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const itemCount = products.length;
  const hasProducts = itemCount > 0;
  const hasFiltered = filteredAndSortedProducts.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>My Stock</Text>
          <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Pressable
          onPress={handleAddProduct}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={theme.mutedForeground} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search my stock..."
          placeholderTextColor={theme.mutedForeground}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.foreground
            }
          ]}
        />
      </View>

      <View style={styles.controls}>
        <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>Sort by</Text>
        {renderSortChips()}
        <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>Order</Text>
        {renderOrderChips()}
      </View>

      <FlatList
        data={filteredAndSortedProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProductRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
              {hasProducts ? 'No results' : 'No products yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
              {hasProducts
                ? 'Try adjusting your search or sort.'
                : 'Add a product to start tracking your stock and sales.'}
            </Text>
          </View>
        }
      />

      <ProductModal
        visible={isModalVisible}
        product={editingProduct}
        onClose={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
        }}
        onSave={(saved) => {
          handleSaveProduct(saved);
          setIsModalVisible(false);
          setEditingProduct(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  addBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    position: 'relative'
  },
  searchIcon: { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600'
  },
  controls: { marginBottom: 8, paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  rowTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  rowTitle: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  actionGroup: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowSub: { fontSize: 12, fontWeight: '600' },
  rowMeta: { fontSize: 12, fontWeight: '600' },
  stockSection: { gap: 8, marginTop: 4 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  microLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  qtyText: { fontSize: 22, fontWeight: '800' },
  qtyUnit: { fontSize: 12, fontWeight: '700' },
  progressBg: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden'
  },
  progressFill: { height: '100%', borderRadius: 999 },
  stockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  stockInfo: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  valueText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, marginVertical: 4 },
  finRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  finTile: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4
  },
  finLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  finValue: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginTop: 20
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 12, textAlign: 'center' }
});
