import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import ClientsLayout from '../components/ClientsLayout';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';
import { subscribeToUserCollection, UserCollection } from '../services/db';
import { fetchClientProfile } from '../services/accountantService';
import type { UserProfile, Customer } from '../services/customerService';
import type { Invoice } from '../services/invoiceService';
import type { Expense } from '../services/expenseService';
import type { VatReturnRecord } from '../services/vatReturnService';
import type { BankTransaction } from '../lib/bankImport';
import { balanceDue, daysBetween, formatNaira, isIssued, isOverdue, summarize, upcomingVatReturn } from '../lib/finance';
import { downloadCsv } from '../lib/csv';

// Read-only view of a client's records for their accountant. Reads go straight to the client's
// data; the security rules only allow them for an invited, verified accountant, and allow no writes.

function useClientCollection<T>(uid: string | undefined, name: UserCollection, orderField: string) {
  const [state, setState] = useState<{ items: T[]; isLoading: boolean; error: string }>({ items: [], isLoading: true, error: '' });
  useEffect(() => {
    if (!uid) return;
    return subscribeToUserCollection<T>(
      uid,
      name,
      orderField,
      ({ items, isLoading }) => setState({ items, isLoading, error: '' }),
      (error) => setState({ items: [], isLoading: false, error: error.code })
    );
  }, [uid, name, orderField]);
  return state;
}

const money = (n: number) => withNaira(formatNaira(n, 2));
const day = (d: string) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};
const today = () => new Date().toISOString().slice(0, 10);

type Tab = 'vat' | 'invoices' | 'expenses' | 'bank';

