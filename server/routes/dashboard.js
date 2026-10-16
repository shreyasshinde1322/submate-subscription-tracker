import { Router } from 'express';
import { createDashboardService } from '../services/dashboard.js';

export function createDashboardRouter({ subscriptionsService, settingsService }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const dashboard = createDashboardService({ subscriptionsService, settingsService });
      res.json(await dashboard.overview(req.user.id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
