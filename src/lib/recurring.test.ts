import { describe, expect, it } from 'vitest';
import { dueDates, isFinished, nextAfter, occurrence, scheduleTotals } from './recurring';

const base = { active: true, end_date: null as string | null };

describe('recurring schedules', () => {
  it('keeps the day of the month, clamped to short months', () => {
    expect([0, 1, 2, 3].map((n) => occurrence('2026-01-31', 'monthly', n))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(occurrence('2028-01-31', 'monthly', 1)).toBe('2028-02-29');
    expect(occurrence('2026-11-15', 'quarterly', 1)).toBe('2027-02-15');
    expect(occurrence('2026-02-28', 'yearly', 2)).toBe('2028-02-28');
    expect(occurrence('2026-12-29', 'weekly', 1)).toBe('2027-01-05');
  });

  it('lists every date due up to today that has not been generated', () => {
    const s = { ...base, start_date: '2026-07-15', frequency: 'monthly' as const, next_date: '2026-08-15' };
    expect(dueDates(s, '2026-10-19')).toEqual(['2026-08-15', '2026-09-15', '2026-10-15']);
    expect(dueDates(s, '2026-08-14')).toEqual([]);
  });

  it('stops at the end date, when paused, and after 12 catch-up invoices', () => {
    const s = { ...base, start_date: '2026-01-01', frequency: 'monthly' as const, next_date: '2026-01-01' };
    expect(dueDates({ ...s, end_date: '2026-03-01' }, '2026-10-19')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(dueDates({ ...s, active: false }, '2026-10-19')).toEqual([]);
    expect(dueDates({ ...s, frequency: 'weekly' }, '2026-10-19')).toHaveLength(12);
  });

  it('advances to the next date and knows when a schedule has finished', () => {
    const s = { start_date: '2026-01-31', frequency: 'monthly' as const };
    expect(nextAfter(s, '2026-01-31')).toBe('2026-02-28');
    expect(nextAfter(s, '2026-02-28')).toBe('2026-03-31');
    expect(isFinished({ end_date: '2026-03-01', next_date: '2026-03-31' })).toBe(true);
    expect(isFinished({ end_date: null, next_date: '2030-01-01' })).toBe(false);
  });

  it('totals line items with optional VAT', () => {
    const items = [{ description: 'Retainer', quantity: 1, unit_price: 100000, line_total: 100000 }];
    expect(scheduleTotals({ line_items: items, apply_vat: true })).toEqual({ subtotal: 100000, vat: 7500, total: 107500 });
    expect(scheduleTotals({ line_items: items, apply_vat: false }).total).toBe(100000);
  });
});
