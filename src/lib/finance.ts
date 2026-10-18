import type { Invoice } from '../services/invoiceService';
import type { Expense } from '../services/expenseService';
import type { Customer } from '../services/customerService';

// Pure money and VAT calculations shared by the dashboard, Smart Insights, notifications and
// the VAT report. Amounts are in naira. Dates in records are 'YYYY-MM-DD' strings and are
// compared as local calendar days.

// Nigeria: monthly VAT returns are due by the 21st of the month after the transactions
export const VAT_RETURN_DAY = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

export function vatDueDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, VAT_RETURN_DAY); // month index m is the following month
}

export function balanceDue(invoice: Invoice): number {
  return Math.max(0, (invoice.total_amount || 0) - (invoice.amount_paid || 0));
}

export function isIssued(invoice: Invoice): boolean {
  return invoice.status !== 'draft';
}

// Issued, not fully paid, and past its due date. Derived rather than stored, so it's always current.
export function isOverdue(invoice: Invoice, today: Date): boolean {
  return isIssued(invoice) && balanceDue(invoice) > 0 && !!invoice.due_date && daysBetween(parseDay(invoice.due_date), today) > 0;
}

export function daysOverdue(invoice: Invoice, today: Date): number {
  return Math.max(0, daysBetween(parseDay(invoice.due_date), today));
}

// Share of a payment that is revenue rather than VAT owed to FIRS
function exVat(invoice: Invoice, amount: number): number {
  if (!invoice.total_amount) return 0;
  return amount * ((invoice.subtotal || 0) / invoice.total_amount);
}

export interface VatPeriod {
  key: string; // 'YYYY-MM'
  label: string;
  outputVat: number; // VAT charged on issued invoices dated in the period
  inputVat: number; // VAT on approved expenses dated in the period
  netVat: number; // positive: payable; negative: credit
  invoiceCount: number;
  expenseCount: number;
  dueDate: Date;
}

export interface AgingBuckets {
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
}

export interface FinanceSummary {
  collected: number; // payments received, including VAT
  collectedExVat: number;
  invoicedTotal: number; // total of issued invoices
  outstanding: number;
  outputVat: number;
  inputVat: number;
  netVat: number;
  approvedExpensesNet: number; // excluding VAT
  approvedExpensesTotal: number; // including VAT
  profit: number; // collected revenue minus approved expenses, both excluding VAT
  issuedCount: number;
  paidCount: number;
  awaitingPaymentCount: number;
  draftInvoices: Invoice[];
  overdueInvoices: Invoice[];
  overdueAmount: number;
  aging: AgingBuckets;
  pendingExpenses: Expense[];
  periods: VatPeriod[]; // newest first
}

