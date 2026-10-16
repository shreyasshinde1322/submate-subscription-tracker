import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRenewalBuckets, decorateRenewal } from '../server/services/renewals.js';
import { addDays, daysUntil } from '../server/utils/dates.js';

const TODAY = '2026-10-09';

const sub = (id, date, status = 'active') => ({
  id,
  service_name: `Service ${id}`,
  service_key: null,
  logo_key: null,
  category: 'Other',
  plan_name: null,
  price: 10,
  currency_code: 'USD',
  billing_cycle: 'monthly',
  next_renewal_date: date,
  status,
});

test('daysUntil handles forward and backward calendar differences', () => {
  assert.equal(daysUntil('2026-10-09', TODAY), 0);
  assert.equal(daysUntil('2026-10-12', TODAY), 3);
  assert.equal(daysUntil('2026-10-08', TODAY), -1);
});

test('renewal due today is detected', () => {
  const item = decorateRenewal(sub(1, TODAY), TODAY);
  assert.equal(item.dueToday, true);
  assert.equal(item.overdue, false);
  assert.equal(item.daysUntil, 0);
});

test('renewals within 3, 7 and 30 days respect inclusive boundaries', () => {
  const buckets = buildRenewalBuckets(
    [sub(1, addDays(TODAY, 3)), sub(2, addDays(TODAY, 7)), sub(3, addDays(TODAY, 30)), sub(4, addDays(TODAY, 31))],
    TODAY,
  );
  assert.deepEqual(buckets.within7.map((item) => item.id), [1, 2]);
  assert.deepEqual(buckets.within30.map((item) => item.id), [1, 2, 3]);
  assert.equal(buckets.within30.some((item) => item.id === 4), false);
});

test('overdue renewals are separated and excluded from upcoming windows', () => {
  const buckets = buildRenewalBuckets([sub(1, '2026-10-01'), sub(2, TODAY)], TODAY);
  assert.deepEqual(buckets.overdue.map((item) => item.id), [1]);
  assert.equal(buckets.within7.some((item) => item.id === 1), false);
});

test('cancelled subscriptions never generate reminders or buckets', () => {
  const buckets = buildRenewalBuckets([sub(1, TODAY, 'cancelled')], TODAY, [3, 7]);
  assert.equal(buckets.all.length, 0);
  assert.equal(buckets.today.length, 0);
  assert.equal(buckets.reminders.length, 0);
});

test('paused subscriptions are excluded from reminders', () => {
  const buckets = buildRenewalBuckets([sub(1, TODAY, 'paused')], TODAY, [3, 7]);
  assert.equal(buckets.all.length, 0);
});

test('reminder thresholds flag matching active subscriptions only', () => {
  const buckets = buildRenewalBuckets([sub(1, addDays(TODAY, 3)), sub(2, addDays(TODAY, 5)), sub(3, addDays(TODAY, 20))], TODAY, [3, 7]);
  assert.deepEqual(buckets.reminders.map((item) => item.id), [1, 2]);
});

test('month and year boundaries do not shift renewal dates', () => {
  const buckets = buildRenewalBuckets([sub(1, '2026-11-01'), sub(2, '2027-01-01')], TODAY);
  assert.equal(buckets.all[0].daysUntil, daysUntil('2026-11-01', TODAY));
  assert.equal(buckets.all[1].daysUntil, daysUntil('2027-01-01', TODAY));
});
