import { createSubscriptionsRepository } from '../repositories/subscriptions.js';
import { validateSubscriptionInput, STATUSES } from '../validation/subscription.js';
import { findPotentialDuplicates, normalizeServiceName } from './duplicates.js';
import { catalogSearch, getCatalogEntry } from '../catalog/services.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

function resolveCatalogFields(value) {
  const explicit = getCatalogEntry(value.service_key);
  if (explicit) {
    if (!value.logo_key) value.logo_key = explicit.logoKey;
    if (!value.category || value.category === 'Other') value.category = explicit.category;
    return value;
  }
  if (value.service_key) return value;
  const needle = normalizeServiceName(value.service_name);
  const match = catalogSearch(value.service_name).find(
    (entry) => normalizeServiceName(entry.name) === needle,
  );
  if (match) {
    value.service_key = match.key;
    value.logo_key = match.logoKey;
    if (!value.category || value.category === 'Other') value.category = match.category;
  }
  return value;
}

export function createSubscriptionsService(db) {
  const repo = createSubscriptionsRepository(db);

  async function guardDuplicates(userId, value, force, excludeId = null) {
    const all = await repo.listAll(userId);
    const duplicates = findPotentialDuplicates(all, value, excludeId);
    if (duplicates.length > 0 && !force) {
      throw new ConflictError('A similar subscription already exists.', {
        code: 'DUPLICATE_WARNING',
        duplicates,
      });
    }
    return duplicates;
  }

  return {
    async list(userId, query, options = {}) {
      return repo.list(userId, query, options);
    },

    async listAll(userId) {
      return repo.listAll(userId);
    },

    async get(userId, id) {
      const record = await repo.getById(userId, id);
      if (!record) throw new NotFoundError('Subscription not found.');
      return record;
    },

    async create(userId, payload, options = {}) {
      const { valid, errors, value } = validateSubscriptionInput(payload);
      if (!valid) throw new ValidationError(errors);
      resolveCatalogFields(value);
      const duplicates = await guardDuplicates(userId, value, options.force === true);
      const record = await repo.insert(userId, value);
      return { record, duplicates };
    },

    async update(userId, id, payload, options = {}) {
      const existing = await repo.getById(userId, id);
      if (!existing) throw new NotFoundError('Subscription not found.');
      const { valid, errors, value } = validateSubscriptionInput(payload);
      if (!valid) throw new ValidationError(errors);
      resolveCatalogFields(value);
      const duplicates = await guardDuplicates(userId, value, options.force === true, id);
      const record = await repo.update(userId, id, value);
      return { record, duplicates };
    },

    async setStatus(userId, id, status) {
      const normalized = String(status || '').trim().toLowerCase();
      if (!STATUSES.includes(normalized)) {
        throw new ValidationError({ status: 'Unsupported status.' });
      }
      const record = await repo.updateStatus(userId, id, normalized);
      if (!record) throw new NotFoundError('Subscription not found.');
      return record;
    },

    async remove(userId, id) {
      const existing = await repo.getById(userId, id);
      if (!existing) throw new NotFoundError('Subscription not found.');
      await repo.remove(userId, id);
      return existing;
    },

    async countByStatus(userId) {
      return repo.countByStatus(userId);
    },
  };
}
