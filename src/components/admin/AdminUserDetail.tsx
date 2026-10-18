import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { adminCall, AdminUserRecords } from '../../services/adminService';
import { formatNaira, summarize } from '../../lib/finance';
import type { Invoice } from '../../services/invoiceService';
import type { Expense } from '../../services/expenseService';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="card-bento p-0 overflow-hidden">
      <h2 className="px-5 py-4 text-sm font-bold text-slate-900 border-b border-stone-200">
        {title} <span className="font-medium text-slate-500">({count})</span>
      </h2>
      {count === 0 ? <p className="px-5 py-4 text-sm text-slate-500">None.</p> : <div className="overflow-x-auto">{children}</div>}
    </section>
  );
}

const th = 'px-4 py-2 text-left text-xs uppercase tracking-wider text-slate-600';
const td = 'px-4 py-2 whitespace-nowrap';

// Read-only view of one business's records, for support. Deleting invoices is the only change allowed.
export default function AdminUserDetail({ uid, onBack, onAuthError }: { uid: string; onBack: () => void; onAuthError: (err: unknown) => void }) {
  const [data, setData] = useState<AdminUserRecords | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminCall<AdminUserRecords>('user', { uid }));
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : 'Could not load this user.');
    }
  }, [uid, onAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(
    () => (data ? summarize(data.invoices as unknown as Invoice[], data.expenses as unknown as Expense[]) : null),
    [data]
  );
  const customerName = (id: string) => data?.customers.find((c) => c.id === id)?.name || '—';

  const deleteInvoice = async (invoice: Record<string, any>) => {
    if (!window.confirm(`Permanently delete invoice ${invoice.invoice_number} (${formatNaira(invoice.total_amount || 0, 2)})? This can't be undone and is recorded in the admin log.`)) return;
    setDeleting(invoice.id);
    setError('');
    setNotice('');
    try {
      await adminCall('deleteInvoice', { uid, invoiceId: invoice.id });
      await load();
      setNotice(`Invoice ${invoice.invoice_number} deleted.`);
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : 'Could not delete the invoice.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        All users
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {!data ? (
        !error && <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="card-bento p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-emerald-900">{(data.profile?.business_name as string) || 'No business profile'}</h1>
                <p className="text-sm text-slate-600 mt-1">{data.account.email}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Signed up {formatDate(data.account.createdAt)} · last sign-in {formatDate(data.account.lastSignInAt)} ·{' '}
                  {data.account.providers.includes('google.com') ? 'Google' : 'Email'} ·{' '}
                  <span className={data.account.disabled ? 'text-red-600 font-semibold' : ''}>{data.account.disabled ? 'Disabled' : 'Active'}</span>
                </p>
              </div>
              {data.profile && (
                <dl className="text-xs text-slate-600 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="font-semibold">Owner</dt><dd>{(data.profile.full_name as string) || '—'}</dd>
                  <dt className="font-semibold">Type</dt><dd>{(data.profile.business_type as string) || '—'}</dd>
                  <dt className="font-semibold">Phone</dt><dd>{(data.profile.phone as string) || '—'}</dd>
                  <dt className="font-semibold">Location</dt><dd>{(data.profile.location as string) || '—'}</dd>
                  <dt className="font-semibold">TIN</dt><dd>{(data.profile.tax_id as string) || '—'}</dd>
                </dl>
              )}
            </div>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
                <div><p className="text-xs text-slate-500">Payments received</p><p className="font-bold">{formatNaira(summary.collected)}</p></div>
                <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold">{formatNaira(summary.outstanding)}</p></div>
                <div><p className="text-xs text-slate-500">Output / input VAT</p><p className="font-bold">{formatNaira(summary.outputVat)} / {formatNaira(summary.inputVat)}</p></div>
                <div><p className="text-xs text-slate-500">Overdue invoices</p><p className="font-bold">{summary.overdueInvoices.length}</p></div>
              </div>
            )}
          </div>

          <Section title="Invoices" count={data.invoices.length}>
            <table className="w-full text-sm">
              <thead className="bg-stone-100"><tr>
                <th className={th}>Number</th><th className={th}>Customer</th><th className={th}>Date</th><th className={th}>Due</th>
                <th className={`${th} text-right`}>Total</th><th className={`${th} text-right`}>Paid</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {[...data.invoices].sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || '')).map((inv) => (
                  <tr key={inv.id}>
                    <td className={`${td} font-medium`}>{inv.invoice_number}</td>
                    <td className={td}>{customerName(inv.customer_id)}</td>
                    <td className={td}>{formatDate(inv.invoice_date)}</td>
                    <td className={td}>{formatDate(inv.due_date)}</td>
                    <td className={`${td} text-right`}>{formatNaira(inv.total_amount || 0, 2)}</td>
                    <td className={`${td} text-right`}>{formatNaira(inv.amount_paid || 0, 2)}</td>
                    <td className={td}>{String(inv.status).replace('_', ' ')}</td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => deleteInvoice(inv)} disabled={deleting === inv.id} aria-label={`Delete invoice ${inv.invoice_number}`} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleting === inv.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Expenses" count={data.expenses.length}>
            <table className="w-full text-sm">
              <thead className="bg-stone-100"><tr>
                <th className={th}>Description</th><th className={th}>Category</th><th className={th}>Date</th><th className={`${th} text-right`}>Total</th><th className={th}>Status</th>
              </tr></thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>{e.description}</td><td className={td}>{String(e.category).replace('_', ' ')}</td>
                    <td className={td}>{formatDate(e.expense_date)}</td><td className={`${td} text-right`}>{formatNaira(e.total_amount || 0, 2)}</td><td className={td}>{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Customers" count={data.customers.length}>
            <table className="w-full text-sm">
              <thead className="bg-stone-100"><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Phone</th><th className={th}>TIN</th></tr></thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {data.customers.map((c) => (
                  <tr key={c.id}><td className={td}>{c.name}</td><td className={td}>{c.email || '—'}</td><td className={td}>{c.phone || '—'}</td><td className={td}>{c.tax_id || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="VAT returns marked filed" count={data.vatReturns.length}>
            <table className="w-full text-sm">
              <thead className="bg-stone-100"><tr><th className={th}>Period</th><th className={th}>Filed on</th><th className={`${th} text-right`}>Amount paid</th><th className={th}>Reference</th></tr></thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {data.vatReturns.map((r) => (
                  <tr key={r.id}><td className={td}>{r.period}</td><td className={td}>{formatDate(r.filed_on)}</td><td className={`${td} text-right`}>{formatNaira(r.amount_paid || 0, 2)}</td><td className={td}>{r.reference || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}
    </div>
  );
}
