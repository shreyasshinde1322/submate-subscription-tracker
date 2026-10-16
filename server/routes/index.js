import { Router } from 'express';
import { createSubscriptionsService } from '../services/subscriptions.js';
import { createSettingsService } from '../services/settings.js';
import { createHealthRouter } from './health.js';
import { createCatalogRouter } from './catalog.js';
import { createSubscriptionsRouter } from './subscriptions.js';
import { createDashboardRouter } from './dashboard.js';
import { createSettingsRouter } from './settings.js';
import { createExportHandler } from './export.js';
import { createAuthRouter, requireLocalSession } from './auth.js';

export function createApiRouter(db) {
  const subscriptionsService = createSubscriptionsService(db);
  const settingsService = createSettingsService(db);

  const router = Router();

  router.use('/health', createHealthRouter(db));
  router.use('/auth', createAuthRouter(db));

  const privateRouter = Router();
  privateRouter.use(requireLocalSession(db));
  privateRouter.use('/catalog', createCatalogRouter());
  privateRouter.use('/subscriptions', createSubscriptionsRouter(subscriptionsService));
  privateRouter.use('/dashboard', createDashboardRouter({ subscriptionsService, settingsService }));
  privateRouter.use('/settings', createSettingsRouter(settingsService));
  privateRouter.get('/export.csv', createExportHandler(subscriptionsService));
  router.use(privateRouter);

  return router;
}
