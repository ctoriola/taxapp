import type { Invoice } from '../services/invoiceService';
import type { Expense } from '../services/expenseService';
import type { Customer, UserProfile } from '../services/customerService';
import type { VatReturnRecord } from '../services/vatReturnService';
import { balanceDue, buildInsights, daysBetween, daysOverdue, periodKey, summarize, upcomingVatReturn } from './finance';

// The compact, already-computed picture of the business that the AI explains. The AI is told to
// use only these numbers, so everything it needs must be here and nothing should need maths.

const round = (n: number) => Math.round(n * 100) / 100;

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildAiFacts(
  invoices: Invoice[],
  expenses: Expense[],
  customers: Customer[],
  vatReturns: VatReturnRecord[],
  profile: UserProfile | null,
  today: Date = new Date()
) {
  const s = summarize(invoices, expenses, today);
  const filed = new Map(vatReturns.map((r) => [r.period, r]));
  const filedPeriods = new Set(filed.keys());
  const next = upcomingVatReturn(s, today, filedPeriods);
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Unknown customer';

  return {
    today: iso(today),
    currency: 'NGN',
    business: {
      name: profile?.business_name || null,
      type: profile?.business_type || null,
      location: profile?.location || null,
      tinOnInvoices: !!profile?.tax_id,
    },
    totals: {
      paymentsReceivedInclVat: round(s.collected),
      revenueReceivedExclVat: round(s.collectedExVat),
      totalInvoiced: round(s.invoicedTotal),
      outstandingFromCustomers: round(s.outstanding),
      outputVatCharged: round(s.outputVat),
      inputVatOnApprovedExpenses: round(s.inputVat),
      netVatAllTime: round(s.netVat),
      approvedExpensesExclVat: round(s.approvedExpensesNet),
      profitExclVat: round(s.profit),
    },
    counts: {
      invoicesIssued: s.issuedCount,
      invoicesFullyPaid: s.paidCount,
      invoicesAwaitingPayment: s.awaitingPaymentCount,
      draftInvoices: s.draftInvoices.length,
      expensesAwaitingApproval: s.pendingExpenses.length,
      customers: customers.length,
    },
    nextVatReturn: {
      period: next.label,
      dueDate: iso(next.dueDate),
      daysUntilDue: daysBetween(today, next.dueDate),
      outputVat: round(next.outputVat),
      inputVat: round(next.inputVat),
      netVat: round(next.netVat),
    },
    vatByMonth: s.periods.slice(0, 6).map((p) => {
      const record = filed.get(p.key);
      return {
        period: p.label,
        outputVat: round(p.outputVat),
        inputVat: round(p.inputVat),
        netVat: round(p.netVat),
        returnDueDate: iso(p.dueDate),
        status: record
          ? 'filed'
          : p.key === periodKey(today)
          ? 'month in progress'
          : daysBetween(today, p.dueDate) < 0
          ? 'not filed, past due'
          : 'not filed yet',
        filedOn: record?.filed_on ?? null,
        amountPaidOnFiling: record ? round(record.amount_paid) : null,
      };
    }),
    overdueInvoices: s.overdueInvoices.slice(0, 5).map((i) => ({
      invoiceNumber: i.invoice_number,
      customer: customerName(i.customer_id),
      balanceDue: round(balanceDue(i)),
      daysOverdue: daysOverdue(i, today),
    })),
    overdueAging: {
      days1to30: round(s.aging.days1to30),
      days31to60: round(s.aging.days31to60),
      days61to90: round(s.aging.days61to90),
      over90: round(s.aging.over90),
    },
    pendingExpenseVat: round(s.pendingExpenses.reduce((t, e) => t + (e.vat_amount || 0), 0)),
    appInsights: buildInsights(invoices, expenses, customers, today, { filedPeriods, businessTin: profile?.tax_id })
      .map(({ severity, title, description }) => ({ severity, title, description })),
  };
}

export type AiFacts = ReturnType<typeof buildAiFacts>;
