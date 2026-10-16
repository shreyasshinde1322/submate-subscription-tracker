import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLOWED_ORIGINS } from '../server/config.js';
import { startTestServer } from './helpers/server.js';

// In development the browser is served by Vite, so its Origin is the Vite
// origin even though /api is proxied to the Express API.
const DEV_ORIGIN =
  ALLOWED_ORIGINS.find((origin) => origin.endsWith(':5173')) || ALLOWED_ORIGINS[0];
const FOREIGN_ORIGIN = 'https://evil.example.com';

test('CORS uses explicit origins and never a wildcard', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  assert.ok(ALLOWED_ORIGINS.length > 0);
  assert.ok(!ALLOWED_ORIGINS.includes('*'));

  const allowed = await fetch(`${s.baseUrl}/api/health`, {
    headers: { Origin: DEV_ORIGIN },
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), DEV_ORIGIN);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');

  const foreign = await fetch(`${s.baseUrl}/api/health`, {
    headers: { Origin: FOREIGN_ORIGIN },
  });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
});

test('CORS preflight allows the trusted origin and rejects unknown origins', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const allowed = await fetch(`${s.baseUrl}/api/auth/register`, {
    method: 'OPTIONS',
    headers: { Origin: DEV_ORIGIN, 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), DEV_ORIGIN);
  assert.match(allowed.headers.get('access-control-allow-methods') || '', /POST/);

  const foreign = await fetch(`${s.baseUrl}/api/auth/register`, {
    method: 'OPTIONS',
    headers: { Origin: FOREIGN_ORIGIN, 'Access-Control-Request-Method': 'POST' },
  });
  assert.equal(foreign.status, 204);
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
});

test('registration succeeds from the trusted Vite origin (local dev)', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const res = await s.makeClient().api('/api/auth/register', {
    method: 'POST',
    headers: { Origin: DEV_ORIGIN },
    body: {
      name: 'Vite Dev',
      email: 'vite@example.com',
      password: 'vite-password-123',
      confirmPassword: 'vite-password-123',
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'vite@example.com');
});

test('state-changing requests from a foreign origin are blocked by CSRF', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const register = await s.makeClient().api('/api/auth/register', {
    method: 'POST',
    headers: { Origin: FOREIGN_ORIGIN },
    body: {
      name: 'Attacker',
      email: 'attacker@example.com',
      password: 'attacker-password-1',
      confirmPassword: 'attacker-password-1',
    },
  });
  assert.equal(register.status, 403);
  assert.equal(register.body.error.code, 'CSRF_BLOCKED');

  // The same protection covers authenticated mutations.
  const mutation = await s.api('/api/settings', {
    method: 'PUT',
    headers: { Origin: FOREIGN_ORIGIN },
    body: { preferred_currency: 'USD' },
  });
  assert.equal(mutation.status, 403);
  assert.equal(mutation.body.error.code, 'CSRF_BLOCKED');
});

test('non-browser clients without an Origin header are allowed', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const res = await s.makeClient().api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'CLI User',
      email: 'cli@example.com',
      password: 'cli-password-123',
      confirmPassword: 'cli-password-123',
    },
  });
  assert.equal(res.status, 201);
});

test('session cookie is HttpOnly, SameSite=Strict and not Secure over local HTTP', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const res = await s.makeClient().api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Cookie Check',
      email: 'cookie@example.com',
      password: 'cookie-password-1',
      confirmPassword: 'cookie-password-1',
    },
  });
  const setCookie = res.headers.get('set-cookie') || '';
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.doesNotMatch(setCookie, /;\s*Secure/i);
});

test('login succeeds after registration', async (t) => {
  const s = await startTestServer();
  t.after(() => s.close());

  const { client, response } = await s.register({
    name: 'Returning',
    email: 'returning@example.com',
    password: 'returning-pass-1',
  });
  assert.equal(response.status, 201);
  await client.api('/api/auth/logout', { method: 'POST' });

  const login = await s.makeClient().api('/api/auth/login', {
    method: 'POST',
    headers: { Origin: DEV_ORIGIN },
    body: { email: 'returning@example.com', password: 'returning-pass-1' },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'returning@example.com');
});
