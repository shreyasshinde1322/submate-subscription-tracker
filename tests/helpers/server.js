import { createApp } from '../../server/app.js';
import { runMigrations } from '../../server/db/migrations.js';
import { createTestPool } from './pg.js';

// Keep the suite fast: production uses 12 rounds, tests use the minimum.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '4';

export const DEFAULT_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'test-password-for-suite',
};

// A tiny cookie-aware HTTP client. Identity is carried by the session cookie in
// the same way a browser would do it.
function createClient(baseUrl) {
  let cookie = '';
  async function api(path, options = {}) {
    const { body, headers, ...rest } = options;
    const response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(headers || {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, headers: response.headers, body: json, text };
  }

  return {
    api,
    get cookie() {
      return cookie;
    },
    clearCookie() {
      cookie = '';
    },
  };
}

export async function startTestServer() {
  const db = createTestPool();
  await runMigrations(db);
  const app = createApp({ db });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const user = createClient(baseUrl);
  const registration = await user.api('/api/auth/register', {
    method: 'POST',
    body: { ...DEFAULT_USER, confirmPassword: DEFAULT_USER.password },
  });
  if (registration.status !== 201) {
    throw new Error(`Test user registration failed (${registration.status})`);
  }

  return {
    db,
    baseUrl,
    api: user.api,
    get cookie() {
      return user.cookie;
    },
    makeClient: () => createClient(baseUrl),
    register: (overrides = {}) => {
      const details = { ...DEFAULT_USER, ...overrides };
      const client = createClient(baseUrl);
      return client
        .api('/api/auth/register', {
          method: 'POST',
          body: { ...details, confirmPassword: details.password },
        })
        .then((response) => ({ client, response }));
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      if (typeof db.end === 'function') await db.end();
    },
  };
}

export const sampleSubscription = (overrides = {}) => ({
  service_name: 'Netflix',
  service_key: 'netflix',
  logo_key: 'netflix',
  price: 15.49,
  currency_code: 'USD',
  billing_cycle: 'monthly',
  category: 'Video & Streaming',
  next_renewal_date: '2026-10-15',
  status: 'active',
  plan_name: 'Standard',
  notes: null,
  ...overrides,
});
