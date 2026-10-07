// Port of web/src/utils/finance.ts — MUST stay in sync with the web app.

/** Revenue a single sale contributed (supports legacy `amount`). */
export function saleRevenue(sale) {
  return sale?.totalRevenue || sale?.amount || 0;
}

/**
 * Consolidated financial summary for any set of sales, expenses and products.
 * Same "payback / break-even" model as the web:
 *   Money Made   = sum of customer revenue
 *   Goods Cost   = purchase price of every product that appears in these sales
 *   Gross Profit = Money Made - Goods Cost
 *   Expenses     = sum of business spending
 *   Net Profit   = Gross Profit - Expenses
 */
export function calculateFinancials(sales = [], expenses = [], products = []) {
  const totalSales = (sales || []).reduce((acc, sale) => acc + saleRevenue(sale), 0);

  const soldProductIds = new Set(
    (sales || []).filter((sale) => saleRevenue(sale) > 0 && sale.productId).map((sale) => sale.productId)
  );
  const totalGoodsCost = (products || []).reduce(
    (acc, product) => (soldProductIds.has(product.id) ? acc + (product.purchasePrice || 0) : acc),
    0
  );

  const grossProfit = totalSales - totalGoodsCost;
  const totalExpenses = (expenses || []).reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  return { totalSales, totalGoodsCost, grossProfit, totalExpenses, netProfit };
}

/** Payback numbers for one product: money made vs what it cost. */
export function productFinancials(product, sales = []) {
  const moneyMade = (sales || [])
    .filter((sale) => sale.productId === product.id)
    .reduce((acc, sale) => acc + saleRevenue(sale), 0);
  const goodsCost = product.purchasePrice || 0;
  return { moneyMade, goodsCost, profit: moneyMade - goodsCost };
}

/** A product has truly "finished" once the money made covers its purchase cost. */
export function isPaidBack(product, sales = []) {
  const { moneyMade, goodsCost } = productFinancials(product, sales);
  return moneyMade >= goodsCost;
}

/**
 * Stock picture derived from money made vs purchase cost: stock reduces a
 * fraction at a time as the cost is recouped and is exhausted once fully paid back.
 */
export function stockOf(product, sales = []) {
  const { moneyMade, goodsCost } = productFinancials(product, sales);
  const fractionConsumed = goodsCost > 0 ? Math.min(1, moneyMade / goodsCost) : 0;
  const quantity = product.quantityPurchased || 0;
  return {
    moneyMade,
    goodsCost,
    fractionConsumed,
    qtySold: quantity * fractionConsumed,
    qtyRemaining: Math.max(0, quantity * (1 - fractionConsumed)),
    remainingPercentage: Math.max(0, (1 - fractionConsumed) * 100),
    remainingValue: Math.max(0, goodsCost * (1 - fractionConsumed)),
  };
}

/** Filter records down to a time period. `period` in today|week|month|year|all|custom. */
export function filterByPeriod(records, period, customStart, customEnd, dateAccessor) {
  const get = dateAccessor || ((r) => r.timestamp || r.date || r.createdAt);
  if (!period || period === 'all') return records;
  const now = new Date();
  let start = null;
  let end = null;
  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    const day = (now.getDay() + 6) % 7; // Monday start
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'custom') {
    if (customStart) start = new Date(customStart + 'T00:00:00');
    if (customEnd) end = new Date(customEnd + 'T23:59:59.999');
  }
  return (records || []).filter((r) => {
    const t = new Date(get(r)).getTime();
    if (isNaN(t)) return false;
    if (start && t < start.getTime()) return false;
    if (end && t > end.getTime()) return false;
    return true;
  });
}

/** Previous window of the same length, used for period-over-period comparisons. */
export function previousPeriodBounds(period, customStart, customEnd) {
  const now = new Date();
  let start = null;
  let end = null;
  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (period === 'week') {
    const day = (now.getDay() + 6) % 7;
    const thisStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    end = new Date(thisStart.getTime() - 1);
    start = new Date(thisStart.getTime() - 7 * 86400000);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom') {
    if (customStart && customEnd) {
      const s = new Date(customStart + 'T00:00:00').getTime();
      const e = new Date(customEnd + 'T23:59:59.999').getTime();
      if (!isNaN(s) && !isNaN(e)) {
        const span = e - s + 1;
        start = new Date(s - span);
        end = new Date(s - 1);
      }
    }
  }
  return { start, end };
}
