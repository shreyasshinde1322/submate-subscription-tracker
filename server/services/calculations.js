import { round2 } from './money.js';

// Monthly-equivalent factors per billing cycle.
export const MONTHLY_FACTORS = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export const BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];

export function monthlyEquivalent(price, cycle) {
  const factor = MONTHLY_FACTORS[cycle];
  if (factor === undefined) {
    throw new Error(`Unsupported billing cycle: ${cycle}`);
  }
  return Number(price) * factor;
}

export function annualEquivalent(price, cycle) {
  return monthlyEquivalent(price, cycle) * 12;
}

export function isActive(subscription) {
  return subscription.status === 'active';
}

// Sums monthly-equivalent spend for active subscriptions, grouped by currency.
// Different currencies are never combined.
export function monthlyTotalsByCurrency(subscriptions) {
  const totals = new Map();
  for (const subscription of subscriptions) {
    if (!isActive(subscription)) continue;
    const currency = subscription.currency_code;
    const amount = monthlyEquivalent(subscription.price, subscription.billing_cycle);
    totals.set(currency, (totals.get(currency) || 0) + amount);
  }
  return [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount: round2(amount) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function annualTotalsByCurrency(subscriptions) {
  return monthlyTotalsByCurrency(subscriptions).map((entry) => ({
    currency: entry.currency,
    amount: round2(entry.amount * 12),
  }));
}

// Monthly-equivalent spend grouped by currency and category.
export function categoryTotalsByCurrency(subscriptions) {
  const byCurrency = new Map();
  for (const subscription of subscriptions) {
    if (!isActive(subscription)) continue;
    const currency = subscription.currency_code;
    if (!byCurrency.has(currency)) byCurrency.set(currency, new Map());
    const categories = byCurrency.get(currency);
    const amount = monthlyEquivalent(subscription.price, subscription.billing_cycle);
    categories.set(subscription.category, (categories.get(subscription.category) || 0) + amount);
  }

  return [...byCurrency.entries()].map(([currency, categories]) => {
    const rows = [...categories.entries()]
      .map(([category, amount]) => ({ category, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return {
      currency,
      total: round2(total),
      categories: rows.map((row) => ({
        ...row,
        share: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0,
      })),
    };
  });
}

// Monthly equivalent of active subscriptions sorted most expensive first.
export function mostExpensive(subscriptions, limit = 5) {
  return subscriptions
    .filter(isActive)
    .map((subscription) => ({
      id: subscription.id,
      service_name: subscription.service_name,
      category: subscription.category,
      currency_code: subscription.currency_code,
      billing_cycle: subscription.billing_cycle,
      price: subscription.price,
      monthly_equivalent: round2(
        monthlyEquivalent(subscription.price, subscription.billing_cycle),
      ),
    }))
    .sort((a, b) => b.monthly_equivalent - a.monthly_equivalent)
    .slice(0, limit);
}

// Generic billing-cycle comparison for a supplied price. Clearly illustrative
// when no real alternate plan prices are provided.
export function billingCycleComparison(price, currency) {
  return BILLING_CYCLES.map((cycle) => ({
    cycle,
    currency_code: currency,
    monthly_equivalent: round2(monthlyEquivalent(price, cycle)),
    annual_equivalent: round2(annualEquivalent(price, cycle)),
  }));
}