export function summarize(invoices: Invoice[], expenses: Expense[], today: Date = new Date()): FinanceSummary {
  const issued = invoices.filter(isIssued);
  const approved = expenses.filter((e) => e.status === 'approved');
  const sum = <T,>(items: T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0);

  const collected = sum(issued, (i) => i.amount_paid || 0);
  const collectedExVat = sum(issued, (i) => exVat(i, i.amount_paid || 0));
  const outputVat = sum(issued, (i) => i.vat_amount || 0);
  const inputVat = sum(approved, (e) => e.vat_amount || 0);
  const approvedExpensesNet = sum(approved, (e) => e.amount || 0);

  const overdueInvoices = issued
    .filter((i) => isOverdue(i, today))
    .sort((a, b) => daysOverdue(b, today) - daysOverdue(a, today));
  const aging: AgingBuckets = { days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
  for (const invoice of overdueInvoices) {
    const days = daysOverdue(invoice, today);
    const bucket = days <= 30 ? 'days1to30' : days <= 60 ? 'days31to60' : days <= 90 ? 'days61to90' : 'over90';
    aging[bucket] += balanceDue(invoice);
  }

  // VAT by calendar month: output VAT by invoice date, input VAT by expense date
  const byPeriod = new Map<string, VatPeriod>();
  const periodFor = (key: string) => {
    let period = byPeriod.get(key);
    if (!period) {
      period = { key, label: periodLabel(key), outputVat: 0, inputVat: 0, netVat: 0, invoiceCount: 0, expenseCount: 0, dueDate: vatDueDate(key) };
      byPeriod.set(key, period);
    }
    return period;
  };
  for (const invoice of issued) {
    if (!invoice.invoice_date) continue;
    const period = periodFor(periodKey(parseDay(invoice.invoice_date)));
    period.outputVat += invoice.vat_amount || 0;
    period.invoiceCount += 1;
  }
  for (const expense of approved) {
    if (!expense.expense_date) continue;
    const period = periodFor(periodKey(parseDay(expense.expense_date)));
    period.inputVat += expense.vat_amount || 0;
    period.expenseCount += 1;
  }
  const periods = Array.from(byPeriod.values())
    .map((p) => ({ ...p, netVat: p.outputVat - p.inputVat }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return {
    collected,
    collectedExVat,
    invoicedTotal: sum(issued, (i) => i.total_amount || 0),
    outstanding: sum(issued, balanceDue),
    outputVat,
    inputVat,
    netVat: outputVat - inputVat,
    approvedExpensesNet,
    approvedExpensesTotal: sum(approved, (e) => e.total_amount || 0),
    profit: collectedExVat - approvedExpensesNet,
    issuedCount: issued.length,
    paidCount: issued.filter((i) => balanceDue(i) === 0).length,
    awaitingPaymentCount: issued.filter((i) => balanceDue(i) > 0).length,
    draftInvoices: invoices.filter((i) => !isIssued(i)),
    overdueInvoices,
    overdueAmount: sum(overdueInvoices, balanceDue),
    aging,
    pendingExpenses: expenses.filter((e) => e.status === 'pending'),
    periods,
  };
}

// The VAT return the user should be thinking about now: last month's (due on the 21st of this
// month) until it's filed or its due date passes, then this month's.
export function upcomingVatReturn(summary: FinanceSummary, today: Date = new Date(), filedPeriods: Set<string> = new Set()): VatPeriod {
  const lastMonth = periodKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const thisMonth = periodKey(today);
  const key = today.getDate() <= VAT_RETURN_DAY && !filedPeriods.has(lastMonth) ? lastMonth : thisMonth;
  return (
    summary.periods.find((p) => p.key === key) ?? {
      key,
      label: periodLabel(key),
      outputVat: 0,
      inputVat: 0,
      netVat: 0,
      invoiceCount: 0,
      expenseCount: 0,
      dueDate: vatDueDate(key),
    }
  );
}

// Months with VAT activity whose return due date has passed but which aren't marked as filed
export function unfiledPastDueReturns(summary: FinanceSummary, today: Date, filedPeriods: Set<string>): VatPeriod[] {
  return summary.periods
    .filter((p) => !filedPeriods.has(p.key) && daysBetween(today, p.dueDate) < 0)
    .sort((a, b) => a.key.localeCompare(b.key));
}

// Goods and services that are generally zero-rated or exempt from VAT in Nigeria (basic food,
// medical and pharmaceutical products, educational materials, baby and sanitary products,
// agricultural inputs). Used only to prompt a check, never to decide.
const LIKELY_VAT_FREE = /\b(rice|beans|yams?|garri|cassava|maize|millet|sorghum|bread|flour|fish|meat|chicken|eggs?|milk|fruits?|vegetables?|tomato(es)?|onions?|drugs?|medicines?|medications?|pharmaceuticals?|vaccines?|tuition|school fees?|text ?books?|exercise books?|sanitary (pads?|towels?)|diapers?|baby food|fertili[sz]ers?)\b/i;

export function likelyVatFreeItems(invoice: Invoice): string[] {
  if (!invoice.apply_vat || !(invoice.vat_amount > 0)) return [];
  return (invoice.line_items || [])
    .map((item) => item.description || '')
    .filter((description) => LIKELY_VAT_FREE.test(description));
}

export interface InsightContext {
  filedPeriods?: Set<string>;
  // The business's own TIN; undefined/empty means it isn't on their invoices
  businessTin?: string | null;
}

export type InsightSeverity = 'urgent' | 'warning' | 'info' | 'success';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: { label: string; to: string };
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = { urgent: 0, warning: 1, info: 2, success: 3 };

export function formatNaira(amount: number, decimals = 0): string {
  return amount.toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' });
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Rule-based insights from the user's own records, most pressing first. Every number here is
// computed, never estimated, so the list can also be handed to an AI model as grounded facts.
export function buildInsights(
  invoices: Invoice[],
  expenses: Expense[],
  customers: Customer[],
  today: Date = new Date(),
  context: InsightContext = {}
): Insight[] {
  const s = summarize(invoices, expenses, today);
  const filedPeriods = context.filedPeriods ?? new Set<string>();
  const insights: Insight[] = [];

  if (invoices.length === 0 && expenses.length === 0) {
    return [{
      id: 'get-started',
      severity: 'info',
      title: 'Start tracking your VAT',
      description: 'Create your first invoice and record your expenses. Insights about what you owe, who owes you and when to file will appear here.',
      action: { label: 'Create invoice', to: '/invoices/create' },
    }];
  }

  // 0. Returns past their due date that haven't been marked as filed
  const unfiled = unfiledPastDueReturns(s, today, filedPeriods);
  if (unfiled.length > 0) {
    const owed = unfiled.reduce((total, p) => total + Math.max(0, p.netVat), 0);
    insights.push({
      id: 'unfiled-returns',
      severity: 'urgent',
      title: `${plural(unfiled.length, 'VAT return')} past due and not marked as filed`,
      description: `${unfiled.map((p) => p.label).join(', ')}${owed > 0 ? `, with ${formatNaira(owed)} of VAT due` : ''}. Late returns can attract penalties and interest. If you've already filed, mark them as filed in the VAT report.`,
      action: { label: 'Open VAT report', to: '/reports' },
    });
  }

  // 1. The VAT return currently due
  const lastMonth = periodKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  if (today.getDate() <= VAT_RETURN_DAY && filedPeriods.has(lastMonth)) {
    insights.push({
      id: 'vat-filed',
      severity: 'success',
      title: `${periodLabel(lastMonth)} VAT return filed`,
      description: 'Nothing more to do for that month.',
    });
  }
  const vatReturn = upcomingVatReturn(s, today, filedPeriods);
  const daysLeft = daysBetween(today, vatReturn.dueDate);
  if (vatReturn.invoiceCount + vatReturn.expenseCount > 0) {
    if (vatReturn.netVat > 0) {
      insights.push({
        id: 'vat-return',
        severity: daysLeft <= 5 ? 'urgent' : daysLeft <= 14 ? 'warning' : 'info',
        title: daysLeft >= 0
          ? `${vatReturn.label} VAT return due in ${plural(daysLeft, 'day')}`
          : `${vatReturn.label} VAT return was due ${plural(-daysLeft, 'day')} ago`,
        description: `Based on your records you owe ${formatNaira(vatReturn.netVat)} (${formatNaira(vatReturn.outputVat)} charged minus ${formatNaira(vatReturn.inputVat)} paid on expenses). File and pay by ${formatDay(vatReturn.dueDate)}.`,
        action: { label: 'View VAT report', to: '/reports' },
      });
    } else {
      insights.push({
        id: 'vat-return',
        severity: 'info',
        title: `${vatReturn.label}: no VAT to pay`,
        description: vatReturn.netVat < 0
          ? `VAT on your expenses exceeds VAT you charged by ${formatNaira(-vatReturn.netVat)}. You still need to file a return by ${formatDay(vatReturn.dueDate)}; the credit can be carried forward.`
          : `You still need to file a nil return by ${formatDay(vatReturn.dueDate)}.`,
        action: { label: 'View VAT report', to: '/reports' },
      });
    }
  }

  // 2. Overdue invoices
  if (s.overdueInvoices.length > 0) {
    const oldest = s.overdueInvoices[0];
    const oldestDays = daysOverdue(oldest, today);
    insights.push({
      id: 'overdue',
      severity: oldestDays > 30 ? 'urgent' : 'warning',
      title: `${plural(s.overdueInvoices.length, 'invoice')} overdue: ${formatNaira(s.overdueAmount)}`,
      description: `The oldest, ${oldest.invoice_number}, is ${plural(oldestDays, 'day')} past due.${s.aging.over90 > 0 ? ` ${formatNaira(s.aging.over90)} has been unpaid for over 90 days.` : ''} A reminder now improves your chances of being paid.`,
      action: { label: 'View invoice', to: `/invoices/${oldest.id}` },
    });
  }

  // 3. Expenses waiting for approval hold back VAT you can deduct
  if (s.pendingExpenses.length > 0) {
    const pendingVat = s.pendingExpenses.reduce((total, e) => total + (e.vat_amount || 0), 0);
    insights.push({
      id: 'pending-expenses',
      severity: pendingVat > 0 ? 'warning' : 'info',
      title: `${plural(s.pendingExpenses.length, 'expense')} awaiting approval`,
      description: pendingVat > 0
        ? `Approving them would deduct ${formatNaira(pendingVat)} of VAT from what you owe. Only approved expenses count.`
        : 'Approve or reject them so your profit figures are complete.',
      action: { label: 'Review expenses', to: '/expenses' },
    });
  }

  // 4. Drafts that haven't been issued
  if (s.draftInvoices.length > 0) {
    const draftTotal = s.draftInvoices.reduce((total, i) => total + (i.total_amount || 0), 0);
    insights.push({
      id: 'drafts',
      severity: 'info',
      title: `${plural(s.draftInvoices.length, 'draft invoice')} not yet issued`,
      description: `${formatNaira(draftTotal)} isn't counted in your revenue or VAT until it's issued.`,
      action: { label: 'View drafts', to: '/invoices' },
    });
  }

  // 5. Revenue concentrated in one customer
  if (s.issuedCount >= 3 && s.invoicedTotal > 0) {
    const byCustomer = new Map<string, number>();
    for (const invoice of invoices.filter(isIssued)) {
      byCustomer.set(invoice.customer_id, (byCustomer.get(invoice.customer_id) || 0) + (invoice.total_amount || 0));
    }
    const [topId, topAmount] = Array.from(byCustomer.entries()).sort((a, b) => b[1] - a[1])[0];
    const share = topAmount / s.invoicedTotal;
    if (byCustomer.size > 1 && share >= 0.5) {
      const name = customers.find((c) => c.id === topId)?.name || 'One customer';
      insights.push({
        id: 'concentration',
        severity: 'info',
        title: `${name} is ${Math.round(share * 100)}% of your invoiced revenue`,
        description: 'Relying heavily on one customer is a cash-flow risk if they pay late or leave.',
        action: { label: 'View customer', to: `/customers/${topId}` },
      });
    }
  }

  // 6. The business's own TIN, which VAT invoices should carry
  if (s.issuedCount > 0 && !context.businessTin?.trim()) {
    insights.push({
      id: 'business-tin',
      severity: 'warning',
      title: 'Your TIN isn\'t on your invoices',
      description: 'VAT invoices should show your Tax Identification Number. Add it to your business profile and it will appear on every invoice.',
      action: { label: 'Add your TIN', to: '/settings' },
    });
  }

  // 7. Customers invoiced without a TIN on record
  const invoicedCustomerIds = new Set(invoices.filter(isIssued).map((i) => i.customer_id));
  const missingTin = customers.filter((c) => invoicedCustomerIds.has(c.id) && !c.tax_id?.trim());
  if (missingTin.length > 0) {
    insights.push({
      id: 'customer-tins',
      severity: 'info',
      title: `${plural(missingTin.length, 'customer')} you've invoiced ${missingTin.length === 1 ? 'has' : 'have'} no TIN on record`,
      description: `${missingTin.slice(0, 3).map((c) => c.name).join(', ')}${missingTin.length > 3 ? ' and others' : ''}. Business customers usually need their TIN on your invoice to claim the VAT back.`,
      action: { label: missingTin.length === 1 ? 'Open customer' : 'View customers', to: missingTin.length === 1 ? `/customers/${missingTin[0].id}` : '/customers' },
    });
  }

  // 8. VAT charged on items that are often VAT-free
  const flagged = invoices.filter(isIssued).map((i) => ({ invoice: i, items: likelyVatFreeItems(i) })).filter((f) => f.items.length > 0);
  if (flagged.length > 0) {
    const examples = Array.from(new Set(flagged.flatMap((f) => f.items))).slice(0, 3).map((d) => `"${d}"`).join(', ');
    insights.push({
      id: 'vat-free-items',
      severity: 'info',
      title: `Check the VAT on ${plural(flagged.length, 'invoice')}`,
      description: `You charged VAT on ${examples}. Basic food, medical and pharmaceutical products, educational materials and some baby and agricultural products are generally zero-rated or exempt in Nigeria. Confirm before your next return.`,
      action: { label: 'View invoice', to: `/invoices/${flagged[0].invoice.id}` },
    });
  }

  // 9. Collection rate and margin
  if (s.invoicedTotal > 0) {
    const collectionRate = s.collected / s.invoicedTotal;
    if (s.collectedExVat > 0) {
      const margin = s.profit / s.collectedExVat;
      insights.push({
        id: 'margin',
        severity: margin >= 0 ? 'success' : 'warning',
        title: margin >= 0 ? `${Math.round(margin * 100)}% profit margin on collected revenue` : 'Approved expenses exceed collected revenue',
        description: `You've collected ${Math.round(collectionRate * 100)}% of what you've invoiced. Profit excludes VAT, which belongs to FIRS rather than your business.`,
      });
    } else if (s.outstanding > 0) {
      insights.push({
        id: 'no-collections',
        severity: 'info',
        title: 'No payments recorded yet',
        description: `${formatNaira(s.outstanding)} is invoiced and awaiting payment. Record payments on each invoice as they arrive.`,
        action: { label: 'View invoices', to: '/invoices' },
      });
    }
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
