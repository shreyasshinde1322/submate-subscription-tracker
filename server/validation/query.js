import { BadRequestError } from '../utils/errors.js';
import { BILLING_CYCLES, STATUSES } from './subscription.js';

// Whitelisted sort columns and directions. User input never reaches SQL as a
// raw fragment.
const SORT_COLUMNS = {
  service_name: 'service_name',
  price: 'price',
  next_renewal_date: 'next_renewal_date',
  category: 'category',
  status: 'status',
  billing_cycle: 'billing_cycle',
  created_at: 'created_at',
  updated_at: 'updated_at',
};

const ORDERS = {
  asc: 'ASC',
  desc: 'DESC',
};

export const RENEWAL_WINDOWS = ['today', 'next7', 'next30', 'overdue'];

export function parseSubscriptionQuery(raw = {}) {
  const errors = {};

  const q = raw.q ? String(raw.q).trim().slice(0, 120) : '';

  const category = raw.category ? String(raw.category).trim() : '';

  let status = raw.status ? String(raw.status).trim().toLowerCase() : '';
  if (status && !STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;
    status = '';
  }

  let billingCycle = raw.billingCycle ? String(raw.billingCycle).trim().toLowerCase() : '';
  if (billingCycle && !BILLING_CYCLES.includes(billingCycle)) {
    errors.billingCycle = `Billing cycle must be one of: ${BILLING_CYCLES.join(', ')}.`;
    billingCycle = '';
  }

  const renewalWindow = raw.renewalWindow ? String(raw.renewalWindow).trim().toLowerCase() : '';
  if (renewalWindow && !RENEWAL_WINDOWS.includes(renewalWindow)) {
    errors.renewalWindow = `Renewal window must be one of: ${RENEWAL_WINDOWS.join(', ')}.`;
  }

  const sortBy = raw.sortBy ? String(raw.sortBy).trim() : 'next_renewal_date';
  if (!Object.prototype.hasOwnProperty.call(SORT_COLUMNS, sortBy)) {
    errors.sortBy = `sortBy must be one of: ${Object.keys(SORT_COLUMNS).join(', ')}.`;
  }

  const order = (raw.order ? String(raw.order).trim().toLowerCase() : 'asc');
  if (!Object.prototype.hasOwnProperty.call(ORDERS, order)) {
    errors.order = 'order must be either asc or desc.';
  }

  if (Object.keys(errors).length > 0) {
    throw new BadRequestError(Object.values(errors)[0]);
  }

  return {
    q,
    category,
    status,
    billingCycle,
    renewalWindow,
    sortColumn: SORT_COLUMNS[sortBy],
    sortOrder: ORDERS[order],
  };
}
