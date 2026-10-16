# SubMate — Subscription & Renewal Tracker

Know what’s coming, and feel good about what stays. SubMate is a multi-user
subscription manager backed by PostgreSQL. Renewals, budgets, and spend patterns
are tracked per account, with secure authentication and strict data isolation
between users.

## Features

- **Accounts & sessions** — email/password registration and login, bcrypt-hashed
  passwords, and database-backed sessions carried in HttpOnly cookies
- **Per-user data** — subscriptions, settings, dashboard metrics, renewal lists
  and CSV exports are always scoped to the signed-in account
- **Catalog with local logos** — pick a service from a 68-entry catalog; bundled Simple Icons
  are used where available, with branded local marks for the rest
- **Renewal timeline** — a monthly calendar plus Overdue / Next 7 days / Next 30 days
  roll-up with reminder thresholds (defaults: 3 and 7 days)
- **Spend analytics** — monthly & annual totals, category breakdown, most-expensive plans
- **Budgets** — set a monthly limit per currency with a live progress meter
- **Duplicate protection** — adding the same service warns you (with an option to force it)
- **CSV export** — one-click download of all subscriptions (formula-injection safe)
- **Multiple currencies** — never combined; totals are reported per currency

## Requirements

- Node.js **22.5+**
- npm
- A PostgreSQL database (e.g. Neon, Vercel Postgres, or a local server)

## Getting started

```bash
npm install
npm run dev      # starts API (http://127.0.0.1:3001) + Vite dev server with /api proxy
```

Open the printed Vite URL, create an account, and add your first subscription.
Migrations run automatically on server start.

Production-style run:

```bash
npm run build    # Vite production bundle into dist/
npm start        # serves the bundle + API from one Node process on http://127.0.0.1:3001
```

## Authentication

- Passwords are hashed with **bcrypt** (12 rounds). Plain-text passwords are never
  stored or logged.
- Sessions are stored in PostgreSQL (`auth_sessions`) with only a SHA-256 digest of
  the token, so they survive serverless cold starts and scale across instances.
- The session token is delivered in an **HttpOnly** cookie that is **Secure** in
  production and uses **SameSite=Strict** by default.
- Login and registration are rate limited with a PostgreSQL-backed fixed window
  (`auth_rate_limits`), so throttling is shared across function instances.
- State-changing requests are protected by an Origin allowlist (CSRF) in addition
  to the SameSite cookie policy. Trusted origins are explicit (never a wildcard):
  the bundled same-origin SPA, the local Vite dev origin, Vercel's own
  deployment URLs, and any extra origins listed in `CORS_ORIGIN`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run API and Vite together (Concurrently) |
| `npm run build` | Production frontend bundle |
| `npm start` | Serve built app + API |
| `npm test` | Server tests then web tests |
| `npm run test:server` | `node --test "tests/**/*.test.js"` |
| `npm run test:web` | Vitest (jsdom) |
| `npm run lint` | ESLint over the whole repo |
| `npm run generate:logos` | Regenerate bundled brand marks from the catalog |
| `npm run db:reset` | Drop and recreate the schema (requires `--yes` confirmation) |

## Project structure

```
server/            Express API, PostgreSQL schema, services, validation
  config.js        paths, port, cookie/CORS/rate-limit configuration
  db/              connection + migrations
  security/        password hashing and session-token helpers
  repositories/    data access for users, sessions, subscriptions and settings
  routes/          health, auth, catalog, subscriptions, dashboard, settings, export
  middleware/      auth guard, rate limiting, CORS/CSRF, error handling
  services/        calculations, renewals, duplicates, CSV, dashboard, money
  validation/      payload + query validation
scripts/           logo generator, DB reset
src/               React frontend
  api/             API client (same-origin cookie session)
  context/         data provider + mutations + toast
  components/      UI primitives, sidebar, header, forms, modals
  pages/           Auth (login/register), Overview, Subscriptions, Renewals, Analytics, Budget, Settings
tests/             server-side integration + unit tests
.github/workflows  CI (lint, tests, build, smoke test)
```

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Server + DB health |
| `POST` | `/api/auth/register` | Create an account (`name`, `email`, `password`, `confirmPassword`) |
| `POST` | `/api/auth/login` | Start a session (`email`, `password`) |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/auth/me` | Return the authenticated user |
| `GET` | `/api/catalog` | Catalog services + categories |
| `GET` | `/api/catalog/q?q=…` | Catalog search |
| `GET` | `/api/subscriptions` | List/filter/sort (`q`, `category`, `status`, `billingCycle`, `renewalWindow`, `sortBy`, `order`) |
| `POST` | `/api/subscriptions` | Create (409 + `DUPLICATE_WARNING` for duplicates; `?force=true` to bypass) |
| `GET/PUT/DELETE` | `/api/subscriptions/:id` | Read, update, delete |
| `PATCH` | `/api/subscriptions/:id/status` | Change status (`active`/`paused`/`cancelled`) |
| `GET` | `/api/dashboard` | Aggregated metrics, budgets, upcoming renewals |
| `GET/PUT` | `/api/settings` | Preferences (currency, budget, reminder thresholds) |
| `GET` | `/api/export.csv` | Download subscriptions as CSV |

All catalog, subscription, settings, dashboard, and export endpoints require an
authenticated session and only ever operate on that user's records. Errors use a
consistent shape: `{ "error": { "message", "code", "details" } }`, and password
hashes are never included in any response.

## Storage & configuration

- Database: schema is created and migrated automatically (migrations tracked in
  `schema_migrations`).
- Required: `DATABASE_URL` (PostgreSQL connection string).
- Optional overrides: `PG_SSL`, `SUBMATE_PORT`, `HOST`, `SESSION_TTL_HOURS`,
  `SESSION_COOKIE_NAME`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `CORS_ORIGIN`,
  `LOGIN_RATE_LIMIT`, `REGISTER_RATE_LIMIT`, `AUTH_RATE_LIMIT_WINDOW_MINUTES`.
  See `.env.example`.

## Migrations

Migrations run automatically at startup. The multi-user migration:

1. creates the `users` table with a unique email index,
2. adds `user_id` to `subscriptions` and `auth_sessions`,
3. converts the singleton `settings` row into one settings row per user,
4. carries any existing single-user account and its subscriptions/settings
   forward (the old passphrase keeps working and is upgraded to bcrypt on the
   next login), and
5. drops the retired `local_account` table.

No existing records are deleted by the migration.

## Deploying to Vercel

1. Import the repository as a Vercel project (the build output is `dist/` and the
   API is served from `api/index.js` through `vercel.json`).
2. Add the environment variable `DATABASE_URL` in **Project → Settings →
   Environment Variables** (and in preview/development as needed).
3. Deploy. Vercel terminates TLS, so session cookies are automatically issued
   with `Secure`, `HttpOnly`, and `SameSite=Strict`. Vercel's own deployment
   URLs (`VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`) are
   trusted automatically for the CORS/CSRF origin check.
4. Set `CORS_ORIGIN` (comma-separated) only if you serve the frontend from an
   extra custom domain, e.g. `CORS_ORIGIN=https://app.example.com`. Never expose
   `DATABASE_URL` to the browser.

## Notes

- Currencies are never mixed: spend totals, category breakdowns, and budgets are reported
  per currency.
- Only `active` subscriptions count toward spend and reminders; `paused` and `cancelled`
  are excluded.
- Sessions are server-side (PostgreSQL), never stored in localStorage or process memory.
