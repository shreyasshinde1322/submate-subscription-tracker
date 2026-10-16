import test from 'node:test';
import assert from 'node:assert/strict';
import { findPotentialDuplicates, normalizeServiceName } from '../server/services/duplicates.js';

const existing = {
  id: 1,
  service_name: 'Netflix',
  service_key: 'netflix',
  price: 15.49,
  currency_code: 'USD',
  billing_cycle: 'monthly',
  next_renewal_date: '2026-10-15',
  status: 'active',
};

test('normalizes service names consistently', () => {
  assert.equal(normalizeServiceName('  Net-Flix!! '), 'net flix');
});

test('matching normalized service names are flagged', () => {
  const duplicates = findPotentialDuplicates([existing], {
    service_name: 'netflix',
    service_key: null,
    price: 15.49,
    currency_code: 'USD',
    billing_cycle: 'monthly',
  });
  assert.equal(duplicates.length, 1);
});

test('matching catalog keys are flagged even when names differ', () => {
  const duplicates = findPotentialDuplicates([existing], {
    service_name: 'Netflix Standard',
    service_key: 'netflix',
    price: 15.49,
    currency_code: 'USD',
    billing_cycle: 'monthly',
  });
  assert.equal(duplicates.length, 1);
});

test('different currencies are not duplicates', () => {
  const duplicates = findPotentialDuplicates([existing], {
    service_name: 'Netflix',
    service_key: 'netflix',
    price: 15.49,
    currency_code: 'INR',
    billing_cycle: 'monthly',
  });
  assert.equal(duplicates.length, 0);
});

test('different billing cycles are not duplicates', () => {
  const duplicates = findPotentialDuplicates([existing], {
    service_name: 'Netflix',
    service_key: 'netflix',
    price: 15.49,
    currency_code: 'USD',
    billing_cycle: 'yearly',
  });
  assert.equal(duplicates.length, 0);
});

test('multiple legitimate plans from the same provider are allowed', () => {
  const duplicates = findPotentialDuplicates([existing], {
    service_name: 'Netflix',
    service_key: 'netflix',
    price: 22.99,
    currency_code: 'USD',
    billing_cycle: 'monthly',
  });
  assert.equal(duplicates.length, 0);
});

test('excludeId omits the record being edited', () => {
  const duplicates = findPotentialDuplicates(
    [existing],
    { service_name: 'Netflix', service_key: 'netflix', price: 15.49, currency_code: 'USD', billing_cycle: 'monthly' },
    1,
  );
  assert.equal(duplicates.length, 0);
});
