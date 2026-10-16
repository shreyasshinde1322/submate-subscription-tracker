// Temporary end-to-end verification: runs the REAL server entry point
// (server/index.js) against a real PostgreSQL wire-protocol server (pg-mem
// over TCP) and exercises health + full subscription CRUD over HTTP.
import { spawn } from 'node:child_process';
import { newDb, DataType } from 'pg-mem';

const PORT = 3010;

function createMem() {
  const mem = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  mem.public.registerFunction({ name: 'trim', args: [DataType.text], returns: DataType.text, implementation: (v) => (v == null ? null : String(v).trim()) });
  mem.public.registerFunction({ name: 'length', args: [DataType.text], returns: DataType.int, implementation: (v) => (v == null ? null : String(v).length) });
  mem.public.registerFunction({ name: 'lower', args: [DataType.text], returns: DataType.text, implementation: (v) => (v == null ? null : String(v).toLowerCase()) });
  return mem;
}

const mem = createMem();
const wire = await mem.adapters.bindServer({ port: 55432 });
console.log('wire:', wire.postgresConnectionString);

const child = spawn(process.execPath, ['server/index.js'], {
  env: {
    ...process.env,
    DATABASE_URL: wire.postgresConnectionString,
    PG_SSL: 'false',
    PORT: String(PORT),
    HOST: '127.0.0.1',
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

let serverLog = '';
child.on('exit', (code, signal) => console.log(`[child exited code=${code} signal=${signal}]`));
child.on('error', (error) => console.log(`[child error] ${error.message}`));

const base = `http://127.0.0.1:${PORT}`;
const results = [];
let cookie = '';

async function api(path, options = {}) {
  const { body, ...rest } = options;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, body: json, text };
}

function check(label, condition, detail = '') {
  results.push(`${condition ? 'PASS' : 'FAIL'} - ${label}${detail ? ` (${detail})` : ''}`);
}

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.status === 200) return res;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not become healthy');
}

try {
  const health = await waitForHealth();
  const healthBody = await health.json();
  check('GET /api/health returns 200 ok/ready', health.status === 200 && healthBody.status === 'ok' && healthBody.database === 'ready', JSON.stringify(healthBody));

  const setup = await api('/api/auth/register', { method: 'POST', body: { name: 'E2E User', email: 'e2e@example.com', password: 'e2e-password-123', confirmPassword: 'e2e-password-123' } });
  check('POST /api/auth/register creates an account and session', setup.status === 201 && typeof setup.body?.user?.id === 'number', `status ${setup.status}`);

  const payload = {
    service_name: 'Netflix', service_key: 'netflix', logo_key: 'netflix', price: 15.49,
    currency_code: 'USD', billing_cycle: 'monthly', category: 'Video & Streaming',
    next_renewal_date: '2026-10-15', status: 'active', plan_name: 'Standard', notes: null,
  };
  const created = await api('/api/subscriptions', { method: 'POST', body: payload });
  const id = created.body?.subscription?.id;
  check('CREATE subscription returns 201', created.status === 201 && Number.isInteger(id), `status ${created.status} id ${id}`);

  const list = await api('/api/subscriptions');
  check('LIST subscriptions returns the new row', list.status === 200 && list.body?.count === 1 && list.body?.subscriptions?.[0]?.id === id, `count ${list.body?.count}`);

  const fetched = await api(`/api/subscriptions/${id}`);
  check('READ single subscription', fetched.status === 200 && fetched.body?.service_name === 'Netflix');

  const updated = await api(`/api/subscriptions/${id}`, { method: 'PUT', body: { ...payload, price: 19.99, plan_name: 'Premium' } });
  check('UPDATE subscription price/plan', updated.status === 200 && Number(updated.body?.subscription?.price) === 19.99 && updated.body?.subscription?.plan_name === 'Premium', `price ${updated.body?.subscription?.price}`);

  const paused = await api(`/api/subscriptions/${id}/status`, { method: 'PATCH', body: { status: 'paused' } });
  check('PATCH status to paused', paused.status === 200 && paused.body?.subscription?.status === 'paused');

  const dashboard = await api('/api/dashboard');
  check('GET /api/dashboard returns stats + budget', dashboard.status === 200 && dashboard.body?.total_count === 1 && typeof dashboard.body?.budget === 'object', `total ${dashboard.body?.total_count}`);

  const settings = await api('/api/settings', { method: 'PUT', body: { preferred_currency: 'GBP', monthly_budget: 250, budget_currency: 'GBP', reminder_thresholds: [3, 7] } });
  check('PUT /api/settings persists', settings.status === 200 && settings.body?.settings?.preferred_currency === 'GBP', `currency ${settings.body?.settings?.preferred_currency}`);

  const exportRes = await fetch(`${base}/api/export.csv`, { headers: { Cookie: cookie } });
  const csv = await exportRes.text();
  check('GET /api/export.csv returns CSV summary', exportRes.status === 200 && csv.includes('Service Name') && csv.includes('Netflix'), `status ${exportRes.status}`);

  const catalog = await api('/api/catalog?q=net');
  check('GET /api/catalog search works', catalog.status === 200, `status ${catalog.status}`);

  const removed = await api(`/api/subscriptions/${id}`, { method: 'DELETE' });
  check('DELETE subscription', removed.status === 200 && removed.body?.deleted === true);

  const gone = await api(`/api/subscriptions/${id}`);
  check('DELETED subscription now 404', gone.status === 404);

  const missing = await api('/api/subscriptions/9999');
  check('Unknown id returns 404', missing.status === 404);

  const invalid = await api('/api/subscriptions', { method: 'POST', body: { service_name: '' } });
  check('Invalid payload returns 400', invalid.status === 400, `status ${invalid.status}`);
} catch (error) {
  check('unexpected error', false, error.message);
} finally {
  child.kill();
  wire.close();
}

console.log(results.join('\n'));
console.log('\n--- server output ---');
console.log(serverLog.trim() || '(no server output)');
const failures = results.filter((r) => r.startsWith('FAIL'));
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
process.exit(failures.length === 0 ? 0 : 1);
