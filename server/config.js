// Loads .env for local development. On Vercel the environment variables are
// injected directly, and dotenv simply does nothing when no .env file exists.
import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = resolve(here, '..');

export const DATABASE_URL = process.env.DATABASE_URL || null;

export const DIST_DIR = join(ROOT_DIR, 'dist');

export const PORT = Number(process.env.SUBMATE_PORT || process.env.PORT || 3001);
export const HOST = process.env.HOST || '0.0.0.0';

export const PG_SSL = process.env.PG_SSL === 'false' ? false : true;
