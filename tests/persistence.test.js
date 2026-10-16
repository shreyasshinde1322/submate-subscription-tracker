import test from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../server/db/migrations.js';
import { createSubscriptionsService } from '../server/services/subscriptions.js';
import { createSettingsService } from '../server/services/settings.js';
import { createTestMemoryDb, createTestPool } from './helpers/pg.js';
import { sampleSubscription } from './helpers/server.js';

test('database initializes automatically and persists across a restart', async () => {
  const mem = createTestMemoryDb();

  const pool = createTestPool(mem);
  await runMigrations(pool);
  const subscriptions = createSubscriptionsService(pool);
  const settings = createSettingsService(pool);

  const { record } = await subscriptions.create(sampleSubscription());
  await settings.save({
    preferred_currency: 'GBP',
    monthly_budget: 500,
    budget_currency: 'GBP',
    reminder_thresholds: [2, 4],
  });
  await pool.end();

  // Simulate a cold start: a brand new pool against the same database with the
  // migrations running again (they must be idempotent and never wipe data).
  const restarted = createTestPool(mem);
  await runMigrations(restarted);
  try {
    const reopenedSubscriptions = createSubscriptionsService(restarted);
    const reopenedSettings = createSettingsService(restarted);

    const list = await reopenedSubscriptions.listAll();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, record.id);
    assert.equal(list[0].service_name, 'Netflix');

    const saved = await reopenedSettings.get();
    assert.equal(saved.preferred_currency, 'GBP');
    assert.equal(saved.monthly_budget, 500);
    assert.deepEqual(saved.reminder_thresholds, [2, 4]);
  } finally {
    await restarted.end();
  }
});

test('migrations create every required table on an empty database', async () => {
  const mem = createTestMemoryDb();
  const pool = createTestPool(mem);
  await runMigrations(pool);
  try {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = tables.rows.map((row) => row.table_name);
    for (const expected of ['subscriptions', 'settings', 'local_account', 'auth_sessions', 'schema_migrations']) {
      assert.ok(names.includes(expected), `expected table ${expected}`);
    }

    // Settings defaults exist before any user interaction.
    const settings = createSettingsService(pool);
    const defaults = await settings.get();
    assert.equal(defaults.preferred_currency, 'USD');
    assert.deepEqual(defaults.reminder_thresholds, [3, 7]);
  } finally {
    await pool.end();
  }
});
