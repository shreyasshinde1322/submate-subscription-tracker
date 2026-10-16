import {
  COOKIE_SAME_SITE,
  COOKIE_SECURE,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '../config.js';
import { createAuthRepository } from '../repositories/auth.js';
import { hashSessionToken, parseCookies } from '../security/tokens.js';
import { HttpError } from '../utils/errors.js';

export function readSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE_NAME] || null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
  });
}

export function authRequiredError(message, code) {
  const error = new HttpError(401, message);
  error.code = code;
  return error;
}

// Resolves the browser session cookie to a user and attaches it to the request.
// Identity always comes from the verified session — never from the client.
export function requireUser(db) {
  const repo = createAuthRepository(db);
  return async (req, res, next) => {
    try {
      const token = readSessionToken(req);
      if (!token) {
        throw authRequiredError('Sign in to continue.', 'AUTH_REQUIRED');
      }
      const session = await repo.getSessionByTokenHash(hashSessionToken(token));
      if (!session) {
        throw authRequiredError('Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
      }
      req.user = session.user;
      req.session = { tokenHash: hashSessionToken(token), expires_at: session.expires_at };
      next();
    } catch (error) {
      next(error);
    }
  };
}
