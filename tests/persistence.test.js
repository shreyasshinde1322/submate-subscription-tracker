import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { runMigrations } from '../server/db/migrations.js';
import { createSubscriptionsService } from '../server/services/subscriptions.js';
import { createSettingsService } from '../server/services/settings.js';
import { createTestMemoryDb, createTestPool } from './helpers/pg.js';
import { sampleSubscription } from './helpers/server.js';

async function seedUser(pool, overrides = {}) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
    [
      overrides.name || 'Persist User',
      overrides.email || 'persist@example.com',
      overrides.passwordHash || 'not-a-real-hash',
    ],
  );
  return Number(result.rows[0].id);
}

test('database initializes automatically and persists across a restart', async () => {
  const mem = createTestMemoryDb();

  const pool = createTestPool(mem);
  await runMigrations(pool);
  const userId = await seedUser(pool);
  const subscriptions = createSubscriptionsService(pool);
  const settings = createSettingsService(pool);

  const { record } = await subscriptions.create(userId, sampleSubscription());
  await settings.save(userId, {
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

    const list = await reopenedSubscriptions.listAll(userId);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, record.id);
    assert.equal(list[0].service_name, 'Netflix');

    const saved = await reopenedSettings.get(userId);
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
    for (const expected of [
      'subscriptions',
      'settings',
      'auth_sessions',
      'auth_rate_limits',
      'users',
      'schema_migrations',
    ]) {
      assert.ok(names.includes(expected), `expected table ${expected}`);
    }
    // The single-user table is gone for good.
    assert.ok(!names.includes('local_account'), 'local_account should not exist');

    // Settings defaults exist before any user interaction.
    const settings = createSettingsService(pool);
    const userId = await seedUser(pool, { email: 'defaults@example.com' });
    const defaults = await settings.get(userId);
    assert.equal(defaults.preferred_currency, 'USD');
    assert.deepEqual(defaults.reminder_thresholds, [3, 7]);
  } finally {
    await pool.end();
  }
});

test('migration 3 carries a legacy single-user account and its records forward', async () => {
  const mem = createTestMemoryDb();
  const pool = createTestPool(mem);

  // Bring the database up to the pre-multi-user schema only.
  await runMigrations(pool, { upTo: 2 });

  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync('legacy-passphrase', Buffer.from(salt, 'hex'), 64).toString('hex');
  await pool.query(
    `INSERT INTO local_account (id, username, password_salt, password_hash)
     VALUES (1, 'Shreyas', $1, $2)`,
    [salt, hash],
  );
  await pool.query(
    `INSERT INTO subscriptions (service_name, price, currency_code, billing_cycle, category, next_renewal_date)
     VALUES ('Legacy Service', 9.99, 'INR', 'monthly', 'Music & Audio', '2026-11-01')`,
  );
  await pool.query(
    `INSERT INTO settings (id, preferred_currency, monthly_budget, budget_currency, reminder_thresholds)
     VALUES (1, 'INR', 500, 'INR', '[1,5]')`,
  );

  // Apply the multi-user migration.
  await runMigrations(pool);

  try {
    const users = await pool.query('SELECT id, name, email, password_hash FROM users');
    assert.equal(users.rows.length, 1);
    assert.equal(users.rows[0].name, 'Shreyas');
    assert.equal(users.rows[0].email, 'shreyas@submate.local');
    assert.match(users.rows[0].password_hash, /^scrypt:/);
    const userId = Number(users.rows[0].id);

    const subs = await pool.query('SELECT service_name, user_id FROM subscriptions');
    assert.equal(subs.rows.length, 1);
    assert.equal(subs.rows[0].service_name, 'Legacy Service');
    assert.equal(Number(subs.rows[0].user_id), userId);

    const settings = await pool.query('SELECT user_id, preferred_currency, monthly_budget FROM settings');
    assert.equal(settings.rows.length, 1);
    assert.equal(Number(settings.rows[0].user_id), userId);
    assert.equal(settings.rows[0].preferred_currency, 'INR');
    assert.equal(Number(settings.rows[0].monthly_budget), 500);

    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = tables.rows.map((row) => row.table_name);
    assert.ok(!names.includes('local_account'));
    assert.ok(!names.includes('settings_legacy'));
  } finally {
    await pool.end();
  }
});
