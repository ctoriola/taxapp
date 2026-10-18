import { describe, expect, it } from 'vitest';
import { buildInsights, isOverdue, likelyVatFreeItems, summarize, unfiledPastDueReturns, upcomingVatReturn, vatDueDate } from './finance';
import type { Invoice } from '../services/invoiceService';
import type { Expense } from '../services/expenseService';
import type { Customer } from '../services/customerService';

const TODAY = new Date(2026, 9, 18); // 18 October 2026

function invoice(overrides: Partial<Invoice>): Invoice {
  const subtotal = overrides.subtotal ?? 1000;
  const vat = overrides.vat_amount ?? subtotal * 0.075;
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    customer_id: 'c1',
    invoice_number: 'INV-1',
    invoice_date: '2026-10-01',
    due_date: '2026-10-31',
    notes: '',
    subtotal,
    vat_amount: vat,
    total_amount: subtotal + vat,
    amount_paid: 0,
    apply_vat: true,
    status: 'unpaid',
    line_items: [],
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function expense(overrides: Partial<Expense>): Expense {
  const amount = overrides.amount ?? 400;
  const vat = overrides.vat_amount ?? amount * 0.075;
  return {
    id: Math.random().toString(36).slice(2),
    description: 'Paper',
    amount,
    vat_amount: vat,
    total_amount: amount + vat,
    category: 'office_supplies',
    expense_date: '2026-10-05',
    status: 'approved',
    apply_vat: true,
    created_at: '2026-10-05T00:00:00.000Z',
    updated_at: '2026-10-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('summarize', () => {
  it('excludes VAT from profit and drafts from everything', () => {
    const s = summarize(
      [
        invoice({ subtotal: 2000, amount_paid: 2150, status: 'paid' }), // fully paid: 2000 revenue + 150 VAT
        invoice({ subtotal: 1000, status: 'draft' }),
      ],
      [expense({ amount: 400 }), expense({ amount: 999, status: 'rejected' })],
      TODAY
    );
    expect(s.collected).toBe(2150);
    expect(s.collectedExVat).toBeCloseTo(2000);
    expect(s.outputVat).toBe(150);
    expect(s.inputVat).toBe(30);
    expect(s.netVat).toBe(120);
    expect(s.profit).toBeCloseTo(1600); // 2000 revenue - 400 expense, both ex VAT
    expect(s.draftInvoices).toHaveLength(1);
    expect(s.issuedCount).toBe(1);
  });

  it('splits partial payments proportionally between revenue and VAT', () => {
    const s = summarize([invoice({ subtotal: 2000, amount_paid: 1075, status: 'partially_paid' })], [], TODAY);
    expect(s.collectedExVat).toBeCloseTo(1000);
    expect(s.outstanding).toBeCloseTo(1075);
  });

  it('finds overdue invoices and ages them', () => {
    const s = summarize(
      [
        invoice({ id: 'a', due_date: '2026-10-17', invoice_number: 'INV-A' }), // 1 day
        invoice({ id: 'b', due_date: '2026-06-01', invoice_number: 'INV-B' }), // 139 days
        invoice({ id: 'c', due_date: '2026-10-18' }), // due today: not overdue
        invoice({ id: 'd', due_date: '2026-01-01', status: 'paid', amount_paid: 1075 }), // paid
        invoice({ id: 'e', due_date: '2026-01-01', status: 'draft' }), // draft
      ],
      [],
      TODAY
    );
    expect(s.overdueInvoices.map((i) => i.id)).toEqual(['b', 'a']);
    expect(s.aging.days1to30).toBeCloseTo(1075);
    expect(s.aging.over90).toBeCloseTo(1075);
    expect(isOverdue(invoice({ due_date: '2026-10-18' }), TODAY)).toBe(false);
  });

  it('groups VAT by month of the invoice and expense dates', () => {
    const s = summarize(
      [invoice({ invoice_date: '2026-09-10' }), invoice({ invoice_date: '2026-10-02' })],
      [expense({ expense_date: '2026-09-30', amount: 2000 }), expense({ expense_date: '2026-10-01', status: 'pending' })],
      TODAY
    );
    expect(s.periods.map((p) => p.key)).toEqual(['2026-10', '2026-09']);
    const september = s.periods[1];
    expect(september.outputVat).toBe(75);
    expect(september.inputVat).toBe(150);
    expect(september.netVat).toBe(-75); // credit
    expect(s.periods[0].inputVat).toBe(0); // pending expense not counted
  });
});

describe('VAT due dates', () => {
  it('is the 21st of the following month, including across years', () => {
    expect(vatDueDate('2026-09')).toEqual(new Date(2026, 9, 21));
    expect(vatDueDate('2026-12')).toEqual(new Date(2027, 0, 21));
  });

  it("points at last month's return until the 21st, then this month's", () => {
    const s = summarize([], [], TODAY);
    expect(upcomingVatReturn(s, new Date(2026, 9, 21)).key).toBe('2026-09');
    expect(upcomingVatReturn(s, new Date(2026, 9, 22)).key).toBe('2026-10');
    expect(upcomingVatReturn(s, new Date(2026, 0, 5)).key).toBe('2025-12');
  });
});

describe('buildInsights', () => {
  const customers: Customer[] = [
    { id: 'big', name: 'Big Co', email: '', phone: '', tax_id: null, created_at: '', updated_at: '' },
  ];

  it('suggests getting started when there is no data', () => {
    expect(buildInsights([], [], [], TODAY).map((i) => i.id)).toEqual(['get-started']);
  });

  it("puts last month's VAT return first and reports the right amount", () => {
    const insights = buildInsights(
      [invoice({ invoice_date: '2026-09-15', subtotal: 10000 })],
      [expense({ expense_date: '2026-09-20', amount: 2000 })],
      [],
      new Date(2026, 9, 18)
    );
    const vat = insights.find((i) => i.id === 'vat-return')!;
    expect(insights[0].id).toBe('vat-return');
    expect(vat.severity).toBe('urgent'); // 3 days left
    expect(vat.title).toContain('September 2026');
    expect(vat.description).toContain('600'); // 750 output - 150 input
  });

  it('flags overdue invoices, pending expense VAT, drafts and customer concentration', () => {
    const insights = buildInsights(
      [
        invoice({ customer_id: 'big', due_date: '2026-08-01', subtotal: 10000 }),
        invoice({ customer_id: 'big', subtotal: 10000 }),
        invoice({ customer_id: 'small', subtotal: 1000 }),
        invoice({ status: 'draft' }),
      ],
      [expense({ status: 'pending', amount: 1000 })],
      customers,
      TODAY
    );
    const ids = insights.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['overdue', 'pending-expenses', 'drafts', 'concentration']));
    expect(insights.find((i) => i.id === 'overdue')!.severity).toBe('urgent'); // 78 days
    expect(insights.find((i) => i.id === 'concentration')!.title).toContain('Big Co');
    // Sorted most pressing first
    const order = { urgent: 0, warning: 1, info: 2, success: 3 };
    const severities = insights.map((i) => order[i.severity]);
    expect(severities).toEqual([...severities].sort((a, b) => a - b));
  });
});

