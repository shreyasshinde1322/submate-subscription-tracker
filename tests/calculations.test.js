import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annualEquivalent,
  categoryTotalsByCurrency,
  monthlyEquivalent,
  monthlyTotalsByCurrency,
  mostExpensive,
} from '../server/services/calculations.js';

test('weekly monthly-equivalent uses price * 52 / 12', () => {
  assert.equal(monthlyEquivalent(12, 'weekly'), 52);
  assert.ok(Math.abs(monthlyEquivalent(10, 'weekly') - (10 * 52) / 12) < 1e-9);
});

test('monthly monthly-equivalent equals price', () => {
  assert.equal(monthlyEquivalent(15.49, 'monthly'), 15.49);
});

test('quarterly monthly-equivalent divides by three', () => {
  assert.ok(Math.abs(monthlyEquivalent(30, 'quarterly') - 10) < 1e-9);
});

test('yearly monthly-equivalent divides by twelve', () => {
  assert.ok(Math.abs(monthlyEquivalent(120, 'yearly') - 10) < 1e-9);
});

test('annual estimate is monthly equivalent times twelve', () => {
  assert.ok(Math.abs(annualEquivalent(10, 'monthly') - 120) < 1e-9);
  assert.ok(Math.abs(annualEquivalent(120, 'yearly') - 120) < 1e-9);
});

test('unsupported billing cycle throws', () => {
  assert.throws(() => monthlyEquivalent(10, 'biweekly'));
});

const active = (price, cycle, currency, status = 'active') => ({
  price,
  billing_cycle: cycle,
  currency_code: currency,
  status,
});

test('paused and cancelled subscriptions are excluded from recurring spend', () => {
  const totals = monthlyTotalsByCurrency([
    active(10, 'monthly', 'USD'),
    active(20, 'monthly', 'USD', 'paused'),
    active(30, 'monthly', 'USD', 'cancelled'),
  ]);
  assert.deepEqual(totals, [{ currency: 'USD', amount: 10 }]);
});

test('different currencies are never combined', () => {
  const totals = monthlyTotalsByCurrency([
    active(20, 'monthly', 'USD'),
    active(500, 'monthly', 'INR'),
    active(516.6666666667, 'yearly', 'INR'),
  ]);
  const usd = totals.find((row) => row.currency === 'USD');
  const inr = totals.find((row) => row.currency === 'INR');
  assert.equal(usd.amount, 20);
  assert.ok(Math.abs(inr.amount - 500 - 516.6666666667 / 12) < 0.01);
});

test('category totals are grouped by currency', () => {
  const groups = categoryTotalsByCurrency([
    active(10, 'monthly', 'USD'),
    { ...active(5, 'monthly', 'USD'), category: 'Music & Audio' },
    active(20, 'monthly', 'EUR'),
  ]);
  assert.equal(groups.length, 2);
  const usd = groups.find((group) => group.currency === 'USD');
  assert.equal(usd.total, 15);
  assert.equal(usd.categories.length, 2);
  assert.ok(usd.categories[0].share > 0);
});

test('most expensive returns active subscriptions sorted descending', () => {
  const result = mostExpensive([
    { ...active(10, 'monthly', 'USD'), id: 1, service_name: 'A', category: 'c' },
    { ...active(30, 'monthly', 'USD'), id: 2, service_name: 'B', category: 'c' },
    { ...active(99, 'monthly', 'USD', 'cancelled'), id: 3, service_name: 'C', category: 'c' },
  ]);
  assert.deepEqual(result.map((row) => row.id), [2, 1]);
});
