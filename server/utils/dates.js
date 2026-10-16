// Calendar-date helpers. Renewal dates are stored as plain YYYY-MM-DD strings
// and never treated as timezone-shifting timestamps.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function parseDateString(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  const probe = new Date(ms);
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, ms };
}

export function isValidDateString(value) {
  return parseDateString(value) !== null;
}

// Today's local calendar date as YYYY-MM-DD.
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function toISO(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function daysBetween(fromDate, toDate) {
  const from = parseDateString(fromDate);
  const to = parseDateString(toDate);
  if (!from || !to) throw new Error('Invalid calendar date supplied to daysBetween');
  return Math.round((to.ms - from.ms) / 86400000);
}

export function daysUntil(dateStr, todayStr) {
  return daysBetween(todayStr, dateStr);
}

export function addDays(dateStr, amount) {
  const parsed = parseDateString(dateStr);
  if (!parsed) throw new Error('Invalid calendar date supplied to addDays');
  const shifted = new Date(parsed.ms + amount * 86400000);
  return toISO(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatReadable(dateStr) {
  const parsed = parseDateString(dateStr);
  if (!parsed) return dateStr;
  return `${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export function monthLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
