import { todayISO } from '../utils/dates.js';
import { round2 } from './money.js';
import {
  annualTotalsByCurrency,
  categoryTotalsByCurrency,
  monthlyTotalsByCurrency,
  mostExpensive,
} from './calculations.js';
import { buildRenewalBuckets } from './renewals.js';

function buildBudget(settings, monthlyByCurrency) {
  const limit = settings.monthly_budget;
  const configured = limit !== null && limit !== undefined;
  const currency = settings.budget_currency || settings.preferred_currency || 'USD';
  const monthlySpend =
    (monthlyByCurrency.find((row) => row.currency === currency) || { amount: 0 }).amount || 0;
  const roundedSpend = round2(monthlySpend);
  const roundedLimit = configured ? round2(Number(limit)) : 0;
  const remaining = configured ? round2(roundedLimit - roundedSpend) : 0;
  const usedPercent =
    configured && roundedLimit > 0
      ? Math.round((roundedSpend / roundedLimit) * 1000) / 10
      : 0;

  return {
    configured,
    currency,
    limit: roundedLimit,
    monthly_spend: roundedSpend,
    remaining,
    used_percent: usedPercent,
    over_budget: configured && remaining < 0,
  };
}

export function createDashboardService({
  subscriptionsService,
  settingsService,
  today = todayISO(),
}) {
  async function overview() {
    const [subscriptions, settings] = await Promise.all([
      subscriptionsService.listAll(),
      settingsService.get(),
    ]);

    const monthlyByCurrency = monthlyTotalsByCurrency(subscriptions);
    const annualByCurrency = annualTotalsByCurrency(subscriptions);
    const activeCount = subscriptions.filter((row) => row.status === 'active').length;
    const pausedCount = subscriptions.filter((row) => row.status === 'paused').length;
    const cancelledCount = subscriptions.filter((row) => row.status === 'cancelled').length;

    const recentlyCancelled = subscriptions
      .filter((row) => row.status === 'cancelled')
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));

    return {
      today,
      total_count: subscriptions.length,
      active_count: activeCount,
      paused_count: pausedCount,
      cancelled_count: cancelledCount,
      monthly_by_currency: monthlyByCurrency,
      annual_by_currency: annualByCurrency,
      categories_by_currency: categoryTotalsByCurrency(subscriptions),
      top_expensive: mostExpensive(subscriptions),
      upcoming: buildRenewalBuckets(subscriptions, today, settings.reminder_thresholds),
      recently_cancelled: recentlyCancelled,
      budget: buildBudget(settings, monthlyByCurrency),
      settings,
    };
  }

  return { overview };
}
