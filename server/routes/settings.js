import { Router } from 'express';

export function createSettingsRouter(settingsService) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      res.json({ settings: await settingsService.get(req.user.id) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      res.json({ settings: await settingsService.save(req.user.id, req.body) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
