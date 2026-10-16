// Frontend formatting helpers. Keep them simple; the backend is the source of
// truth for calculations and grouping by currency.

export const CYCLE_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const STATUS_LABELS = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatMoney(amount, currency) {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency || 'USD').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`;
  }
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = String(iso).split('-').map(Number);
  if (!year || !month || !day) return String(iso);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function todayISO() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function daysUntil(iso, from = todayISO()) {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const start = Date.parse(`${from}T00:00:00Z`);
  return Math.round((target - start) / 86400000);
}

export function longDateLabel(now = new Date()) {
  return `${WEEKDAYS[now.getDay()].toUpperCase()}, ${MONTHS[now.getMonth()].toUpperCase()} ${now.getDate()}, ${now.getFullYear()}`;
}

export function initials(name) {
  const words = String(name || '').split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function readableTextColor(hex) {
  try {
    const clean = String(hex || '#8b8a83').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    return luminance > 0.6 ? '#20242b' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

const FALLBACK_COLORS = ['#dd9d53', '#9b8dc3', '#78a3bd', '#83a88b', '#d98b8b', '#c98ec9'];

export function colorFor(name) {
  const word = String(name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) {
    hash = (hash * 31 + word.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export const CATEGORY_SHORT = {
  'Video & Streaming': 'Video',
  'Music & Audio': 'Music',
  'Productivity & Collaboration': 'Productivity',
  'Developer & Creative': 'Dev & Creative',
  'Gaming': 'Gaming',
  'Shopping & Memberships': 'Shopping',
  'Cloud, Storage & Security': 'Cloud',
  'Fitness, Health & Learning': 'Health',
  'News & Reading': 'News',
  'Other': 'Other',
};

export function shortCategory(category) {
  return CATEGORY_SHORT[category] || category || 'Other';
}

export function formatDays(days) {
  const value = Number(days);
  if (Number.isNaN(value)) return '—';
  if (value === 0) return 'Due today';
  if (value < 0) return `Overdue by ${Math.abs(value)} day${Math.abs(value) === 1 ? '' : 's'}`;
  return value === 1 ? 'In 1 day' : `In ${value} days`;
}

export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK',
  'DKK', 'BRL', 'MXN', 'NZD', 'ZAR', 'SGD', 'HKD', 'CNY', 'KRW', 'AED',
  'PLN', 'TRY', 'RUB', 'SAR', 'THB', 'IDR', 'MYR', 'PHP', 'VND', 'NGN',
  'KES', 'EGP', 'PKR', 'BDT', 'LKR', 'CZK', 'HUF', 'RON', 'ILS',
].sort();