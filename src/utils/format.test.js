import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  daysUntil,
  formatDate,
  formatDays,
  formatMoney,
  initials,
  shortCategory,
} from './format.js';

describe('format helpers', () => {
  it('formats money with a currency code', () => {
    expect(formatMoney(20)).toBe('$20.00');
    expect(formatMoney(499, 'INR')).toBe('₹499.00');
  });

  it('formats ISO dates into friendly labels', () => {
    expect(formatDate('2026-10-31')).toBe('Oct 31, 2026');
    expect(formatDate(null)).toBe('—');
  });

  it('computes days until a given date', () => {
    expect(daysUntil('2026-10-09', '2026-10-09')).toBe(0);
    expect(daysUntil('2026-10-16', '2026-10-09')).toBe(7);
    expect(daysUntil('2026-10-05', '2026-10-09')).toBe(-4);
  });

  it('formats day counts', () => {
    expect(formatDays(0)).toBe('Due today');
    expect(formatDays(3)).toBe('In 3 days');
    expect(formatDays(-1)).toBe('Overdue by 1 day');
  });

  it('derives initials from a service name', () => {
    expect(initials('Netflix')).toBe('NE');
    expect(initials('Adobe Creative Cloud')).toBe('AC');
  });

  it('shortens category names for charts', () => {
    expect(shortCategory('Video & Streaming')).toBe('Video');
    expect(shortCategory('Gaming')).toBe('Gaming');
  });

  it('exposes a supported currency list including the currency used in the catalog sample', () => {
    expect(CURRENCIES).toContain('USD');
    expect(CURRENCIES).toContain('INR');
  });
});