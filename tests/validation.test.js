import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubscriptionInput } from '../server/validation/subscription.js';
import { validateSettingsInput } from '../server/validation/settings.js';

const valid = {
  service_name: 'Netflix',
  price: 15.49,
  currency_code: 'usd',
  billing_cycle: 'Monthly',
  category: 'Video & Streaming',
  next_renewal_date: '2026-10-15',
};

test('valid subscription input is normalized', () => {
  const result = validateSubscriptionInput(valid);
  assert.equal(result.valid, true);
  assert.equal(result.value.currency_code, 'USD');
  assert.equal(result.value.billing_cycle, 'monthly');
  assert.equal(result.value.status, 'active');
});

test('empty service name is rejected', () => {
  const result = validateSubscriptionInput({ ...valid, service_name: '   ' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.service_name);
});

test('missing required fields are reported', () => {
  const result = validateSubscriptionInput({});
  assert.equal(result.valid, false);
  for (const field of ['service_name', 'price', 'currency_code', 'billing_cycle', 'category', 'next_renewal_date']) {
    assert.ok(result.errors[field], `expected error for ${field}`);
  }
});

test('zero and negative prices are rejected', () => {
  assert.equal(validateSubscriptionInput({ ...valid, price: 0 }).valid, false);
  assert.equal(validateSubscriptionInput({ ...valid, price: -4 }).valid, false);
});

test('invalid currency codes are rejected', () => {
  assert.equal(validateSubscriptionInput({ ...valid, currency_code: 'US' }).valid, false);
  assert.equal(validateSubscriptionInput({ ...valid, currency_code: 'ZZZ' }).valid, false);
});

test('unsupported billing cycles are rejected', () => {
  const result = validateSubscriptionInput({ ...valid, billing_cycle: 'biweekly' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.billing_cycle);
});

test('unsupported statuses are rejected', () => {
  const result = validateSubscriptionInput({ ...valid, status: 'archived' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.status);
});

test('invalid calendar dates are rejected', () => {
  assert.equal(validateSubscriptionInput({ ...valid, next_renewal_date: '2026-02-30' }).valid, false);
  assert.equal(validateSubscriptionInput({ ...valid, next_renewal_date: '15/10/2026' }).valid, false);
});

test('settings reject invalid currencies and negative budgets', () => {
  const result = validateSettingsInput({ preferred_currency: 'USD', monthly_budget: -5, budget_currency: 'USD', reminder_thresholds: [3, 7] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.monthly_budget);
});

test('settings reject invalid reminder thresholds', () => {
  const result = validateSettingsInput({ preferred_currency: 'USD', reminder_thresholds: [0, 7] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.reminder_thresholds);
});

test('settings accept a null budget and default thresholds', () => {
  const result = validateSettingsInput({ preferred_currency: 'EUR' });
  assert.equal(result.valid, true);
  assert.equal(result.value.monthly_budget, null);
  assert.deepEqual(result.value.reminder_thresholds, [3, 7]);
});
