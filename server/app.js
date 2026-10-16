import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR, IS_PRODUCTION } from './config.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { corsMiddleware, csrfMiddleware } from './middleware/security.js';

export function createApp({ db } = {}) {
  if (!db) {
    throw new Error('createApp requires an initialized database pool.');
  }
  const app = express();
  app.disable('x-powered-by');
  // Only trust the proxy in production, where Vercel's edge forwards the real
  // client IP via a single X-Forwarded-For hop (used by the rate limiter). In
  // local development trust is disabled so clients cannot spoof their IP.
  app.set('trust proxy', IS_PRODUCTION ? 1 : false);
  app.use(corsMiddleware);
  app.use(csrfMiddleware);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', createApiRouter(db));
  app.use('/api', notFoundHandler);

  // Serve the built frontend when a production build exists. The SPA fallback
  // keeps client-side navigation working without touching /api routes.
  const indexHtml = join(DIST_DIR, 'index.html');
  if (existsSync(indexHtml)) {
    app.use(express.static(DIST_DIR, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
