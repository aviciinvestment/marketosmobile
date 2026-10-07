import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncContext } from '../hooks/SyncContext';
import { getTheme } from '../utils/theme';
import { formatNairaRound, formatNairaSigned, formatQty } from '../utils/format';
import {
  calculateFinancials,
  filterByPeriod,
  previousPeriodBounds,
  saleRevenue,
  stockOf,
  isPaidBack
} from '../utils/finance';
import ProductAnalysis from '../components/ProductAnalysis';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' }
];

const isValidDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T00:00:00`).getTime());

export default function InsightsScreen() {
  const { isDarkMode, products, sales, expenses } = useSyncContext();
  const theme = getTheme(isDarkMode);

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

  const { totalSales, grossProfit, totalExpenses, netProfit } = useMemo(
    () => calculateFinancials(fSales, fExpenses, products),
    [fSales, fExpenses, products]
  );

  const bestProduct = useMemo(() => {
    const perf = {};
    fSales.forEach((sale) => {
      if (!sale.productId) return;
      if (!perf[sale.productId]) perf[sale.productId] = { revenue: 0, qty: 0, name: sale.productName };
      perf[sale.productId].revenue += saleRevenue(sale);
      perf[sale.productId].qty += sale.quantitySold || 0;
    });
    return Object.values(perf).sort((a, b) => b.revenue - a.revenue)[0] || null;
  }, [fSales]);

  const lowStockProducts = useMemo(
    () =>
      (products || []).filter((p) => {
        const { remainingPercentage } = stockOf(p, sales);
        return remainingPercentage <= 25 && remainingPercentage > 0;
      }),
    [products, sales]
  );

  const finishedProducts = useMemo(
    () => (products || []).filter((p) => (p.purchasePrice || 0) > 0 && isPaidBack(p, sales)),
    [products, sales]
  );

  const chartData = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push({
        key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        total: 0
      });
    }
    const index = {};
    days.forEach((d, i) => {
      index[d.key] = i;
    });
    (sales || []).forEach((sale) => {
      const date = new Date(sale.timestamp || sale.date || sale.createdAt);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (index[key] !== undefined) days[index[key]].total += saleRevenue(sale);
    });
    const max = Math.max(...days.map((d) => d.total), 1);
    return days.map((d) => ({ ...d, pct: (d.total / max) * 100 }));
  }, [sales]);
  const hasChartData = chartData.some((d) => d.total > 0);

  let greetingMsg = 'Here is how your business is doing.';
  if (netProfit > 0) {
    greetingMsg = "You're doing great! Your business is making money.";
  } else if (netProfit < 0) {
    greetingMsg = "You're running at a loss currently. Keep an eye on expenses.";
  } else if (totalSales === 0) {
    greetingMsg = 'Welcome! Ready to record your sales and expenses.';
  }

  let financialStory = `In this period, you have brought in ${formatNairaRound(totalSales)} from sales. `;
  if (grossProfit > 0) {
    financialStory += `After covering the cost of goods sold, you made ${formatNairaRound(grossProfit)} from your products. `;
  }
  if (totalExpenses > 0) {
    financialStory += `You spent ${formatNairaRound(totalExpenses)} on business costs (like transportation or shop upkeep). `;
  }
  if (netProfit > 0) {
    financialStory += `That leaves you with ${formatNairaRound(netProfit)} in clean profit to take home!`;
  } else if (netProfit < 0) {
    financialStory += `Currently, your spending exceeds your earnings by ${formatNairaRound(Math.abs(netProfit))}.`;
  }

  const productMsg =
    bestProduct && bestProduct.revenue > 0
      ? `${bestProduct.name} is your top seller right now (${formatNairaRound(bestProduct.revenue)}).`
      : '';

  let stockMsg = '';
  if (finishedProducts.length > 0) {
    stockMsg = `${finishedProducts.length} product(s) are completely finished.`;
  } else if (lowStockProducts.length > 0) {
    stockMsg = `${lowStockProducts.length} product(s) are running low.`;
  } else if (products.length > 0) {
    stockMsg = 'Your stock levels are looking healthy.';
  }

  const periodLabel =
    period === 'all'
      ? 'All time'
      : period === 'today'
      ? 'Today'
      : period === 'custom'
      ? 'Selected custom period'
      : `This ${period}`;

  const prevBounds = useMemo(
    () => previousPeriodBounds(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  const prevSales = useMemo(() => {
    if (!prevBounds.start || !prevBounds.end) return [];
    const start = prevBounds.start.getTime();
    const end = prevBounds.end.getTime();
    return (sales || []).filter((sale) => {
      const t = new Date(sale.timestamp || sale.date || sale.createdAt).getTime();
      return !isNaN(t) && t >= start && t <= end;
    });
  }, [sales, prevBounds]);
  const prevFin = useMemo(() => calculateFinancials(prevSales, [], products), [prevSales, products]);

  const insights = [];
  const pushInsight = (icon, tone, text) => insights.push({ icon, tone, text });

  if (fSales.length === 0 && prevSales.length === 0) {
    pushInsight(
      'bar-chart-outline',
      'gold',
      `You haven't recorded any sales yet for ${periodLabel.toLowerCase()}. Start recording sales to see insights.`
    );
  } else if (prevSales.length === 0 || period === 'all') {
    pushInsight(
      'stats-chart',
      'gold',
      `For ${periodLabel.toLowerCase()}, you recorded ${formatNairaRound(grossProfit)} in gross profit from ${formatNairaRound(totalSales)} in total sales.`
    );
  } else {
    const revDiff = totalSales - prevFin.totalSales;
    const profitDiff = grossProfit - prevFin.grossProfit;
    if (revDiff > 0 && profitDiff > 0) {
      pushInsight(
        'trending-up',
        'emerald',
        `Your business is growing. Your sales increased by ${formatNairaRound(revDiff)}, and your gross profit also went up by ${formatNairaRound(profitDiff)} compared to the previous period.`
      );
    } else if (revDiff > 0 && profitDiff <= 0) {
      pushInsight(
        'trending-up',
        'amber',
        'Your sales increased, but your gross profit did not. You sold more, but the items you sold had lower profit margins than before.'
      );
    } else if (revDiff < 0 && profitDiff < 0) {
      pushInsight(
        'trending-down',
        'rose',
        `Your sales and gross profit are lower than the previous period. You made ${formatNairaRound(Math.abs(revDiff))} less in revenue.`
      );
    } else if (revDiff < 0 && profitDiff >= 0) {
      pushInsight(
        'trending-up',
        'emerald',
        'You made fewer sales, but your gross profit actually went up! This means you sold items with much better profit margins.'
      );
    } else {
      pushInsight(
        'swap-horizontal',
        'muted',
        'Your business performance remained roughly the same as the previous period.'
      );
    }
  }

  const productStats = (products || []).map((p) => {
    const pSales = fSales.filter((s) => s.productId === p.id);
    const rev = pSales.reduce((acc, s) => acc + saleRevenue(s), 0);
    const cost = p.purchasePrice || 0;
    const profit = pSales.length > 0 ? rev - cost : 0;
    const qty = pSales.reduce((acc, s) => acc + (s.quantitySold || 0), 0);
    const breakEvenPct = cost > 0 ? Math.min(100, (rev / cost) * 100) : 0;
    const { remainingPercentage } = stockOf(p, sales);
    return { ...p, rev, profit, qty, cost, breakEvenPct, remainingPercentage };
  });

  const byProfit = [...productStats].sort((a, b) => b.profit - a.profit);
  const byQty = [...productStats].sort((a, b) => b.qty - a.qty);
  const mostProfitProduct = byProfit[0] && byProfit[0].profit > 0 ? byProfit[0] : null;
  const highestQtyProduct = byQty[0] && byQty[0].qty > 0 ? byQty[0] : null;
  const notSelling = productStats.filter((p) => p.qty === 0);
  const runningLow = productStats.filter((p) => p.remainingPercentage <= 25 && p.remainingPercentage > 0);
  const highSalesLowProfit = productStats.filter((p) => p.qty > 0 && p.profit < 0);

  if (mostProfitProduct) {
    pushInsight(
      'ribbon-outline',
      'emerald',
      `${mostProfitProduct.name} generated the most gross profit (${formatNairaRound(mostProfitProduct.profit)}).`
    );
  }
  if (highestQtyProduct && (!mostProfitProduct || highestQtyProduct.id !== mostProfitProduct.id)) {
    pushInsight(
      'basket-outline',
      'gold',
      `${highestQtyProduct.name} was your most popular item by volume, selling ${formatQty(highestQtyProduct.qty)} units.`
    );
  }
  if (highSalesLowProfit.length > 0) {
    const h = highSalesLowProfit[0];
    pushInsight(
      'alert-circle',
      'amber',
      `You are selling a lot of ${h.name}, but you haven't earned back what it cost you yet — ${formatNairaRound(h.rev)} made of the ${formatNairaRound(h.cost)} spent (${h.breakEvenPct.toFixed(0)}% recovered). Keep selling to break even.`
    );
  }
  if (notSelling.length > 0 && fSales.length > 0) {
    pushInsight(
      'moon-outline',
      'muted',
      `${notSelling.length} product(s) did not sell at all during this period, including ${notSelling[0].name}.`
    );
  }
  if (runningLow.length > 0) {
    pushInsight(
      'warning-outline',
      'rose',
      `${runningLow[0].name}${
        runningLow.length > 1 ? ` and ${runningLow.length - 1} other product(s)` : ''
      } are running low on stock. Restock soon so you don't miss out on sales!`
    );
  }
  if (totalSales > 0 && totalExpenses >= totalSales) {
    pushInsight(
      'alert',
      'rose',
      `Your expenses (${formatNairaRound(totalExpenses)}) have matched or passed everything you made (${formatNairaRound(totalSales)}). Trim costs before you run dry.`
    );
  } else if (totalExpenses > 0 && totalExpenses >= grossProfit) {
    pushInsight(
      'alert',
      'amber',
      `You spent ${formatNairaRound(totalExpenses)} while your products only made ${formatNairaRound(grossProfit)}. Watch your spending.`
    );
  }

  const toneColors = {
    gold: theme.gold,
    emerald: theme.emerald,
    amber: theme.amber,
    rose: theme.rose,
    sky: theme.sky,
    muted: theme.mutedForeground
  };

  const kpis = [
    {
      label: 'Money In',
      icon: 'cash-outline',
      color: theme.emerald,
      value: formatNairaRound(totalSales),
      valueColor: theme.emerald,
      caption: 'All customer cash collected'
    },
    {
      label: 'Gross Profit',
      icon: 'trending-up',
      color: grossProfit >= 0 ? theme.emerald : theme.rose,
      value: formatNairaRound(grossProfit),
      valueColor: grossProfit >= 0 ? theme.emerald : theme.rose,
      caption: 'Revenue minus cost of items sold'
    },
    {
      label: 'Expenses',
      icon: 'wallet-outline',
      color: theme.amber,
      value: formatNairaRound(totalExpenses),
      valueColor: theme.amber,
      caption: 'Power, transit, rent & operations'
    },
    {
      label: 'Net Profit',
      icon: 'wallet',
      color: netProfit >= 0 ? theme.emerald : theme.rose,
      value: formatNairaSigned(netProfit, 0),
      valueColor: netProfit >= 0 ? theme.emerald : theme.rose,
      caption: 'Gross profit minus expenses'
    }
  ];

  const renderKpi = (kpi) => (
    <View
      key={kpi.label}
      style={[styles.kpiCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.kpiTop}>
        <View
          style={[
            styles.kpiIcon,
            { backgroundColor: `${kpi.color}1F`, borderColor: `${kpi.color}40` }
          ]}
        >
          <Ionicons name={kpi.icon} size={16} color={kpi.color} />
        </View>
        <Text style={[styles.microLabel, { color: theme.mutedForeground }]}>{kpi.label}</Text>
      </View>
      <Text
        style={[styles.kpiValue, { color: kpi.valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {kpi.value}
      </Text>
      <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
      <Text style={[styles.kpiCaption, { color: theme.mutedForeground }]}>{kpi.caption}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: theme.foreground }]}>Insights & Analytics</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {PERIODS.map((p) => {
          const selected = period === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.85}
              onPress={() => setPeriod(p.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.card,
                  borderColor: selected ? theme.primary : theme.border
                }
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#000' : theme.mutedForeground }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {period === 'custom' && (
        <View style={[styles.customRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.customLabel, { color: theme.mutedForeground }]}>From</Text>
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
          <Text style={[styles.customLabel, { color: theme.mutedForeground }]}>To</Text>
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

      <View style={styles.kpiRow}>
        {renderKpi(kpis[0])}
        {renderKpi(kpis[1])}
      </View>
      <View style={styles.kpiRow}>
        {renderKpi(kpis[2])}
        {renderKpi(kpis[3])}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View
          style={[
            styles.storyBadge,
            { backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}40` }
          ]}
        >
          <View style={[styles.storyDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.storyBadgeText, { color: theme.gold }]}>Business Summary</Text>
        </View>
        <Text style={[styles.storyGreeting, { color: theme.foreground }]}>{greetingMsg}</Text>
        <Text style={[styles.storyText, { color: theme.mutedForeground }]}>{financialStory}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.kpiTop}>
          <View
            style={[styles.kpiIcon, { backgroundColor: `${theme.emerald}1F`, borderColor: `${theme.emerald}40` }]}
          >
            <Ionicons name="trophy-outline" size={16} color={theme.emerald} />
          </View>
          <Text style={[styles.microLabel, { color: theme.mutedForeground }]}>BEST SELLER</Text>
        </View>
        {bestProduct && bestProduct.revenue > 0 ? (
          <React.Fragment>
            <Text style={[styles.bestName, { color: theme.foreground }]}>{productMsg}</Text>
            <Text style={[styles.cardCaption, { color: theme.mutedForeground }]}>
              Sold {formatQty(bestProduct.qty)} units {periodLabel.toLowerCase()}.
            </Text>
          </React.Fragment>
        ) : (
          <Text style={[styles.cardCaption, { color: theme.mutedForeground }]}>
            No sales recorded for {periodLabel.toLowerCase()} yet.
          </Text>
        )}
      </View>

      {products.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.kpiTop}>
            <View
              style={[styles.kpiIcon, { backgroundColor: `${theme.amber}1F`, borderColor: `${theme.amber}40` }]}
            >
              <Ionicons name="alert-circle-outline" size={16} color={theme.amber} />
            </View>
            <Text style={[styles.microLabel, { color: theme.mutedForeground }]}>STOCK WATCH</Text>
          </View>
          <Text style={[styles.stockSummary, { color: theme.foreground }]}>{stockMsg}</Text>

          {finishedProducts.map((p) => (
            <View key={`done-${p.id}`} style={styles.stockLine}>
              <Ionicons name="checkmark-circle" size={15} color={theme.emerald} />
              <Text style={[styles.stockLineText, { color: theme.foreground }]}>
                {p.name} is fully paid back.
              </Text>
            </View>
          ))}
          {lowStockProducts.map((p) => {
            const { remainingPercentage } = stockOf(p, sales);
            return (
              <View key={`low-${p.id}`} style={styles.stockLine}>
                <Ionicons name="warning-outline" size={15} color={theme.amber} />
                <Text style={[styles.stockLineText, { color: theme.foreground }]}>
                  {p.name} — {remainingPercentage.toFixed(0)}% stock left.
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {hasChartData && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Revenue Trend (Last 7 Days)
          </Text>
          <View style={styles.chartContainer}>
            {chartData.map((day) => (
              <View key={day.key} style={styles.barCol}>
                <View style={[styles.barBg, { backgroundColor: theme.surface }]}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${day.pct}%`, backgroundColor: theme.primary }
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: theme.mutedForeground }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View
          style={[
            styles.storyBadge,
            { backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}40` }
          ]}
        >
          <Ionicons name="stats-chart" size={13} color={theme.gold} />
          <Text style={[styles.storyBadgeText, { color: theme.gold }]}>Performance Intel</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Executive Insights</Text>
        <Text style={[styles.periodLabel, { color: theme.mutedForeground }]}>{periodLabel}</Text>

        <View style={{ gap: 10, marginTop: 6 }}>
          {insights.map((item, idx) => {
            const color = toneColors[item.tone] || theme.gold;
            return (
              <View
                key={idx}
                style={[
                  styles.insightRow,
                  { backgroundColor: theme.surface, borderColor: theme.border }
                ]}
              >
                <View
                  style={[
                    styles.insightIcon,
                    { backgroundColor: `${color}1F`, borderColor: `${color}40` }
                  ]}
                >
                  <Ionicons name={item.icon} size={14} color={color} />
                </View>
                <Text style={[styles.insightText, { color: theme.foreground }]}>{item.text}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <ProductAnalysis period={period} customStart={customStart} customEnd={customEnd} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  chipRow: { gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1
  },
  chipText: { fontSize: 13, fontWeight: '800' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14
  },
  customLabel: { fontSize: 11, fontWeight: '800' },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700'
  },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  microLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1, textAlign: 'right' },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiDivider: { height: 1, marginTop: 10, marginBottom: 8 },
  kpiCaption: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    gap: 8
  },
  storyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1
  },
  storyDot: { width: 6, height: 6, borderRadius: 3 },
  storyBadgeText: { fontSize: 11, fontWeight: '800' },
  storyGreeting: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  storyText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  bestName: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  cardCaption: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  stockSummary: { fontSize: 14, fontWeight: '800' },
  stockLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockLineText: { fontSize: 12, fontWeight: '700', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  periodLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
    paddingTop: 8
  },
  barCol: { alignItems: 'center', flex: 1 },
  barBg: {
    width: 14,
    height: 120,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden'
  },
  barFill: { width: '100%', borderRadius: 7 },
  barLabel: { fontSize: 9, fontWeight: '700', marginTop: 6 },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12
  },
  insightIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  insightText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 }
});
