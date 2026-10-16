// Fixed-window rate limiting backed by PostgreSQL. Because the counter lives in
// the database rather than process memory, it keeps working across Vercel's
// serverless instances and cold starts.
export function clientKey(req) {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

export function createAuthRateLimiter(db, { scope, limit, windowMs }) {
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error('createAuthRateLimiter requires a positive limit');
  }

  return async function rateLimit(req, res, next) {
    const key = `${scope}:${clientKey(req)}`;
    try {
      const now = Date.now();
      const windowStart = new Date(now - windowMs);

      const bumped = await db.query(
        `UPDATE auth_rate_limits
            SET attempts = attempts + 1, updated_at = NOW()
          WHERE key = $1 AND window_start > $2
          RETURNING attempts`,
        [key, windowStart],
      );

      let attempts;
      if (bumped.rows[0]) {
        attempts = Number(bumped.rows[0].attempts);
      } else {
        const started = await db.query(
          `INSERT INTO auth_rate_limits (key, attempts, window_start, updated_at)
           VALUES ($1, 1, $2, NOW())
           ON CONFLICT (key) DO UPDATE
             SET attempts = 1, window_start = $2, updated_at = NOW()
           RETURNING attempts`,
          [key, new Date(now)],
        );
        attempts = Number(started.rows[0].attempts);
      }

      if (attempts > limit) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: {
            message: 'Too many attempts. Please wait a few minutes and try again.',
            code: 'RATE_LIMITED',
          },
        });
      }
      return next();
    } catch (error) {
      // If the limiter store is unavailable, allow the request through: the
      // credential check that follows still fails safely if the DB is down.
      console.error('[submate] Rate limiter unavailable:', error && error.message);
      return next();
    }
  };
}
