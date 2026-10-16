# SubMate — Subscription & Renewal Tracker

Know what’s coming, and feel good about what stays. SubMate is a local, single-user
subscription manager backed by a real SQLite database. Renewals, budgets, and spend
patterns are tracked without a cloud account — everything lives on your machine.

## Features

- **Real persistence** — subscriptions and preferences are stored in `data/submate.sqlite`
- **Catalog with local logos** — pick a service from a 68-entry catalog; bundled Simple Icons
  are used where available, with branded local marks for the rest
- **Local login** — protect the single-user tracker with a passphrase stored as a salted hash
  in SQLite; authenticated API requests use an HTTP-only local session cookie
- **Renewal timeline** — a monthly calendar plus Overdue / Next 7 days / Next 30 days
  roll-up with reminder thresholds (defaults: 3 and 7 days)
- **Spend analytics** — monthly & annual totals, category breakdown, most-expensive plans
- **Budgets** — set a monthly limit per currency with a live progress meter
- **Duplicate protection** — adding the same service warns you (with an option to force it)
- **CSV export** — one-click download of all subscriptions (formula-injection safe)
- **Multiple currencies** — never combined; totals are reported per currency

## Requirements

- Node.js **22.5+** (uses the built-in `node:sqlite` driver — no native build step)
- npm

## Getting started

```bash
npm install
npm run dev      # starts API (http://127.0.0.1:3001) + Vite dev server with /api proxy
```

Open the printed Vite URL. On first launch, create a local workspace name and passphrase;
later launches show an unlock screen. Then add your first subscription. The passphrase is
not recoverable through a cloud account; keep a safe copy if you need continued access to
the local data file.

Production-style run:

```bash
npm run build    # Vite production bundle into dist/
npm start        # serves the bundle + API from one Node process on http://127.0.0.1:3001
```

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
| `npm run db:reset` | Delete the local database (requires `--yes` confirmation) |

## Project structure

```
server/            Express API, SQLite schema, services, validation
  config.js        paths, port, environment overrides
  db/              connection + migrations
  repositories/    data access for subscriptions and settings
  routes/          health, catalog, subscriptions, dashboard, settings, export
  services/        calculations, renewals, duplicates, CSV, dashboard, money
  validation/      payload + query validation
scripts/           logo generator, DB reset
src/               React frontend
  api/             API client
  context/         data provider + mutations + toast
  components/      UI primitives, sidebar, header, forms, modals
  pages/           Welcome, Overview, Subscriptions, Renewals, Analytics, Budget, Settings
tests/             server-side integration + unit tests
.github/workflows  CI (lint, tests, build, smoke test)
```

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Server + DB health |
| `GET` | `/api/auth/status` | Check whether local setup or unlock is needed |
| `POST` | `/api/auth/setup` | Create the local passphrase and first session |
| `POST` | `/api/auth/login` | Unlock the local tracker |
| `POST` | `/api/auth/logout` | Lock the tracker and revoke the local session |
| `GET` | `/api/catalog` | Catalog services + categories |
| `GET` | `/api/catalog/q?q=…` | Catalog search |
| `GET` | `/api/subscriptions` | List/filter/sort (`q`, `category`, `status`, `billingCycle`, `renewalWindow`, `sortBy`, `order`) |
| `POST` | `/api/subscriptions` | Create (409 + `DUPLICATE_WARNING` for duplicates; `?force=true` to bypass) |
| `GET/PUT/DELETE` | `/api/subscriptions/:id` | Read, update, delete |
| `PATCH` | `/api/subscriptions/:id/status` | Change status (`active`/`paused`/`cancelled`) |
| `GET` | `/api/dashboard` | Aggregated metrics, budgets, upcoming renewals |
| `GET/PUT` | `/api/settings` | Preferences (currency, budget, reminder thresholds) |
| `GET` | `/api/export.csv` | Download subscriptions as CSV |

All catalog, subscription, settings, dashboard, and export endpoints require an active local
session. Errors use a consistent shape: `{ "error": { "message", "code", "details" } }`.

## Storage & configuration

- Database: `data/submate.sqlite`, created automatically (WAL mode, migrations tracked).
- Env overrides: `SUBMATE_DB_PATH`, `SUBMATE_DATA_DIR`, `SUBMATE_PORT`, `HOST`.

## Notes

- Currencies are never mixed: spend totals, category breakdowns, and budgets are reported
  per currency.
- Only `active` subscriptions count toward spend and reminders; `paused` and `cancelled`
  are excluded.
- No analytics, telemetry, or network calls — your data stays local.
