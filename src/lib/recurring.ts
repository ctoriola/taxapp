import type { InvoiceLineItem } from '../services/invoiceService';

// Recurring invoice schedules. Each run creates a DRAFT invoice for the owner to check and send;
// nothing is sent automatically. Dates are 'YYYY-MM-DD' local calendar days.

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoice {
  id: string;
  customer_id: string;
  line_items: Omit<InvoiceLineItem, 'id'>[];
  apply_vat: boolean;
  notes: string;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  payment_terms_days: number;
  next_date: string; // the next invoice date still to be generated
  active: boolean;
  generated_count: number;
  created_at: string;
  updated_at: string;
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  yearly: 'Yearly',
};

// Never generate more than this many invoices for one schedule in a single catch-up
export const MAX_CATCH_UP = 12;

export function toDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, days: number): string {
  const date = fromDay(day);
  date.setDate(date.getDate() + days);
  return toDay(date);
}

// The n-th occurrence after the start date. Monthly-type schedules keep the start date's day of
// the month, clamped to short months (31 Jan → 28/29 Feb → 31 Mar).
export function occurrence(startDate: string, frequency: Frequency, n: number): string {
  const start = fromDay(startDate);
  if (frequency === 'weekly') return addDays(startDate, 7 * n);
  const monthsPer = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  const monthIndex = start.getMonth() + monthsPer * n;
  const year = start.getFullYear() + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toDay(new Date(year, month, Math.min(start.getDate(), lastDay)));
}

// Index of the occurrence that falls on `day` (or the first one after it)
function occurrenceIndexFrom(schedule: Pick<RecurringInvoice, 'start_date' | 'frequency'>, day: string): number {
  let n = 0;
  while (occurrence(schedule.start_date, schedule.frequency, n) < day) n++;
  return n;
}

// Invoice dates that are due (on or before today) and not yet generated, oldest first
export function dueDates(schedule: Pick<RecurringInvoice, 'start_date' | 'end_date' | 'frequency' | 'next_date' | 'active'>, today: string): string[] {
  if (!schedule.active) return [];
  const dates: string[] = [];
  let n = occurrenceIndexFrom(schedule, schedule.next_date);
  for (;;) {
    const date = occurrence(schedule.start_date, schedule.frequency, n);
    if (date > today || (schedule.end_date && date > schedule.end_date) || dates.length >= MAX_CATCH_UP) break;
    dates.push(date);
    n++;
  }
  return dates;
}

// The next invoice date after the given one
export function nextAfter(schedule: Pick<RecurringInvoice, 'start_date' | 'frequency'>, day: string): string {
  return occurrence(schedule.start_date, schedule.frequency, occurrenceIndexFrom(schedule, addDays(day, 1)));
}

export function isFinished(schedule: Pick<RecurringInvoice, 'end_date' | 'next_date'>): boolean {
  return !!schedule.end_date && schedule.next_date > schedule.end_date;
}

export function scheduleTotals(schedule: Pick<RecurringInvoice, 'line_items' | 'apply_vat'>) {
  const subtotal = schedule.line_items.reduce((t, i) => t + (i.line_total || 0), 0);
  const vat = schedule.apply_vat ? subtotal * 0.075 : 0;
  return { subtotal, vat, total: subtotal + vat };
}
