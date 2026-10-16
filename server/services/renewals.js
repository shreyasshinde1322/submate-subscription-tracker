import { daysUntil } from '../utils/dates.js';

// Renewal buckets only ever consider active subscriptions. Paused and
// cancelled subscriptions do not generate reminders.
export function decorateRenewal(subscription, today, thresholds = []) {
  const remaining = daysUntil(subscription.next_renewal_date, today);
  const thresholdsList = Array.isArray(thresholds) ? thresholds : [];
  const reminder =
    subscription.status === 'active' &&
    remaining >= 0 &&
    thresholdsList.some((threshold) => remaining <= threshold);

  return {
    id: subscription.id,
    service_name: subscription.service_name,
    service_key: subscription.service_key,
    logo_key: subscription.logo_key,
    category: subscription.category,
    plan_name: subscription.plan_name,
    price: subscription.price,
    currency_code: subscription.currency_code,
    billing_cycle: subscription.billing_cycle,
    next_renewal_date: subscription.next_renewal_date,
    status: subscription.status,
    daysUntil: remaining,
    dueToday: remaining === 0,
    overdue: remaining < 0,
    reminder,
  };
}

export function buildRenewalBuckets(subscriptions, today, thresholds = []) {
  const active = subscriptions.filter((subscription) => subscription.status === 'active');
  const items = active
    .map((subscription) => decorateRenewal(subscription, today, thresholds))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    today: items.filter((item) => item.daysUntil === 0),
    within7: items.filter((item) => item.daysUntil >= 0 && item.daysUntil <= 7),
    within30: items.filter((item) => item.daysUntil >= 0 && item.daysUntil <= 30),
    overdue: items.filter((item) => item.daysUntil < 0),
    reminders: items.filter((item) => item.reminder),
    all: items,
  };
}
