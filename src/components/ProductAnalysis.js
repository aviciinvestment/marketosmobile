import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaRound, formatNairaSigned, formatQty, formatDate } from '../utils/format';
import { productFinancials, stockOf, filterByPeriod, saleRevenue } from '../utils/finance';

export default function ProductAnalysis({ period = 'today', customStart = '', customEnd = '' }) {
  const { isDarkMode, products, sales } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const [expandedId, setExpandedId] = useState(null);

  const fSales = useMemo(
    () => filterByPeriod(sales || [], period, customStart, customEnd),
    [sales, period, customStart, customEnd]
  );

  const rows = useMemo(() => {
    const built = (products || []).map((p) => {
      const pSales = fSales.filter((s) => s.productId === p.id);
      const { moneyMade, goodsCost, profit } = productFinancials(p, pSales);
      const stock = stockOf(p, pSales);
      const breakEvenPct = goodsCost > 0 ? (moneyMade / goodsCost) * 100 : 0;
      const unitsSold = pSales.reduce((acc, s) => acc + (s.quantitySold || 0), 0);

      const byUnit = {};
      pSales.forEach((s) => {
        const key = s.unitName || 'Unit';
        if (!byUnit[key]) byUnit[key] = { unitName: key, revenue: 0, qty: 0 };
        byUnit[key].revenue += saleRevenue(s);
        byUnit[key].qty += s.quantitySold || 0;
      });
      const topUnit = Object.values(byUnit).sort((a, b) => b.revenue - a.revenue)[0] || null;

      const recentSales = [...pSales]
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 3);

      return { ...p, moneyMade, goodsCost, profit, stock, breakEvenPct, unitsSold, topUnit, recentSales };
    });
    return built.sort((a, b) => b.moneyMade - a.moneyMade);
  }, [products, fSales]);

  const statusFor = (row) => {
    const remaining = row.stock.remainingPercentage;
    const paidBack = row.moneyMade >= row.goodsCost;
    if (remaining <= 0) {
      return paidBack
        ? { label: 'Finished', color: theme.rose }
        : { label: 'Paying back', color: theme.amber };
    }
    if (remaining <= 10) return { label: 'Restock soon', color: theme.rose };
    if (remaining <= 25) return { label: 'Running low', color: theme.amber };
    return null;
  };

  if (!products || products.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Business Analysis</Text>
        <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
          Add a product and start selling to see its analysis here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconChip, { backgroundColor: `${theme.gold}1F`, borderColor: `${theme.gold}40` }]}>
          <Ionicons name="pie-chart-outline" size={16} color={theme.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>Product Financials</Text>
          <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>Performance breakdown per item</Text>
        </View>
      </View>

      {rows.map((row) => {
        const status = statusFor(row);
        const covered = row.moneyMade >= row.goodsCost;
        const fractionPct = Math.min(100, row.stock.fractionConsumed * 100);
        const expanded = expandedId === row.id;

        return (
          <TouchableOpacity
            key={row.id}
            activeOpacity={0.85}
            onPress={() => setExpandedId(expanded ? null : row.id)}
            style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowName, { color: theme.foreground }]} numberOfLines={1}>
                {row.name}
              </Text>
              {status && (
                <View
                  style={[
                    styles.tag,
                    { backgroundColor: `${status.color}15`, borderColor: `${status.color}40` }
                  ]}
                >
                  <Text style={[styles.tagText, { color: status.color }]}>{status.label}</Text>
                </View>
              )}
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.mutedForeground}
              />
            </View>

            <Text style={[styles.recovered, { color: theme.mutedForeground }]}>
              {formatNairaRound(row.moneyMade)} of {formatNairaRound(row.goodsCost)} recovered (
              {row.breakEvenPct.toFixed(0)}%)
            </Text>

            <View style={[styles.progressBg, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${fractionPct}%`,
                    backgroundColor: row.stock.fractionConsumed >= 1 ? theme.emerald : theme.amber
                  }
                ]}
              />
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Text style={[styles.metaLine, { color: theme.mutedForeground }]}>
                  {formatQty(row.stock.qtyRemaining)} {row.purchaseUnit || 'Units'} left
                </Text>
                <Text style={[styles.metaLine, { color: theme.mutedForeground }]}>
                  {formatQty(row.unitsSold)} sold
                  {row.topUnit
                    ? ` • Top: ${row.topUnit.unitName} (${formatNairaRound(row.topUnit.revenue)})`
                    : ''}
                </Text>
              </View>
              <View style={styles.metaRight}>
                <Text
                  style={[styles.profitText, { color: row.profit >= 0 ? theme.emerald : theme.rose }]}
                >
                  {formatNairaSigned(row.profit, 0)}
                </Text>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: covered ? `${theme.emerald}15` : `${theme.amber}15`,
                      borderColor: covered ? `${theme.emerald}40` : `${theme.amber}40`
                    }
                  ]}
                >
                  <Text style={[styles.tagText, { color: covered ? theme.emerald : theme.amber }]}>
                    {covered
                      ? 'Cost Covered ✓'
                      : `${formatNairaRound(Math.max(0, row.goodsCost - row.moneyMade))} to recover`}
                  </Text>
                </View>
              </View>
            </View>

            {expanded && (
              <View style={[styles.recentWrap, { borderTopColor: theme.border }]}>
                <Text style={[styles.recentTitle, { color: theme.foreground }]}>
                  Recent Sales of {row.name}
                </Text>
                {row.recentSales.length === 0 ? (
                  <Text style={[styles.recentEmpty, { color: theme.mutedForeground }]}>
                    No sales recorded for {row.name} in this period.
                  </Text>
                ) : (
                  row.recentSales.map((s, idx) => (
                    <View
                      key={s.id || idx}
                      style={[
                        styles.saleRow,
                        { backgroundColor: theme.card, borderColor: theme.border }
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.saleTitle, { color: theme.foreground }]} numberOfLines={1}>
                          {s.quantitySold} {s.unitName}
                          {s.quantitySold > 1 ? 's' : ''}
                          {s.sellingPricePerUnit
                            ? ` × ${formatNairaRound(s.sellingPricePerUnit)}`
                            : ''}
                        </Text>
                        <Text style={[styles.saleDate, { color: theme.mutedForeground }]}>
                          {s.timestamp ? formatDate(s.timestamp) : 'Recently'}
                        </Text>
                      </View>
                      <Text style={[styles.saleRevenue, { color: theme.emerald }]}>
                        +{formatNairaRound(saleRevenue(s))}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    gap: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rowName: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1
  },
  tagText: { fontSize: 10, fontWeight: '800' },
  recovered: { fontSize: 12, fontWeight: '700' },
  progressBg: {
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden'
  },
  progressFill: { height: '100%', borderRadius: 999 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8
  },
  metaLeft: { flex: 1, gap: 3 },
  metaRight: { alignItems: 'flex-end', gap: 6 },
  metaLine: { fontSize: 11, fontWeight: '700' },
  profitText: { fontSize: 15, fontWeight: '800' },
  recentWrap: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8
  },
  recentTitle: { fontSize: 13, fontWeight: '800' },
  recentEmpty: { fontSize: 12, fontWeight: '600' },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10
  },
  saleTitle: { fontSize: 13, fontWeight: '700' },
  saleDate: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  saleRevenue: { fontSize: 13, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyText: { fontSize: 12, textAlign: 'center' }
});
