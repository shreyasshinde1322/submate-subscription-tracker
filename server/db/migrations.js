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
];

export async function runMigrations(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

  const { rows } = await pool.query('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((row) => Number(row.id)));

  for (const migration of migrations) {
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
