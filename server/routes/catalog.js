import { Router } from 'express';
import { CATALOG, CATEGORY_NAMES, catalogSearch, getCatalogEntry } from '../catalog/services.js';
import { NotFoundError } from '../utils/errors.js';

export function createCatalogRouter() {
  const router = Router();

  router.get('/', (req, res) => {
    const term = req.query.q ? String(req.query.q) : '';
    const services = catalogSearch(term);
    res.json({
      categories: CATEGORY_NAMES,
      count: services.length,
      total: CATALOG.length,
      services,
    });
  });

  router.get('/:serviceKey', (req, res) => {
    const entry = getCatalogEntry(req.params.serviceKey);
    if (!entry) {
      throw new NotFoundError('Catalog service not found.');
    }
    res.json(entry);
  });

  return router;
}
