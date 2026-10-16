import { isValidDateString } from '../utils/dates.js';
import { isSupportedCurrency, normalizeCurrency } from '../services/money.js';
import { getCatalogEntry } from '../catalog/services.js';

export const BILLING_CYCLES = ['weekly', 'monthly', 'quarterly', 'yearly'];
export const STATUSES = ['active', 'paused', 'cancelled'];

const LIMITS = {
  serviceName: 120,
  category: 80,
  planName: 120,
  notes: 1000,
  serviceKey: 80,
  logoKey: 80,
};

function trimmed(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function parsePrice(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

// Validates a full subscription payload (used for both create and update).
export function validateSubscriptionInput(payload) {
  const input = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const value = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  // service_name
  const serviceName = trimmed(input.service_name);
  if (!serviceName) {
    errors.service_name = 'Service name is required.';
  } else if (serviceName.length > LIMITS.serviceName) {
    errors.service_name = `Service name must be ${LIMITS.serviceName} characters or fewer.`;
  } else {
    value.service_name = serviceName;
  }

  // price
  const price = parsePrice(input.price);
  if (Number.isNaN(price)) {
    errors.price = 'Price is required.';
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = 'Price must be greater than zero.';
  } else if (price > 1_000_000_000) {
    errors.price = 'Price is unrealistically large.';
  } else {
    value.price = Math.round(price * 100) / 100;
  }

  // currency_code
  const currency = normalizeCurrency(input.currency_code);
  if (!currency) {
    errors.currency_code = 'Currency is required.';
  } else if (!isSupportedCurrency(currency)) {
    errors.currency_code = 'Unsupported currency code.';
  } else {
    value.currency_code = currency;
  }

  // billing_cycle
  const cycle = trimmed(input.billing_cycle).toLowerCase();
  if (!cycle) {
    errors.billing_cycle = 'Billing cycle is required.';
  } else if (!BILLING_CYCLES.includes(cycle)) {
    errors.billing_cycle = 'Unsupported billing cycle.';
  } else {
    value.billing_cycle = cycle;
  }

  // category
  const category = trimmed(input.category);
  if (!category) {
    errors.category = 'Category is required.';
  } else if (category.length > LIMITS.category) {
    errors.category = `Category must be ${LIMITS.category} characters or fewer.`;
  } else {
    value.category = category;
  }

  // next_renewal_date
  const renewal = trimmed(input.next_renewal_date);
  if (!renewal) {
    errors.next_renewal_date = 'Next renewal date is required.';
  } else if (!isValidDateString(renewal)) {
    errors.next_renewal_date = 'Next renewal date must be a valid date (YYYY-MM-DD).';
  } else {
    value.next_renewal_date = renewal;
  }

  // status (optional, defaults to active)
  const status = trimmed(input.status).toLowerCase() || 'active';
  if (!STATUSES.includes(status)) {
    errors.status = 'Unsupported status.';
  } else {
    value.status = status;
  }

  // plan_name (optional)
  if (has('plan_name') && input.plan_name !== null) {
    const planName = trimmed(input.plan_name);
    if (planName.length > LIMITS.planName) {
      errors.plan_name = `Plan name must be ${LIMITS.planName} characters or fewer.`;
    } else {
      value.plan_name = planName || null;
    }
  } else {
    value.plan_name = null;
  }

  // notes (optional)
  if (has('notes') && input.notes !== null) {
    const notes = typeof input.notes === 'string' ? input.notes : String(input.notes);
    if (notes.length > LIMITS.notes) {
      errors.notes = `Notes must be ${LIMITS.notes} characters or fewer.`;
    } else {
      value.notes = notes.trim() || null;
    }
  } else {
    value.notes = null;
  }

  // service_key (optional)
  let catalogEntry = null;
  if (has('service_key') && trimmed(input.service_key)) {
    const serviceKey = trimmed(input.service_key);
    catalogEntry = getCatalogEntry(serviceKey);
    if (!catalogEntry) {
      errors.service_key = 'Unknown catalog service key.';
    } else {
      value.service_key = serviceKey;
    }
  } else {
    value.service_key = null;
  }

  // logo_key (optional)
  if (has('logo_key') && trimmed(input.logo_key)) {
    const logoKey = trimmed(input.logo_key);
    if (logoKey.length > LIMITS.logoKey) {
      errors.logo_key = 'Logo key is too long.';
    } else {
      value.logo_key = logoKey;
    }
  } else {
    value.logo_key = catalogEntry ? catalogEntry.logoKey : null;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}
