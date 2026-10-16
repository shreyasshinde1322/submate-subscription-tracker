import { Router } from 'express';
import {
  AUTH_RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
  SESSION_TTL_MS,
} from '../config.js';
import { createUsersRepository, normalizeEmail } from '../repositories/users.js';
import { createAuthRepository } from '../repositories/auth.js';
import { hashPassword, needsRehash, verifyPassword } from '../security/passwords.js';
import { generateSessionToken, hashSessionToken } from '../security/tokens.js';
import { HttpError, ValidationError } from '../utils/errors.js';
import { createAuthRateLimiter } from '../middleware/rateLimit.js';
import { authRequiredError, clearSessionCookie, readSessionToken, requireUser, setSessionCookie } from '../middleware/auth.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_MIN = 2;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

// A valid bcrypt hash used only to equalise login timing when the email is
// unknown, so attackers cannot enumerate accounts by response time.
const DUMMY_HASH = '$2b$12$kj2ucrgPz.ttzn4sdG9y8Of3uo9TBI5ochijm4oJMmoFyQRIoULJy';

function conflict(message, code) {
  const error = new HttpError(409, message);
  error.code = code;
  return error;
}

function publicUser(row) {
  return { id: Number(row.id), name: row.name, email: row.email };
}

function validateRegistration(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const confirmPassword =
    typeof input.confirmPassword === 'string' ? input.confirmPassword : '';

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = `Name must be between ${NAME_MIN} and ${NAME_MAX} characters.`;
  }
  if (!email) {
    errors.email = 'Email is required.';
  } else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.password = `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`;
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return { name, email: normalizeEmail(email), password };
}

function validateLogin(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!email) errors.email = 'Email is required.';
  if (!password) errors.password = 'Password is required.';
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return { email: normalizeEmail(email), password };
}

export function createAuthRouter(db) {
  const users = createUsersRepository(db);
  const sessions = createAuthRepository(db);
  const router = Router();

  const loginLimiter = createAuthRateLimiter(db, {
    scope: 'login',
    limit: LOGIN_RATE_LIMIT,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  });
  const registerLimiter = createAuthRateLimiter(db, {
    scope: 'register',
    limit: REGISTER_RATE_LIMIT,
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  });

  async function startSession(res, user) {
    const token = generateSessionToken();
    await sessions.createSession({
      tokenHash: hashSessionToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    setSessionCookie(res, token);
  }

  router.post('/register', registerLimiter, async (req, res, next) => {
    try {
      const { name, email, password } = validateRegistration(req.body);
      const existing = await users.findByEmail(email);
      if (existing) {
        throw conflict('An account with that email already exists.', 'EMAIL_TAKEN');
      }
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await users.create({ name, email, passwordHash });
      } catch (error) {
        if (error && error.code === '23505') {
          throw conflict('An account with that email already exists.', 'EMAIL_TAKEN');
        }
        throw error;
      }
      await startSession(res, user);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { email, password } = validateLogin(req.body);
      const account = await users.findByEmail(email);
      // Always run a verification to keep timing consistent whether or not the
      // account exists, and never reveal which field was wrong.
      const storedHash = account ? account.password_hash : DUMMY_HASH;
      const ok = await verifyPassword(password, storedHash);
      if (!account || !ok) {
        throw authRequiredError('Email or password is incorrect.', 'INVALID_CREDENTIALS');
      }
      if (needsRehash(storedHash)) {
        await users.updatePasswordHash(account.id, await hashPassword(password));
      }
      const user = { id: Number(account.id), name: account.name, email: account.email };
      await startSession(res, user);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const token = readSessionToken(req);
      if (token) {
        await sessions.deleteSession(hashSessionToken(token));
      }
      clearSessionCookie(res);
      res.json({ authenticated: false });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireUser(db), async (req, res, next) => {
    try {
      res.json({ user: publicUser(req.user) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
