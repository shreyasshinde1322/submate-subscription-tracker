import { createApp } from '../../server/app.js';
import { runMigrations } from '../../server/db/migrations.js';
import { createTestPool } from './pg.js';

export async function startTestServer() {
  const db = createTestPool();
  await runMigrations(db);
  const app = createApp({ db });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const setupResponse = await fetch(`${baseUrl}/api/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Test User', password: 'test-password-for-suite' }),
  });
  const cookie = (setupResponse.headers.get('set-cookie') || '').split(';')[0];

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
    db,
    baseUrl,
    api,
    cookie,
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
