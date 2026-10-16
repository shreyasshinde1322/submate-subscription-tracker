import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSubscriptionsCsv, escapeCsvField } from '../server/services/csv.js';

const base = {
  service_name: 'Test',
  category: 'Other',
  plan_name: null,
  price: 10,
  currency_code: 'USD',
  billing_cycle: 'monthly',
  next_renewal_date: '2026-10-15',
  status: 'active',
  notes: null,
};

test('escapes fields containing commas', () => {
  assert.equal(escapeCsvField('Acme, Inc'), '"Acme, Inc"');
});

test('escapes fields containing double quotes', () => {
  assert.equal(escapeCsvField('Say "hi"'), '"Say ""hi"""');
});

test('escapes fields containing newlines', () => {
  assert.equal(escapeCsvField('line1\nline2'), '"line1\nline2"');
});

test('empty values remain empty', () => {
  assert.equal(escapeCsvField(null), '');
  assert.equal(escapeCsvField(undefined), '');
});

test('protects against spreadsheet formula injection', () => {
  assert.equal(escapeCsvField('=SUM(A1:A2)'), "'=SUM(A1:A2)");
  assert.equal(escapeCsvField('+1+1'), "'+1+1");
  assert.equal(escapeCsvField('-2'), "'-2");
  assert.equal(escapeCsvField('@cmd'), "'@cmd");
});

test('builds a CSV with a header, rows and a currency summary', () => {
  const csv = buildSubscriptionsCsv([
    { ...base, service_name: 'Net, flix', notes: '=danger' },
    { ...base, service_name: 'Spotify', currency_code: 'EUR', billing_cycle: 'yearly', price: 120 },
  ]);
  const lines = csv.split('\r\n');
  assert.match(lines[0], /^Service Name,Category,Plan Name,Price,Currency,Billing Cycle,Next Renewal Date,Status,Notes$/);
  assert.ok(csv.includes('"Net, flix"'));
  assert.ok(csv.includes("'=danger"));
  assert.ok(csv.includes('Cost summary (monthly equivalent, grouped by currency)'));
  assert.ok(csv.includes('EUR,10,120'));
});