describe('filed returns', () => {
  const sept = invoice({ invoice_date: '2026-09-15', subtotal: 10000 });
  const aug = invoice({ invoice_date: '2026-08-15', subtotal: 2000 });

  it('moves on to this month once last month is marked filed', () => {
    const s = summarize([sept], [], TODAY);
    expect(upcomingVatReturn(s, TODAY, new Set()).key).toBe('2026-09');
    expect(upcomingVatReturn(s, TODAY, new Set(['2026-09'])).key).toBe('2026-10');
  });

  it('lists past-due months that are not filed, oldest first', () => {
    const s = summarize([sept, aug, invoice({ invoice_date: '2026-07-01' })], [], TODAY);
    expect(unfiledPastDueReturns(s, TODAY, new Set()).map((p) => p.key)).toEqual(['2026-07', '2026-08']);
    expect(unfiledPastDueReturns(s, TODAY, new Set(['2026-07'])).map((p) => p.key)).toEqual(['2026-08']);
  });

  it('raises an urgent unfiled-returns insight and a filed confirmation', () => {
    const unfiled = buildInsights([sept, aug], [], [], TODAY, { businessTin: 'x' });
    expect(unfiled[0].id).toBe('unfiled-returns');
    expect(unfiled[0].description).toContain('August 2026');
    expect(unfiled[0].description).toContain('150'); // August VAT owed

    const oct = invoice({ invoice_date: '2026-10-02' });
    const filed = buildInsights([sept, aug, oct], [], [], TODAY, { filedPeriods: new Set(['2026-08', '2026-09']), businessTin: 'x' });
    const ids = filed.map((i) => i.id);
    expect(ids).not.toContain('unfiled-returns');
    expect(ids).toContain('vat-filed');
    expect(filed.find((i) => i.id === 'vat-return')!.title).toContain('October 2026');
    expect(filed.find((i) => i.id === 'vat-return')!.severity).toBe('info'); // 34 days away
  });
});

