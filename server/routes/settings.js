import { Router } from 'express';

export function createSettingsRouter(settingsService) {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      res.json({ settings: await settingsService.get() });
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      res.json({ settings: await settingsService.save(req.body) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
