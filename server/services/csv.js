import { monthlyTotalsByCurrency } from './calculations.js';
import { round2 } from './money.js';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\n\r]/;

export function escapeCsvField(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  if (NEEDS_QUOTING.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvRow(fields) {
  return fields.map(escapeCsvField).join(',');
}

export function buildSubscriptionsCsv(subscriptions) {
  const lines = [];
  lines.push(
    toCsvRow([
      'Service Name',
      'Category',
      'Plan Name',
      'Price',
      'Currency',
      'Billing Cycle',
      'Next Renewal Date',
      'Status',
      'Notes',
    ]),
  );

  for (const subscription of subscriptions) {
    lines.push(
      toCsvRow([
        subscription.service_name,
        subscription.category,
        subscription.plan_name || '',
        subscription.price,
        subscription.currency_code,
        subscription.billing_cycle,
        subscription.next_renewal_date,
        subscription.status,
        subscription.notes || '',
      ]),
    );
  }

  lines.push('');
  lines.push(toCsvRow(['Cost summary (monthly equivalent, grouped by currency)']));
  lines.push(toCsvRow(['Currency', 'Monthly equivalent', 'Annual estimate']));

  for (const entry of monthlyTotalsByCurrency(subscriptions)) {
    lines.push(toCsvRow([entry.currency, entry.amount, round2(entry.amount * 12)]));
  }

  return `${lines.join('\r\n')}\r\n`;
}
