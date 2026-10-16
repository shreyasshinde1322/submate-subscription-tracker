import { ALLOWED_ORIGINS } from '../config.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestHost(req) {
  const forwarded = (req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  return forwarded || req.headers.host || '';
}

function originHost(origin) {
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
}

function isSameOrigin(req, origin) {
  const host = requestHost(req);
  return Boolean(host) && originHost(origin) === host;
}

// CORS is opt-in and always uses an explicit origin allowlist (never "*"), since
// responses carry credentials. ALLOWED_ORIGINS is built in config.js from
// CORS_ORIGIN, Vercel's deployment URLs, and the local Vite origin in dev.
export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
}

// CSRF defence for the cookie-based session: any state-changing browser request
// must originate from the same host (or an explicitly trusted origin). Browser
// requests always carry Origin for cross-site calls, so a present-but-foreign
// Origin is rejected, while non-browser clients with no Origin are allowed.
export function csrfMiddleware(req, res, next) {
  if (SAFE_METHODS.has(req.method) || !req.path.startsWith('/api')) {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }
  if (isSameOrigin(req, origin) || ALLOWED_ORIGINS.includes(origin)) {
    return next();
  }
  return res.status(403).json({
    error: {
      message: 'This request was blocked by cross-site protection.',
      code: 'CSRF_BLOCKED',
    },
  });
}
