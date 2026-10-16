// Deliberate database reset. This is destructive and requires --yes.
// Drops every SubMate table and re-runs the migrations against DATABASE_URL.
import { DATABASE_URL } from '../server/config.js';
import { createPool } from '../server/db/connection.js';
import { runMigrations } from '../server/db/migrations.js';

const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');

if (!confirmed) {
  console.log('This will permanently delete your SubMate database and all saved records.');
  console.log(`  Target: ${DATABASE_URL ? 'DATABASE_URL' : 'DATABASE_URL is not set'}`);
  console.log('');
  console.log('To proceed, run:');
  console.log('  npm run db:reset -- --yes');
  process.exit(0);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Export it before resetting the database.');
  process.exit(1);
}

const pool = createPool();

try {
  await pool.query('DROP TABLE IF EXISTS auth_rate_limits CASCADE');
  await pool.query('DROP TABLE IF EXISTS auth_sessions CASCADE');
  await pool.query('DROP TABLE IF EXISTS settings CASCADE');
  await pool.query('DROP TABLE IF EXISTS subscriptions CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
  await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
  await runMigrations(pool);
  console.log('SubMate database reset. A fresh, empty schema was created.');
} catch (error) {
  console.error(`Database reset failed: ${error.message}`);
  process.exit(1);
} finally {
  await pool.end();
}
