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

// Vercel (and any production host) terminates TLS in front of the function, so
// session cookies must be marked Secure there. Tests and local HTTP development
// run without the flag so cookies still round-trip.
export const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

export const COOKIE_SECURE =
  process.env.COOKIE_SECURE === undefined
    ? IS_PRODUCTION
    : process.env.COOKIE_SECURE === 'true';

// SameSite=Strict keeps the session cookie off cross-site requests entirely.
// It can be relaxed to 'lax' for hosts that need top-level redirects.
export const COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE || 'strict';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'submate_session';

// Sliding 7-day sessions by default.
export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000;

// The Vite dev server origin. In development the browser talks to Vite, which
// proxies /api to Express, so the browser's Origin header is the Vite origin even
// though the request lands on the API port.
const VITE_ORIGIN = `http://localhost:${Number(process.env.VITE_PORT || 5173)}`;

// Trusted browser origins for CORS and the CSRF origin check. Explicit origins
// only — never a wildcard, because credentials (session cookies) are allowed.
//  - CORS_ORIGIN: comma-separated custom domains (e.g. https://app.example.com)
//  - Vercel's own deployment URLs, so preview/production work without extra setup
//  - the local Vite origins, but only outside production
export const ALLOWED_ORIGINS = (() => {
  const normalize = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
      return url.origin;
    } catch {
      return null;
    }
  };

  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(normalize)
    .filter(Boolean);

  const fromVercel = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .filter(Boolean)
    .map((host) => normalize(`https://${host}`))
    .filter(Boolean);

  const fromDev = IS_PRODUCTION
    ? []
    : [VITE_ORIGIN, VITE_ORIGIN.replace('localhost', '127.0.0.1')];

  return [...new Set([...fromEnv, ...fromVercel, ...fromDev])];
})();

// Rate limiting windows (attempts per window) for the credential endpoints.
export const LOGIN_RATE_LIMIT = Number(process.env.LOGIN_RATE_LIMIT || 10);
export const REGISTER_RATE_LIMIT = Number(process.env.REGISTER_RATE_LIMIT || 5);
export const AUTH_RATE_LIMIT_WINDOW_MS =
  Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000;
