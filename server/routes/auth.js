import { Router } from 'express';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { ConflictError, HttpError, ValidationError } from '../utils/errors.js';
import { createAuthRepository } from '../repositories/auth.js';

const SESSION_COOKIE = 'submate_session';
const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

function parseCookies(header) {
  const jar = {};
  if (!header) return jar;
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    jar[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return jar;
}

function readToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || null;
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return scryptSync(String(password), salt, 64).toString('hex');
}

function passwordMatches(storedHex, candidate, saltHex) {
  const stored = Buffer.from(String(storedHex), 'hex');
  const computed = Buffer.from(hashPassword(candidate, saltHex), 'hex');
  if (stored.length !== computed.length || stored.length === 0) return false;
  return timingSafeEqual(stored, computed);
}

function unauthorized(message, code) {
  const error = new HttpError(401, message);
  error.code = code;
  return error;
}

function validateSetupPayload(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (username.length < 2 || username.length > 60) {
    errors.username = 'Your name must be between 2 and 60 characters.';
  }
  if (password.length < 10 || password.length > 200) {
    errors.password = 'Passphrase must be between 10 and 200 characters.';
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return { username, password };
}

function validateLoginPayload(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const password = typeof input.password === 'string' ? input.password : '';
  if (!password) {
    errors.password = 'Passphrase is required.';
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return { password };
}

async function createSessionAndCookie(repo, res, token) {
  await repo.createSession(hashToken(token));
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function createAuthRouter(db) {
  const repo = createAuthRepository(db);
  const router = Router();

  router.get('/status', async (req, res, next) => {
    try {
      const account = await repo.getLocalAccount();
      const token = readToken(req);
      let authenticated = false;
      if (account && token) {
        authenticated = Boolean(await repo.getSessionByTokenHash(hashToken(token)));
      }
      res.json({
        configured: Boolean(account),
        authenticated,
        username: account ? account.username : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/setup', async (req, res, next) => {
    try {
      const { username, password } = validateSetupPayload(req.body);
      const existing = await repo.getLocalAccount();
      if (existing) {
        throw new ConflictError('This local tracker is already set up.', {
          code: 'ALREADY_SETUP',
        });
      }
      const salt = randomBytes(16).toString('hex');
      await repo.saveLocalAccount({
        username,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
      });
      const token = randomBytes(32).toString('base64url');
      await createSessionAndCookie(repo, res, token);
      res.json({ authenticated: true, username });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { password } = validateLoginPayload(req.body);
      const account = await repo.getLocalAccount();
      if (!account) {
        throw unauthorized('Set up this local tracker before opening its data.', 'SETUP_REQUIRED');
      }
      if (!passwordMatches(account.password_hash, password, account.password_salt)) {
        throw unauthorized('Passphrase not recognised.', 'INVALID_CREDENTIALS');
      }
      const token = randomBytes(32).toString('base64url');
      await createSessionAndCookie(repo, res, token);
      res.json({ authenticated: true, username: account.username });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const token = readToken(req);
      if (token) await repo.deleteSession(hashToken(token));
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      res.json({ authenticated: false });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function requireLocalSession(db) {
  const repo = createAuthRepository(db);
  return async (req, res, next) => {
    try {
      const account = await repo.getLocalAccount();
      if (!account) {
        throw unauthorized('Set up this local tracker before opening its data.', 'SETUP_REQUIRED');
      }
      const token = readToken(req);
      if (!token) {
        throw unauthorized('Unlock your local tracker to continue.', 'AUTH_REQUIRED');
      }
      const session = await repo.getSessionByTokenHash(hashToken(token));
      if (!session) {
        throw unauthorized('Session expired. Unlock the tracker again.', 'SESSION_EXPIRED');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