export default function ClientDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [profileError, setProfileError] = useState('');
  const [tab, setTab] = useState<Tab>('vat');

  useEffect(() => {
    if (!uid) return;
    fetchClientProfile(uid)
      .then(setProfile)
      .catch(() => setProfileError("You don't have access to this business, or it has been removed."));
  }, [uid]);

  const invoices = useClientCollection<Invoice>(uid, 'invoices', 'created_at');
  const expenses = useClientCollection<Expense>(uid, 'expenses', 'expense_date');
  const customers = useClientCollection<Customer>(uid, 'customers', 'created_at');
  const vatReturns = useClientCollection<VatReturnRecord>(uid, 'vatReturns', 'period');
  const bank = useClientCollection<BankTransaction>(uid, 'bankTransactions', 'date');

  const summary = useMemo(() => summarize(invoices.items, expenses.items, new Date()), [invoices.items, expenses.items]);
  const filed = useMemo(() => new Map(vatReturns.items.map((r) => [r.period, r])), [vatReturns.items]);
  const next = upcomingVatReturn(summary, new Date(), new Set(filed.keys()));
  const customerName = (id: string) => customers.items.find((c) => c.id === id)?.name || 'Customer';
  const business = profile?.business_name || 'Client';
  const slug = business.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (profileError || (profile === null)) {
    return (
      <ClientsLayout>
        <PageHeader title="Client" back={{ to: '/clients', label: 'All clients' }} />
        <p role="alert" className="rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">
          {profileError || 'This business has no profile yet.'}
        </p>
      </ClientsLayout>
    );
  }

  const exportCurrent = () => {
    if (tab === 'vat') {
      downloadCsv(`${slug}-vat-${today()}.csv`, [
        ['Period', 'Output VAT', 'Input VAT', 'Net VAT', 'Invoices', 'Expenses', 'Return due', 'Filed on', 'Amount paid', 'Reference'],
        ...summary.periods.map((p) => [p.label, p.outputVat.toFixed(2), p.inputVat.toFixed(2), p.netVat.toFixed(2), p.invoiceCount, p.expenseCount, p.dueDate.toISOString().slice(0, 10), filed.get(p.key)?.filed_on, filed.get(p.key)?.amount_paid?.toFixed(2), filed.get(p.key)?.reference]),
      ]);
    } else if (tab === 'invoices') {
      downloadCsv(`${slug}-invoices-${today()}.csv`, [
        ['Number', 'Customer', 'Invoice date', 'Due date', 'Status', 'Subtotal', 'VAT', 'Total', 'Paid', 'Outstanding'],
        ...invoices.items.map((i) => [i.invoice_number, customerName(i.customer_id), i.invoice_date, i.due_date, i.status, i.subtotal.toFixed(2), i.vat_amount.toFixed(2), i.total_amount.toFixed(2), (i.amount_paid || 0).toFixed(2), balanceDue(i).toFixed(2)]),
      ]);
    } else if (tab === 'expenses') {
      downloadCsv(`${slug}-expenses-${today()}.csv`, [
        ['Date', 'Description', 'Category', 'Status', 'Amount', 'VAT', 'Total', 'VAT applied'],
        ...expenses.items.map((e) => [e.expense_date, e.description, e.category, e.status, e.amount.toFixed(2), e.vat_amount.toFixed(2), e.total_amount.toFixed(2), e.apply_vat ? 'yes' : 'no']),
      ]);
    } else {
      downloadCsv(`${slug}-bank-${today()}.csv`, [
        ['Date', 'Description', 'Reference', 'Direction', 'Amount', 'Status'],
        ...bank.items.map((t) => [t.date, t.description, t.reference, t.direction, t.amount.toFixed(2), t.status]),
      ]);
    }
  };

  const loading = profile === undefined || invoices.isLoading || expenses.isLoading;
  const nextDays = daysBetween(new Date(), next.dueDate);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'vat', label: 'VAT by month' },
    { key: 'invoices', label: `Invoices (${invoices.items.length})` },
    { key: 'expenses', label: `Expenses (${expenses.items.length})` },
    { key: 'bank', label: `Bank (${bank.items.length})` },
  ];
  const statusTone: Record<string, PillTone> = { paid: 'good', partially_paid: 'warn', unpaid: 'neutral', draft: 'neutral', approved: 'good', pending: 'warn', rejected: 'bad', matched: 'good', expense: 'good', unreviewed: 'warn', ignored: 'neutral' };

  return (
    <ClientsLayout>
      <PageHeader
        back={{ to: '/clients', label: 'All clients' }}
        title={business}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {profile?.email}
            {profile?.tax_id ? ` · TIN ${profile.tax_id}` : ' · no TIN on file'}
            <StatusPill tone="info" icon={<Eye className="w-3 h-3" />}>View only</StatusPill>
          </span>
        }
        actions={
          <button type="button" onClick={exportCurrent} className="btn-secondary">
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: `VAT to pay · ${next.label}`, value: money(Math.max(next.netVat, 0)), sub: `Due ${day(next.dueDate.toISOString().slice(0, 10))}${nextDays >= 0 ? ` · in ${nextDays} days` : ` · ${-nextDays} days late`}`, highlight: true },
              { label: 'Payments received', value: money(summary.collected), sub: `${summary.paidCount} of ${summary.issuedCount} invoices paid` },
              { label: 'Owed by customers', value: money(summary.outstanding), sub: `${summary.overdueInvoices.length} overdue` },
              { label: 'Bank lines to review', value: String(bank.items.filter((t) => t.status === 'unreviewed').length), sub: `${bank.items.length} imported` },
            ].map((s) => (
              <div key={s.label} className={`rounded-[28px] p-4 sm:p-6 min-w-0 ${s.highlight ? 'bg-brand-lime' : 'bg-white'}`}>
                <p className={`text-xs sm:text-sm ${s.highlight ? 'text-brand-ink/75' : 'text-brand-muted'}`}>{s.label}</p>
                <p className="text-lg sm:text-[28px] font-medium tracking-tight text-brand-ink mt-3 break-all">{s.value}</p>
                <p className={`text-xs mt-1 ${s.highlight ? 'text-brand-ink/70' : 'text-brand-muted'}`}>{s.sub}</p>
              </div>
            ))}
          </div>

          <div role="tablist" aria-label="Records" className="inline-flex flex-wrap p-1 rounded-full bg-white">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${tab === t.key ? 'bg-brand-lime text-brand-ink font-semibold' : 'text-brand-muted hover:text-brand-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <section className="card overflow-hidden">
            <div className="relative overflow-x-auto">
              {tab === 'vat' && (
                <table className="w-full text-sm min-w-[720px]">
                  <thead><tr>
                    <th className="table-head px-5 py-3">Period</th><th className="table-head px-4 py-3 text-right">Output VAT</th><th className="table-head px-4 py-3 text-right">Input VAT</th>
                    <th className="table-head px-4 py-3 text-right">Net</th><th className="table-head px-4 py-3">Due</th><th className="table-head px-5 py-3">Filed</th>
                  </tr></thead>
                  <tbody>
                    {summary.periods.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-brand-muted">No VAT activity yet.</td></tr>}
                    {summary.periods.map((p) => {
                      const record = filed.get(p.key);
                      return (
                        <tr key={p.key} className="table-row">
                          <td className="px-5 py-3 font-medium whitespace-nowrap">{p.label}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{money(p.outputVat)}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{money(p.inputVat)}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold">{money(p.netVat)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{day(p.dueDate.toISOString().slice(0, 10))}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {record ? <StatusPill tone="good">Filed {day(record.filed_on)}</StatusPill> : daysBetween(new Date(), p.dueDate) < 0 ? <StatusPill tone="bad">Not filed · past due</StatusPill> : <StatusPill tone="neutral">Not filed</StatusPill>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {tab === 'invoices' && (
                <table className="w-full text-sm min-w-[760px]">
                  <thead><tr>
                    <th className="table-head px-5 py-3">Invoice</th><th className="table-head px-4 py-3">Customer</th><th className="table-head px-4 py-3">Date</th>
                    <th className="table-head px-4 py-3 text-right">VAT</th><th className="table-head px-4 py-3 text-right">Total</th><th className="table-head px-4 py-3 text-right">Owed</th><th className="table-head px-5 py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {invoices.items.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-brand-muted">No invoices.</td></tr>}
                    {[...invoices.items].sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)).map((i) => {
                      const overdue = isIssued(i) && isOverdue(i, new Date());
                      return (
                        <tr key={i.id} className="table-row">
                          <td className="px-5 py-3 font-medium whitespace-nowrap">{i.invoice_number}</td>
                          <td className="px-4 py-3">{customerName(i.customer_id)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{day(i.invoice_date)}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{money(i.vat_amount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{money(i.total_amount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{isIssued(i) ? money(balanceDue(i)) : '—'}</td>
                          <td className="px-5 py-3"><StatusPill tone={overdue ? 'bad' : statusTone[i.status] || 'neutral'}>{overdue ? 'Overdue' : i.status.replace('_', ' ')}</StatusPill></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {tab === 'expenses' && (
                <table className="w-full text-sm min-w-[720px]">
                  <thead><tr>
                    <th className="table-head px-5 py-3">Date</th><th className="table-head px-4 py-3">Description</th><th className="table-head px-4 py-3">Category</th>
                    <th className="table-head px-4 py-3 text-right">VAT</th><th className="table-head px-4 py-3 text-right">Total</th><th className="table-head px-5 py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {expenses.items.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-brand-muted">No expenses.</td></tr>}
                    {expenses.items.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="px-5 py-3 whitespace-nowrap">{day(e.expense_date)}</td>
                        <td className="px-4 py-3">{e.description}</td>
                        <td className="px-4 py-3 capitalize whitespace-nowrap">{e.category.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{e.apply_vat ? money(e.vat_amount) : <span className="text-brand-muted">none</span>}</td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{money(e.total_amount)}</td>
                        <td className="px-5 py-3"><StatusPill tone={statusTone[e.status] || 'neutral'}>{e.status}</StatusPill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === 'bank' && (
                <table className="w-full text-sm min-w-[680px]">
                  <thead><tr>
                    <th className="table-head px-5 py-3">Date</th><th className="table-head px-4 py-3">Description</th><th className="table-head px-4 py-3 text-right">Amount</th><th className="table-head px-5 py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {bank.items.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-brand-muted">No bank statements imported.</td></tr>}
                    {bank.items.map((t) => (
                      <tr key={t.id} className="table-row">
                        <td className="px-5 py-3 whitespace-nowrap">{day(t.date)}</td>
                        <td className="px-4 py-3">{t.description}</td>
                        <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold ${t.direction === 'in' ? 'text-brand-up' : 'text-brand-ink'}`}>{t.direction === 'in' ? '+' : '-'}{money(t.amount)}</td>
                        <td className="px-5 py-3"><StatusPill tone={statusTone[t.status] || 'neutral'}>{t.status === 'unreviewed' ? 'to review' : t.status}</StatusPill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          <p className="text-xs text-brand-muted">
            You have view-only access, given by {business}. Figures are calculated from their records and aren't tax advice.
          </p>
        </>
      )}
    </ClientsLayout>
  );
}
