import { createHash, randomBytes } from 'node:crypto';

// The raw session token is only ever sent to the browser inside the HttpOnly
// cookie. The database stores just its SHA-256 digest, so a database leak does
// not hand out usable sessions.
export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function parseCookies(header) {
  const jar = {};
  if (!header) return jar;
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    try {
      jar[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      jar[name] = part.slice(index + 1).trim();
    }
  }
  return jar;
}
