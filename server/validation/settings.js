import { isSupportedCurrency, normalizeCurrency } from '../services/money.js';

function parseBudget(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

function parseThresholds(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'number' ? entry : Number(String(entry).trim())));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) => Number(part));
  }
  return [Number.NaN];
}

export function validateSettingsInput(payload) {
  const input = payload && typeof payload === 'object' ? payload : {};
  const errors = {};
  const value = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key);

  // preferred_currency
  const preferred = normalizeCurrency(input.preferred_currency);
  if (!preferred) {
    errors.preferred_currency = 'Preferred currency is required.';
  } else if (!isSupportedCurrency(preferred)) {
    errors.preferred_currency = 'Unsupported currency code.';
  } else {
    value.preferred_currency = preferred;
  }

  // monthly_budget (optional, null clears the budget)
  const budget = parseBudget(input.monthly_budget);
  if (budget === null) {
    value.monthly_budget = null;
  } else if (Number.isNaN(budget)) {
    errors.monthly_budget = 'Monthly budget must be a number.';
  } else if (!Number.isFinite(budget) || budget < 0) {
    errors.monthly_budget = 'Monthly budget cannot be negative.';
  } else {
    value.monthly_budget = Math.round(budget * 100) / 100;
  }

  // budget_currency (optional)
  const budgetCurrencyRaw = has('budget_currency') ? normalizeCurrency(input.budget_currency) : '';
  if (budgetCurrencyRaw) {
    if (!isSupportedCurrency(budgetCurrencyRaw)) {
      errors.budget_currency = 'Unsupported budget currency code.';
    } else {
      value.budget_currency = budgetCurrencyRaw;
    }
  } else if (value.monthly_budget !== null && value.monthly_budget !== undefined) {
    value.budget_currency = value.preferred_currency || 'USD';
  } else {
    value.budget_currency = null;
  }

  // reminder_thresholds
  const thresholds = parseThresholds(has('reminder_thresholds') ? input.reminder_thresholds : undefined);
  if (thresholds === null) {
    value.reminder_thresholds = [3, 7];
  } else {
    const unique = [...new Set(thresholds)];
    const invalid = unique.some(
      (entry) => !Number.isInteger(entry) || entry <= 0 || entry > 365,
    );
    if (unique.length === 0) {
      errors.reminder_thresholds = 'Provide at least one reminder threshold.';
    } else if (unique.length > 10) {
      errors.reminder_thresholds = 'Please provide 10 reminder thresholds or fewer.';
    } else if (invalid) {
      errors.reminder_thresholds = 'Reminder thresholds must be positive whole days (1-365).';
    } else {
      value.reminder_thresholds = unique.sort((a, b) => a - b);
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}