describe('compliance checks', () => {
  const customers: Customer[] = [
    { id: 'c1', name: 'Has TIN Ltd', email: '', phone: '', tax_id: '123', created_at: '', updated_at: '' },
    { id: 'c2', name: 'No TIN Ltd', email: '', phone: '', tax_id: null, created_at: '', updated_at: '' },
    { id: 'c3', name: 'Never Invoiced', email: '', phone: '', tax_id: null, created_at: '', updated_at: '' },
  ];

  it('asks for the business TIN only when invoices have been issued', () => {
    expect(buildInsights([invoice({})], [], [], TODAY).map((i) => i.id)).toContain('business-tin');
    expect(buildInsights([invoice({})], [], [], TODAY, { businessTin: '1234' }).map((i) => i.id)).not.toContain('business-tin');
    expect(buildInsights([invoice({ status: 'draft' })], [], [], TODAY).map((i) => i.id)).not.toContain('business-tin');
  });

  it('lists only invoiced customers without a TIN', () => {
    const insights = buildInsights([invoice({ customer_id: 'c1' }), invoice({ customer_id: 'c2' })], [], customers, TODAY, { businessTin: 'x' });
    const tin = insights.find((i) => i.id === 'customer-tins')!;
    expect(tin.title).toBe("1 customer you've invoiced has no TIN on record");
    expect(tin.description).toContain('No TIN Ltd');
    expect(tin.description).not.toContain('Never Invoiced');
  });

  it('flags VAT charged on commonly VAT-free items, but not other goods or VAT-free invoices', () => {
    const items = (desc: string) => [{ description: desc, quantity: 1, unit_price: 1000, line_total: 1000 }];
    expect(likelyVatFreeItems(invoice({ line_items: items('50kg bag of rice') }))).toEqual(['50kg bag of rice']);
    expect(likelyVatFreeItems(invoice({ line_items: items('Paracetamol drugs') }))).toHaveLength(1);
    expect(likelyVatFreeItems(invoice({ line_items: items('Website design') }))).toHaveLength(0);
    expect(likelyVatFreeItems(invoice({ line_items: items('Price list') }))).toHaveLength(0); // "rice" inside a word
    expect(likelyVatFreeItems(invoice({ apply_vat: false, vat_amount: 0, line_items: items('Rice') }))).toHaveLength(0);
    const insight = buildInsights([invoice({ line_items: items('Rice') })], [], [], TODAY, { businessTin: 'x' }).find((i) => i.id === 'vat-free-items');
    expect(insight?.description).toContain('"Rice"');
  });
});
