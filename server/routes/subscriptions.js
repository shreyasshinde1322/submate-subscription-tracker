import { Router } from 'express';
import { BadRequestError } from '../utils/errors.js';
import { parseSubscriptionQuery } from '../validation/query.js';

function parseId(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestError('Subscription id must be a positive integer.');
  }
  return value;
}

function isForced(query) {
  return query.force === true || query.force === 'true';
}

export function createSubscriptionsRouter(service) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const filters = parseSubscriptionQuery(req.query);
      const subscriptions = await service.list(req.user.id, filters);
      res.json({ count: subscriptions.length, subscriptions });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { record, duplicates } = await service.create(req.user.id, req.body, {
        force: isForced(req.query),
      });
      res.status(201).json({ subscription: record, duplicates });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const record = await service.get(req.user.id, parseId(req.params.id));
      res.json(record);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const { record, duplicates } = await service.update(req.user.id, id, req.body, {
        force: isForced(req.query),
      });
      res.json({ subscription: record, duplicates });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/status', async (req, res, next) => {
    try {
      const record = await service.setStatus(req.user.id, parseId(req.params.id), req.body?.status);
      res.json({ subscription: record });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await service.remove(req.user.id, parseId(req.params.id));
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
