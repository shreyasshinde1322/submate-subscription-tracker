import { Router } from 'express';
import { createSubscriptionsService } from '../services/subscriptions.js';
import { createSettingsService } from '../services/settings.js';
import { createHealthRouter } from './health.js';
import { createCatalogRouter } from './catalog.js';
import { createSubscriptionsRouter } from './subscriptions.js';
import { createDashboardRouter } from './dashboard.js';
import { createSettingsRouter } from './settings.js';
import { createExportHandler } from './export.js';
import { createAuthRouter } from './auth.js';
import { requireUser } from '../middleware/auth.js';

export function createApiRouter(db) {
  const subscriptionsService = createSubscriptionsService(db);
  const settingsService = createSettingsService(db);

  const router = Router();

  router.use('/health', createHealthRouter(db));
  router.use('/auth', createAuthRouter(db));

  // Everything below requires a verified session; the user id is derived from
  // that session and never trusted from the request body or URL.
  const privateRouter = Router();
  privateRouter.use(requireUser(db));
  privateRouter.use('/catalog', createCatalogRouter());
  privateRouter.use('/subscriptions', createSubscriptionsRouter(subscriptionsService));
  privateRouter.use('/dashboard', createDashboardRouter({ subscriptionsService, settingsService }));
  privateRouter.use('/settings', createSettingsRouter(settingsService));
  privateRouter.get('/export.csv', createExportHandler(subscriptionsService));
  router.use(privateRouter);

  return router;
}
