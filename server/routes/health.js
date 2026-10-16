import { Router } from 'express';

export function createHealthRouter(db) {
  const router = Router();

  router.get('/', async (_req, res) => {
    let database = 'ready';
    try {
      const result = await db.query('SELECT 1 AS ok');
      const check = result?.rows?.[0];
      if (!check || Number(check.ok) !== 1) database = 'degraded';
    } catch {
      database = 'unavailable';
    }
    res.json({
      status: database === 'ready' ? 'ok' : 'degraded',
      database,
      time: new Date().toISOString(),
    });
  });

  return router;
}
