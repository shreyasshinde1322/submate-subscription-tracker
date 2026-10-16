import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, sampleSubscription, DEFAULT_USER } from './helpers/server.js';
import { hashSessionToken } from '../server/security/tokens.js';

test('registration creates an account, sets an HttpOnly cookie and hides secrets', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const unsupplied = s.makeClient();
  const res = await unsupplied.api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      password: 'correct-horse-battery',
      confirmPassword: 'correct-horse-battery',
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.name, 'Ada Lovelace');
  assert.equal(res.body.user.email, 'ada@example.com');
  assert.equal(res.body.user.password, undefined);
  assert.equal(res.body.user.password_hash, undefined);

  const setCookie = res.headers.get('set-cookie') || '';
  assert.match(setCookie, /submate_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
});

test('duplicate emails are rejected case-insensitively', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const client = s.makeClient();
  const res = await client.api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Another Test',
      email: DEFAULT_USER.email.toUpperCase(),
      password: 'another-password',
      confirmPassword: 'another-password',
    },
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'EMAIL_TAKEN');
});

test('registration validates every field on the server', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const client = s.makeClient();
  const res = await client.api('/api/auth/register', {
    method: 'POST',
    body: { name: 'A', email: 'not-an-email', password: 'short', confirmPassword: 'nope' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  const fields = res.body.error.details.fields;
  assert.ok(fields.name);
  assert.ok(fields.email);
  assert.ok(fields.password);
  assert.ok(fields.confirmPassword);
});

test('valid login succeeds and invalid credentials are rejected generically', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const good = s.makeClient();
  const ok = await good.api('/api/auth/login', {
    method: 'POST',
    body: { email: DEFAULT_USER.email, password: DEFAULT_USER.password },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, DEFAULT_USER.email);

  const wrongPassword = s.makeClient();
  const bad = await wrongPassword.api('/api/auth/login', {
    method: 'POST',
    body: { email: DEFAULT_USER.email, password: 'definitely-wrong' },
  });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error.code, 'INVALID_CREDENTIALS');

  const unknown = s.makeClient();
  const missing = await unknown.api('/api/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.com', password: 'whatever-password' },
  });
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, 'INVALID_CREDENTIALS');
});

test('protected routes require a session', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const anon = s.makeClient();
  assert.equal((await anon.api('/api/auth/me')).status, 401);
  assert.equal((await anon.api('/api/subscriptions')).status, 401);
  assert.equal((await anon.api('/api/dashboard')).status, 401);
  assert.equal((await anon.api('/api/settings')).status, 401);

  const me = await s.api('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, DEFAULT_USER.email);
});

test('logout revokes the session', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const before = await s.api('/api/auth/me');
  assert.equal(before.status, 200);
  const sessionCookie = s.cookie;

  const loggedOut = await s.api('/api/auth/logout', { method: 'POST' });
  assert.equal(loggedOut.status, 200);
  assert.equal(loggedOut.body.authenticated, false);

  // The token that was valid a moment ago no longer resolves.
  const after = await s.api('/api/auth/me', { headers: { Cookie: sessionCookie } });
  assert.equal(after.status, 401);
  assert.equal(after.body.error.code, 'SESSION_EXPIRED');

  // And the client with the cleared cookie is simply unauthenticated.
  assert.equal((await s.api('/api/auth/me')).status, 401);
});

test('expired sessions are rejected', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const me = await s.api('/api/auth/me');
  const userId = me.body.user.id;
  const token = 'expired-test-token';
  await s.db.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
    [hashSessionToken(token), userId, new Date(Date.now() - 1000)],
  );

  const res = await s.api('/api/auth/me', {
    headers: { Cookie: `submate_session=${token}` },
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'SESSION_EXPIRED');
});

test('user A cannot read, edit or delete user B subscriptions', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  // User A (the default account) creates a subscription.
  const created = await s.api('/api/subscriptions', { method: 'POST', body: sampleSubscription() });
  assert.equal(created.status, 201);
  const idA = created.body.subscription.id;

  // User B registers on the same server.
  const { client: b, response } = await s.register({
    name: 'Bea',
    email: 'bea@example.com',
    password: 'bea-password-123',
  });
  assert.equal(response.status, 201);

  // B's list is empty.
  const listB = await b.api('/api/subscriptions');
  assert.equal(listB.body.count, 0);

  // B cannot read A's record by guessing the id.
  assert.equal((await b.api(`/api/subscriptions/${idA}`)).status, 404);

  // B cannot edit it.
  const edit = await b.api(`/api/subscriptions/${idA}`, {
    method: 'PUT',
    body: sampleSubscription({ service_name: 'Hijacked' }),
  });
  assert.equal(edit.status, 404);

  // B cannot change its status.
  const status = await b.api(`/api/subscriptions/${idA}/status`, {
    method: 'PATCH',
    body: { status: 'cancelled' },
  });
  assert.equal(status.status, 404);

  // B cannot delete it.
  assert.equal((await b.api(`/api/subscriptions/${idA}`, { method: 'DELETE' })).status, 404);

  // A's record is untouched.
  const stillThere = await s.api(`/api/subscriptions/${idA}`);
  assert.equal(stillThere.status, 200);
  assert.equal(stillThere.body.service_name, 'Netflix');
});

test('dashboard, settings and CSV export are scoped per user', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  await s.api('/api/subscriptions', {
    method: 'POST',
    body: sampleSubscription({ price: 15.49, currency_code: 'USD' }),
  });
  await s.api('/api/settings', {
    method: 'PUT',
    body: { preferred_currency: 'GBP', monthly_budget: 250, budget_currency: 'GBP', reminder_thresholds: [3, 7] },
  });

  const { client: b } = await s.register({ name: 'Bea', email: 'bea2@example.com', password: 'bea-password-123' });

  const dashB = await b.api('/api/dashboard');
  assert.equal(dashB.body.total_count, 0);

  const settingsB = await b.api('/api/settings');
  assert.equal(settingsB.body.settings.preferred_currency, 'USD');
  assert.equal(settingsB.body.settings.monthly_budget, null);

  const csvB = await fetch(`${s.baseUrl}/api/export.csv`, { headers: { Cookie: b.cookie } });
  const textB = await csvB.text();
  assert.doesNotMatch(textB, /Netflix/);

  const csvA = await fetch(`${s.baseUrl}/api/export.csv`, { headers: { Cookie: s.cookie } });
  const textA = await csvA.text();
  assert.match(textA, /Netflix/);
});

test('login and registration endpoints are rate limited', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const client = s.makeClient();
  let lastStatus = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const res = await client.api('/api/auth/login', {
      method: 'POST',
      body: { email: DEFAULT_USER.email, password: 'wrong-password' },
    });
    lastStatus = res.status;
    if (lastStatus === 429) break;
  }
  assert.equal(lastStatus, 429);
});
