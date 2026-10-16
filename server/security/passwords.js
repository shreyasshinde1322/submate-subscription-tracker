import { scryptSync, timingSafeEqual } from 'node:crypto';
import { compare, hash, getRounds } from 'bcryptjs';

// bcrypt work factor. 12 is a sensible serverless default: strong, but fast
// enough to stay well inside a Vercel function's execution budget. Tests may
// lower it via BCRYPT_ROUNDS to keep the suite quick.
function currentRounds() {
  const configured = Number(process.env.BCRYPT_ROUNDS);
  return Number.isInteger(configured) && configured >= 4 ? configured : 12;
}

// Legacy local accounts stored a scrypt hash split into salt + hash columns.
// The migration folds them into the users table as `scrypt:<saltHex>:<hashHex>`
// so those passphrases keep working; on first successful login they are
// transparently upgraded to bcrypt.
const LEGACY_PREFIX = 'scrypt:';

export function isLegacyHash(stored) {
  return typeof stored === 'string' && stored.startsWith(LEGACY_PREFIX);
}

export async function hashPassword(password) {
  return hash(String(password), currentRounds());
}

function verifyLegacy(password, stored) {
  const parts = String(stored).split(':');
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (salt.length === 0 || expected.length === 0) return false;
  const computed = scryptSync(String(password), salt, expected.length);
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (isLegacyHash(stored)) return verifyLegacy(password, stored);
  try {
    return await compare(String(password), String(stored));
  } catch {
    return false;
  }
}

// True when a stored hash should be replaced after a successful login (legacy
// scrypt hashes, or bcrypt hashes using fewer rounds than the current policy).
export function needsRehash(stored) {
  if (isLegacyHash(stored)) return true;
  try {
    return getRounds(String(stored)) < currentRounds();
  } catch {
    return true;
  }
}
