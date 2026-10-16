import pkg from 'pg';
const { Pool } = pkg;
import { DATABASE_URL, PG_SSL } from '../config.js';
import { runMigrations } from './migrations.js';

let sharedPool = null;

export function createPool(connectionString = DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return new Pool({
    connectionString,
    ssl: PG_SSL ? { rejectUnauthorized: false } : false,
    max: 10,
  });
}

export async function createDatabase(pool = createPool()) {
  await runMigrations(pool);
  return pool;
}

export async function getDatabase() {
  if (!sharedPool) {
    sharedPool = createPool();
    await runMigrations(sharedPool);
  }
  return sharedPool;
}

export function closeDatabase(pool = sharedPool) {
  if (pool) {
    return pool.end();
  }
  return Promise.resolve();
}

export function getSharedPool() {
  return sharedPool;
}
