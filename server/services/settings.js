import { createSettingsRepository } from '../repositories/settings.js';
import { validateSettingsInput } from '../validation/settings.js';
import { ValidationError } from '../utils/errors.js';

export function createSettingsService(db) {
  const repo = createSettingsRepository(db);

  return {
    async get(userId) {
      return repo.get(userId);
    },

    async save(userId, payload) {
      const { valid, errors, value } = validateSettingsInput(payload);
      if (!valid) throw new ValidationError(errors);
      return repo.save(userId, value);
    },
  };
}
