const migrations = [
  {
    id: 1,
    name: 'initial subscriptions and settings schema',
    up: async (pool) => {
      await pool.query(`CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          service_name TEXT NOT NULL CHECK (length(trim(service_name)) > 0),
          service_key TEXT,
          logo_key TEXT,
          price NUMERIC(10, 2) NOT NULL CHECK (price > 0),
          currency_code TEXT NOT NULL CHECK (length(currency_code) = 3),
          billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
          category TEXT NOT NULL CHECK (length(trim(category)) > 0),
          next_renewal_date DATE NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
          plan_name TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON subscriptions (next_renewal_date)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON subscriptions (category)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_service_key ON subscriptions (service_key)`);
      await pool.query(`CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          preferred_currency TEXT NOT NULL DEFAULT 'USD',
          monthly_budget NUMERIC(10, 2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
          budget_currency TEXT,
          reminder_thresholds TEXT NOT NULL DEFAULT '[3,7]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    },
  },
  {
    id: 2,
    name: 'local single-user login and sessions',
    up: async (pool) => {
      await pool.query(`CREATE TABLE IF NOT EXISTS local_account (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          username TEXT NOT NULL CHECK (length(trim(username)) BETWEEN 2 AND 60),
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
          token_hash TEXT PRIMARY KEY,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions (expires_at)`);
    },
  },
  {
    id: 3,
    name: 'multi-user accounts and per-user data',
    up: async (client) => {
      // Accounts. Email is stored lower-cased and uniquely indexed so the same
      // address can never be registered twice, whatever its casing.
      await client.query(`CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email)');

      // Subscriptions become user-owned. The column starts nullable so the data
      // migration below can attach the pre-existing rows without data loss; the
      // API always writes and reads it.
      await client.query(
        'ALTER TABLE subscriptions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE',
      );
      await client.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id)');

      // Sessions gain an owner so a token can be resolved to a user.
      await client.query(
        'ALTER TABLE auth_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE',
      );
      await client.query('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id)');

      // Settings move from a singleton row to one row per user. The old table is
      // renamed first so its data can be carried across, never dropped blindly.
      await client.query('ALTER TABLE settings RENAME TO settings_legacy');
      // Constraint names are explicit because the renamed table keeps the old
      // `settings_pkey` name, which would otherwise collide.
      await client.query(`CREATE TABLE settings (
          user_id INTEGER NOT NULL,
          preferred_currency TEXT NOT NULL DEFAULT 'USD',
          monthly_budget NUMERIC(10, 2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
          budget_currency TEXT,
          reminder_thresholds TEXT NOT NULL DEFAULT '[3,7]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT settings_user_pkey PRIMARY KEY (user_id),
          CONSTRAINT settings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

      // Carry a legacy single-user account forward as a real user, keeping its
      // passphrase (stored as a verifiable legacy hash) and its records. No
      // shared or hardcoded account is ever created.
      const legacy = await client.query(
        'SELECT username, password_salt, password_hash FROM local_account WHERE id = 1',
      );
      let legacyUserId = null;
      if (legacy.rows[0]) {
        const { username, password_salt, password_hash } = legacy.rows[0];
        const email = legacyEmail(String(username));
        const passwordHash = `scrypt:${password_salt}:${password_hash}`;
        const inserted = await client.query(
          `INSERT INTO users (name, email, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [username, email, passwordHash],
        );
        legacyUserId = Number(inserted.rows[0].id);
      }

      const legacySettings = await client.query('SELECT * FROM settings_legacy WHERE id = 1');
      if (legacyUserId !== null && legacySettings.rows[0]) {
        const row = legacySettings.rows[0];
        await client.query(
          `INSERT INTO settings (user_id, preferred_currency, monthly_budget, budget_currency, reminder_thresholds, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            legacyUserId,
            row.preferred_currency,
            row.monthly_budget,
            row.budget_currency,
            row.reminder_thresholds,
          ],
        );
      }

      if (legacyUserId !== null) {
        await client.query('UPDATE subscriptions SET user_id = $1 WHERE user_id IS NULL', [
          legacyUserId,
        ]);
      }

      // Sessions created under the old scheme carry no owner and cannot be
      // safely attributed, so they are dropped and users simply sign in again.
      await client.query('DELETE FROM auth_sessions WHERE user_id IS NULL');
      await client.query('DROP TABLE settings_legacy');
      await client.query('DROP TABLE local_account');
    },
  },
  {
    id: 4,
    name: 'persistent auth rate limiting',
    up: async (client) => {
      // Shared by every function instance, so throttling survives scale-out and
      // cold starts instead of living in one process's memory.
      await client.query(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
          key TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL DEFAULT 0,
          window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    },
  },
];

// Derives a deterministic, valid email for the pre-existing local account so its
// owner can regain access; they may change it later from a fresh registration.
function legacyEmail(username) {
  const slug =
    String(username)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 48) || 'account';
  return `${slug}@submate.local`;
}

export async function runMigrations(pool, { upTo = Number.POSITIVE_INFINITY } = {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  const { rows } = await pool.query('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((row) => Number(row.id)));

  for (const migration of migrations) {
    if (migration.id > upTo) break;
    if (applied.has(migration.id)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await migration.up(client);
      await client.query('INSERT INTO schema_migrations (id, name) VALUES ($1, $2)', [
        migration.id,
        migration.name,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const migrationCount = migrations.length;
