import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, sampleSubscription } from './helpers/server.js';

test('health endpoint reports a ready database', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());
  const res = await s.api('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'ready');
});

test('catalog lists services and supports lookup', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const list = await s.api('/api/catalog');
  assert.equal(list.status, 200);
  assert.ok(list.body.services.length > 50);
  assert.ok(list.body.categories.includes('Video & Streaming'));

  const search = await s.api('/api/catalog?q=netflix');
  assert.equal(search.body.services.length, 1);
  assert.equal(search.body.services[0].key, 'netflix');

  const entry = await s.api('/api/catalog/netflix');
  assert.equal(entry.status, 200);
  assert.equal(entry.body.name, 'Netflix');

  const missing = await s.api('/api/catalog/not-a-service');
  assert.equal(missing.status, 404);
});

test('subscription create, read, update, status and delete lifecycle', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const created = await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription() });
  assert.equal(created.status, 201);
  assert.equal(created.body.subscription.service_name, 'Netflix');
  assert.equal(created.body.subscription.status, 'active');
  const id = created.body.subscription.id;

  const fetched = await s.api(`/api/subscriptions/${id}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.body.id, id);

  const updated = await s.api(`/api/subscriptions/${id}`, {
    method: 'PUT',
    body: sampleSubscription({ service_name: 'Netflix Premium', price: 22.99 }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.subscription.service_name, 'Netflix Premium');
  assert.equal(updated.body.subscription.price, 22.99);

  const paused = await s.api(`/api/subscriptions/${id}/status`, { method: 'PATCH', body: { status: 'paused' } });
  assert.equal(paused.status, 200);
  assert.equal(paused.body.subscription.status, 'paused');

  const removed = await s.api(`/api/subscriptions/${id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.deleted, true);

  const gone = await s.api(`/api/subscriptions/${id}`);
  assert.equal(gone.status, 404);
});

test('creating by a catalog service name auto-resolves catalog fields', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const created = await s.api('/api/subscriptions', {
    method: 'POST',
    body: sampleSubscription({ service_key: null, logo_key: null, category: 'Other' }),
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.subscription.service_key, 'netflix');
  assert.equal(created.body.subscription.logo_key, 'netflix');
  assert.equal(created.body.subscription.category, 'Video & Streaming');

  const renamed = await s.api(`/api/subscriptions/${created.body.subscription.id}`, {
    method: 'PUT',
    body: sampleSubscription({ service_name: 'Spotify', service_key: null, logo_key: null, category: 'Other' }),
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.subscription.service_key, 'spotify');
  assert.equal(renamed.body.subscription.category, 'Music & Audio');
});

test('missing and invalid subscription ids return safe errors', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  assert.equal((await s.api('/api/subscriptions/9999')).status, 404);
  assert.equal((await s.api('/api/subscriptions/abc')).status, 400);
  assert.equal((await s.api('/api/subscriptions/-1')).status, 400);
});

test('invalid payloads return validation errors', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const res = await s.api('/api/subscriptions', {
    method: 'POST',
    body: sampleSubscription({ service_name: '', price: -1, billing_cycle: 'daily' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(res.body.error.details.fields.service_name);
});

test('duplicate detection warns with 409 and can be forced', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription() });

  const conflict = await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription() });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.details.code, 'DUPLICATE_WARNING');
  assert.equal(conflict.body.error.details.duplicates.length, 1);

  const forced = await s.api('/api/subscriptions?force=true', { method: 'POST', body: sampleSubscription() });
  assert.equal(forced.status, 201);
  assert.equal(forced.body.duplicates.length, 1);
});

test('subscriptions support search, filter, sort and renewal windows', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ service_name: 'Netflix', price: 15.49, next_renewal_date: '2026-10-15' }) });
  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ service_name: 'Spotify', category: 'Music & Audio', price: 10.99, next_renewal_date: '2026-10-11' }) });
  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ service_name: 'Adobe', category: 'Developer & Creative', price: 54.99, next_renewal_date: '2026-11-20' }) });

  const search = await s.api('/api/subscriptions?q=spot');
  assert.equal(search.body.count, 1);
  assert.equal(search.body.subscriptions[0].service_name, 'Spotify');

  const byCategory = await s.api('/api/subscriptions?category=Music%20%26%20Audio');
  assert.equal(byCategory.body.count, 1);

  const sorted = await s.api('/api/subscriptions?sortBy=price&order=desc');
  assert.deepEqual(sorted.body.subscriptions.map((row) => row.service_name), ['Adobe', 'Netflix', 'Spotify']);

  const badSort = await s.api('/api/subscriptions?sortBy=price;DROP%20TABLE');
  assert.equal(badSort.status, 400);

  const invalidStatus = await s.api('/api/subscriptions?status=zombie');
  assert.equal(invalidStatus.status, 400);

  const invalidWindow = await s.api('/api/subscriptions?renewalWindow=forever');
  assert.equal(invalidWindow.status, 400);

  const windowRes = await s.api('/api/subscriptions?renewalWindow=today');
  assert.equal(windowRes.status, 200);
});

test('dashboard reflects real database records grouped by currency', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ price: 15, currency_code: 'USD', billing_cycle: 'monthly' }) });
  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ service_name: 'Gym', price: 120, currency_code: 'EUR', billing_cycle: 'yearly' }) });
  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription({ service_name: 'Old', price: 99, currency_code: 'USD', status: 'cancelled' }) });

  const dash = await s.api('/api/dashboard');
  assert.equal(dash.status, 200);
  assert.equal(dash.body.active_count, 2);
  assert.equal(dash.body.cancelled_count, 1);
  const usd = dash.body.monthly_by_currency.find((row) => row.currency === 'USD');
  assert.equal(usd.amount, 15);
  const eur = dash.body.monthly_by_currency.find((row) => row.currency === 'EUR');
  assert.equal(eur.amount, 10);
  assert.equal(dash.body.recently_cancelled.length, 1);
});

test('settings persist across requests', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const initial = await s.api('/api/settings');
  assert.equal(initial.body.settings.preferred_currency, 'USD');
  assert.deepEqual(initial.body.settings.reminder_thresholds, [3, 7]);

  const saved = await s.api('/api/settings', {
    method: 'PUT',
    body: { preferred_currency: 'INR', monthly_budget: 2500, budget_currency: 'INR', reminder_thresholds: [1, 5] },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.settings.monthly_budget, 2500);

  const reloaded = await s.api('/api/settings');
  assert.equal(reloaded.body.settings.budget_currency, 'INR');
  assert.deepEqual(reloaded.body.settings.reminder_thresholds, [1, 5]);

  const invalid = await s.api('/api/settings', { method: 'PUT', body: { preferred_currency: 'INR', monthly_budget: -100, reminder_thresholds: [0] } });
  assert.equal(invalid.status, 400);
});

test('CSV export returns downloadable data with summary', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription() });

  const res = await fetch(`${s.baseUrl}/api/export.csv`, { headers: { Cookie: s.cookie } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/csv/);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="submate-subscriptions-\d{4}-\d{2}-\d{2}\.csv"/);
  const text = await res.text();
  assert.match(text, /Service Name/);
  assert.match(text, /Cost summary/);
  assert.match(text, /USD,15\.49,185\.88/);
});

test('unknown api routes return a 404 JSON error', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());
  const res = await s.api('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
