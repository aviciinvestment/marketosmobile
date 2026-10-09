import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaRound, formatNumberRound, formatQty } from '../utils/format';
import {
  calculateFinancials,
  filterByPeriod,
  previousPeriodBounds,
  saleRevenue,
  stockOf
} from '../utils/finance';
import { useAppT, useAppTF } from '../i18n';

const PERIODS = ['today', 'week', 'month', 'year', 'custom', 'all'];

const isValidDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T00:00:00`).getTime());

export default function InsightsScreen() {
  const { isDarkMode, products, sales, expenses } = useSyncContext();
  const theme = getTheme(isDarkMode);
  const t = useAppT();
  const tf = useAppTF();

  const [period, setPeriod] = useState('today');
  const [startText, setStartText] = useState('');
  const [endText, setEndText] = useState('');

  const customActive = isValidDate(startText) && isValidDate(endText);
  const customStart = customActive ? startText : '';
  const customEnd = customActive ? endText : '';

  const fSales = useMemo(
    () => filterByPeriod(sales, period, customStart, customEnd),
    [sales, period, customStart, customEnd]
  );
  const fExpenses = useMemo(
    () => filterByPeriod(expenses, period, customStart, customEnd, (r) => r.date),
    [expenses, period, customStart, customEnd]
  );

  const fin = useMemo(
    () => calculateFinancials(fSales, fExpenses, products),
    [fSales, fExpenses, products]
  );
  const moneyMade = fin.totalSales;
  const profit = fin.netProfit;
  const moneySpent = fin.totalExpenses;

  const prevBounds = useMemo(
    () => previousPeriodBounds(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  const prevSales = useMemo(() => {
    if (!prevBounds.start || !prevBounds.end) return [];
    const start = prevBounds.start.getTime();
    const end = prevBounds.end.getTime();
    return (sales || []).filter((sale) => {
      const ts = new Date(sale.timestamp || sale.date || sale.createdAt).getTime();
      return !isNaN(ts) && ts >= start && ts <= end;
    });
  }, [sales, prevBounds]);
  const prevFin = useMemo(() => calculateFinancials(prevSales, [], products), [prevSales, products]);

  const stockTotals = useMemo(() => {
    let value = 0;
    let count = 0;
    (products || []).forEach((p) => {
      const s = stockOf(p, sales);
      value += s.remainingValue || 0;
      count += s.qtyRemaining || 0;
    });
    return { value, count };
  }, [products, sales]);

  const periodLabel =
    period === 'all'
      ? 'All time'
      : period === 'today'
      ? 'Today'
      : period === 'custom'
      ? 'Selected custom period'
      : `This ${period}`;

  let greeting = t('dash.doingWell');
  if (moneyMade === 0) greeting = t('dash.welcome');
  else if (profit > 0) greeting = t('dash.great');
  else if (profit < 0) greeting = t('dash.loss');

  let headline = '';
  if (fSales.length === 0 && prevSales.length === 0) {
    headline = tf('narrative.noneYet', periodLabel.toLowerCase());
  } else if (prevSales.length === 0 || period === 'all') {
    headline = tf('narrative.summary', periodLabel.toLowerCase(), formatNumberRound(profit), formatNumberRound(moneyMade));
  } else {
    const revDiff = moneyMade - prevFin.totalSales;
    const profitDiff = profit - prevFin.netProfit;
    if (revDiff > 0 && profitDiff > 0) {
      headline = tf('narrative.growing', formatNumberRound(revDiff), formatNumberRound(profitDiff));
    } else if (revDiff > 0 && profitDiff <= 0) {
      headline = t('narrative.salesUp');
    } else if (revDiff < 0 && profitDiff < 0) {
      headline = tf('narrative.down', formatNumberRound(Math.abs(revDiff)));
    } else if (revDiff < 0 && profitDiff >= 0) {
      headline = t('narrative.fewerBetter');
    } else {
      headline = t('narrative.flat');
    }
  }

  const byRevenue = useMemo(
    () =>
      (products || [])
        .map((p) => {
          const pSales = fSales.filter((s) => s.productId === p.id);
          const rev = pSales.reduce((acc, s) => acc + saleRevenue(s), 0);
          const qty = pSales.reduce((acc, s) => acc + (s.quantitySold || 0), 0);
          return { id: p.id, name: p.name, rev, qty };
        })
        .sort((a, b) => b.rev - a.rev)
        .filter((p) => p.rev > 0)
        .slice(0, 3),
    [products, fSales]
  );
  const maxRev = byRevenue[0]?.rev || 0;

  const productStats = (products || []).map((p) => {
    const pSales = fSales.filter((s) => s.productId === p.id);
    const rev = pSales.reduce((acc, s) => acc + saleRevenue(s), 0);
    const cost = p.purchasePrice || 0;
    const qty = pSales.reduce((acc, s) => acc + (s.quantitySold || 0), 0);
    const breakEvenPct = cost > 0 ? Math.min(100, (rev / cost) * 100) : 0;
    const { remainingPercentage } = stockOf(p, sales);
    return { ...p, rev, profit: rev - cost, qty, cost, breakEvenPct, remainingPercentage };
  });

  const slowPayback = productStats.filter((p) => p.qty > 0 && p.profit < 0);
  const notSelling = productStats.filter((p) => p.qty === 0);
  const runningLow = productStats.filter((p) => p.remainingPercentage <= 25 && p.remainingPercentage > 0);
  const nothingToWatch = slowPayback.length === 0 && notSelling.length === 0 && runningLow.length === 0;

  const numberTiles = [
    {
      key: 'moneyGot',
      label: t('report.moneyGot'),
      hint: t('report.moneyGotHint'),
      icon: 'wallet-outline',
      tone: theme.emerald,
      value: formatNairaRound(moneyMade),
      valueColor: theme.foreground
    },
    {
      key: 'profit',
      label: t('report.yourProfit'),
      hint: t('report.yourProfitHint'),
      icon: 'trending-up',
      tone: profit < 0 ? theme.rose : theme.emerald,
      value: `${profit < 0 ? '-' : ''}${formatNairaRound(Math.abs(profit))}`,
      valueColor: profit < 0 ? theme.rose : theme.emerald
    },
    {
      key: 'moneySpent',
      label: t('report.moneySpent'),
      hint: t('report.moneySpentHint'),
      icon: 'bag-handle-outline',
      tone: theme.amber,
      value: formatNairaRound(moneySpent),
      valueColor: theme.foreground
    },
    {
      key: 'stockWorth',
      label: t('report.stockWorth'),
      hint: stockTotals.count > 0 ? `≈ ${formatNairaRound(stockTotals.value)}` : t('report.stockWorthHint'),
      icon: 'cube-outline',
      tone: theme.sky,
      value: stockTotals.count > 0 ? formatQty(stockTotals.count) : '—',
      valueColor: theme.foreground
    }
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Time period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => {
          const selected = period === p;
          const label =
            p === 'all'
              ? t('period.all')
              : p === 'today'
              ? t('period.today')
              : p === 'custom'
              ? t('period.custom')
              : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`;
          return (
            <TouchableOpacity
              key={p}
              activeOpacity={0.85}
              onPress={() => setPeriod(p)}
              style={[
                styles.periodChip,
                {
                  backgroundColor: selected ? theme.primary : theme.card,
                  borderColor: selected ? theme.primary : theme.border
                }
              ]}
            >
              <Text style={[styles.periodChipText, { color: selected ? '#000' : theme.mutedForeground }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {period === 'custom' && (
        <View style={[styles.customRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.customLabel, { color: theme.mutedForeground }]}>{t('dashboard.from')}</Text>
          <TextInput
            value={startText}
            onChangeText={setStartText}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
            style={[
              styles.dateInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
            ]}
          />
          <Text style={[styles.customLabel, { color: theme.mutedForeground }]}>{t('dashboard.to')}</Text>
          <TextInput
            value={endText}
            onChangeText={setEndText}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.mutedForeground}
            autoCapitalize="none"
            style={[
              styles.dateInput,
              { backgroundColor: theme.surface, borderColor: theme.border, color: theme.foreground }
            ]}
          />
        </View>
      )}

      {/* Main report card */}
      <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View
          style={[
            styles.statusChip,
            { backgroundColor: `${theme.primary}26`, borderColor: `${theme.primary}4D` }
          ]}
        >
          <Ionicons name="bar-chart" size={13} color={theme.gold} />
          <Text style={[styles.statusChipText, { color: theme.gold }]}>{t('report.statusChip')}</Text>
        </View>

        <Text style={[styles.reportTitle, { color: theme.foreground }]}>{t('report.title')}</Text>
        <Text style={[styles.reportGreeting, { color: theme.foreground }]}>{greeting}</Text>

        {!!headline && (
          <View style={[styles.headlineBox, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
            <Text style={[styles.headlineText, { color: theme.foreground }]}>{headline}</Text>
          </View>
        )}

        <View style={styles.tileGrid}>
          {numberTiles.map((tile) => (
            <View
              key={tile.key}
              style={[
                styles.tile,
                { backgroundColor: `${tile.tone}1A`, borderColor: `${tile.tone}33` }
              ]}
            >
              <View style={styles.tileTop}>
                <View
                  style={[
                    styles.tileIcon,
                    { backgroundColor: `${tile.tone}26`, borderColor: `${tile.tone}33` }
                  ]}
                >
                  <Ionicons name={tile.icon} size={16} color={tile.tone} />
                </View>
                <Text style={[styles.tileLabel, { color: tile.tone }]} numberOfLines={2}>
                  {tile.label}
                </Text>
              </View>
              <Text
                style={[styles.tileValue, { color: tile.valueColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {tile.value}
              </Text>
              <Text style={[styles.tileHint, { color: theme.mutedForeground }]} numberOfLines={2}>
                {tile.hint}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* What sells best */}
      {byRevenue.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="trending-up" size={20} color={theme.emerald} />
            <Text style={[styles.cardTitle, { color: theme.foreground }]}>{t('report.bestSellers')}</Text>
          </View>
          <Text style={[styles.cardSub, { color: theme.mutedForeground }]}>{t('report.bestSellersHint')}</Text>
          <View style={{ gap: 12, marginTop: 4 }}>
            {byRevenue.map((p, i) => {
              const width = maxRev > 0 ? Math.max(12, (p.rev / maxRev) * 100) : 12;
              return (
                <View
                  key={p.id}
                  style={[styles.bestRow, { backgroundColor: theme.surface + '4D', borderColor: theme.border }]}
                >
                  <View style={styles.bestMeta}>
                    <View style={[styles.bestRank, { backgroundColor: theme.primary }]}>
                      <Text style={styles.bestRankText}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.bestName, { color: theme.foreground }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.bestRev, { color: theme.gold }]}>{formatNairaRound(p.rev)}</Text>
                  </View>
                  <View style={[styles.barBg, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={[styles.barFill, { width: `${width}%`, backgroundColor: theme.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.centerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: `${theme.emerald}1A`, borderColor: `${theme.emerald}33` }
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={theme.emerald} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>{t('report.noSalesTitle')}</Text>
          <Text style={[styles.cardSub, { color: theme.mutedForeground }]}>{t('report.noSalesDesc')}</Text>
        </View>
      )}

      {/* Things you should watch */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="warning-outline" size={20} color={theme.gold} />
          <Text style={[styles.cardTitle, { color: theme.foreground }]}>{t('report.attention')}</Text>
        </View>

        {nothingToWatch ? (
          <View
            style={[
              styles.attentionRow,
              { backgroundColor: `${theme.emerald}1A`, borderColor: `${theme.emerald}33` }
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={theme.emerald} style={{ marginTop: 1 }} />
            <Text style={[styles.attentionText, { color: theme.foreground }]}>{t('report.allGood')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 4 }}>
            {runningLow.length > 0 && (
              <View style={[styles.attentionRow, { backgroundColor: `${theme.rose}1A`, borderColor: `${theme.rose}33` }]}>
                <View style={[styles.attentionDot, { backgroundColor: theme.rose }]} />
                <Text style={[styles.attentionText, { color: theme.foreground }]}>
                  {tf(
                    'narrative.runningLow',
                    runningLow.length > 1
                      ? tf('narrative.runningLowOther', runningLow[0].name, runningLow.length - 1)
                      : runningLow[0].name
                  )}
                </Text>
              </View>
            )}

            {slowPayback.length > 0 && (
              <View style={[styles.attentionRow, { backgroundColor: `${theme.amber}1A`, borderColor: `${theme.amber}33` }]}>
                <View style={[styles.attentionDot, { backgroundColor: theme.amber }]} />
                <Text style={[styles.attentionText, { color: theme.foreground }]}>
                  {tf(
                    'narrative.highSalesLowProfit',
                    slowPayback[0].name,
                    formatNumberRound(slowPayback[0].rev),
                    formatNumberRound(slowPayback[0].cost),
                    slowPayback[0].breakEvenPct.toFixed(0)
                  )}
                </Text>
              </View>
            )}

            {notSelling.length > 0 && fSales.length > 0 && (
              <View style={[styles.attentionRow, { backgroundColor: theme.surface + '80', borderColor: theme.border }]}>
                <View style={[styles.attentionDot, { backgroundColor: theme.mutedForeground }]} />
                <Text style={[styles.attentionText, { color: theme.foreground }]}>
                  {tf('narrative.notSelling', notSelling.length, notSelling[0].name)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1
  },
  periodChipText: { fontSize: 12, fontWeight: '800' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14
  },
  customLabel: { fontSize: 11, fontWeight: '800' },
  dateInput: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700'
  },
  reportCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    gap: 10
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1
  },
  statusChipText: { fontSize: 11, fontWeight: '800' },
  reportTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  reportGreeting: { fontSize: 16, fontWeight: '800' },
  headlineBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 2
  },
  headlineText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tileLabel: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  tileValue: { fontSize: 20, fontWeight: '900' },
  tileHint: { fontSize: 10, fontWeight: '600', lineHeight: 14 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16
  },
  centerCard: { alignItems: 'center', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  cardSub: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bestRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10
  },
  bestMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bestRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bestRankText: { fontSize: 10, fontWeight: '900', color: '#000' },
  bestName: { flex: 1, fontSize: 14, fontWeight: '700' },
  bestRev: { fontSize: 14, fontWeight: '800' },
  barBg: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden'
  },
  barFill: { height: '100%', borderRadius: 999 },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14
  },
  attentionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  attentionText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 }
});
