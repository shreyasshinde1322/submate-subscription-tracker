import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR } from './config.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp({ db } = {}) {
  if (!db) {
    throw new Error('createApp requires an initialized database pool.');
  }
  const app = express();
  app.disable('x-powered-by');
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
