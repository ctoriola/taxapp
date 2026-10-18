import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useExpenses, useInvoices, useVatReturns } from '../context/DataContext';
import { markVatReturnFiled, unmarkVatReturnFiled, VatReturnRecord } from '../services/vatReturnService';
import DataErrorBanner from '../components/DataErrorBanner';
import { daysBetween, formatNaira, periodKey, summarize, upcomingVatReturn, VatPeriod } from '../lib/finance';

function periodStatus(period: VatPeriod, today: Date, filed?: VatReturnRecord): { label: string; className: string } {
  if (filed) return { label: `Filed ${formatShortDate(filed.filed_on)}`, className: 'bg-emerald-100 text-emerald-700' };
  if (period.key === periodKey(today)) return { label: 'In progress', className: 'bg-blue-100 text-blue-700' };
  const daysLeft = daysBetween(today, period.dueDate);
  if (daysLeft < 0) return { label: 'Not filed · past due', className: 'bg-red-100 text-red-700' };
  if (daysLeft <= 7) return { label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, className: 'bg-red-100 text-red-700' };
  return { label: 'Upcoming', className: 'bg-amber-100 text-amber-700' };
}

function formatShortDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Inline form to record that a month's return was filed
function MarkFiledForm({ period, onDone }: { period: VatPeriod; onDone: () => void }) {
  const [filedOn, setFiledOn] = useState(todayIso());
  const [amount, setAmount] = useState(String(Math.max(0, Math.round(period.netVat * 100) / 100)));
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaid = Number(amount);
    if (!filedOn) return setError('Enter the date you filed');
    if (!Number.isFinite(amountPaid) || amountPaid < 0) return setError('Enter the amount you paid (0 for a nil or credit return)');
    setIsSaving(true);
    try {
      await markVatReturnFiled(period.key, { filed_on: filedOn, amount_paid: amountPaid, reference });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3 p-4 bg-stone-50">
      <label className="text-xs font-medium text-slate-700">
        Date filed
        <input type="date" value={filedOn} max={todayIso()} onChange={(e) => setFiledOn(e.target.value)} className="input-field mt-1 py-2" required />
      </label>
      <label className="text-xs font-medium text-slate-700">
        Amount paid (₦)
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-1 py-2 w-36" required />
      </label>
      <label className="text-xs font-medium text-slate-700 flex-1 min-w-[10rem]">
        Payment reference (optional)
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. receipt or RRR number" className="input-field mt-1 py-2" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary rounded-xl py-2">Cancel</button>
        <button type="submit" disabled={isSaving} className="btn-primary rounded-xl py-2">{isSaving ? 'Saving…' : 'Save'}</button>
      </div>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function downloadCsv(periods: VatPeriod[], filedByPeriod: Map<string, VatReturnRecord>) {
  const rows = [
    ['Period', 'Output VAT (NGN)', 'Input VAT (NGN)', 'Net VAT (NGN)', 'Invoices', 'Expenses', 'Return due', 'Filed on', 'Amount paid (NGN)', 'Reference'],
    ...periods.map((p) => [
      p.label,
      p.outputVat.toFixed(2),
      p.inputVat.toFixed(2),
      p.netVat.toFixed(2),
      String(p.invoiceCount),
      String(p.expenseCount),
      `${p.dueDate.getFullYear()}-${String(p.dueDate.getMonth() + 1).padStart(2, '0')}-${String(p.dueDate.getDate()).padStart(2, '0')}`,
      filedByPeriod.get(p.key)?.filed_on ?? '',
      filedByPeriod.get(p.key)?.amount_paid.toFixed(2) ?? '',
      filedByPeriod.get(p.key)?.reference ?? '',
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `vat-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { invoices, isLoading: invoicesLoading, error: invoicesError } = useInvoices();
  const { expenses, isLoading: expensesLoading, error: expensesError } = useExpenses();
  const { vatReturns, error: vatReturnsError } = useVatReturns();
  const [filingKey, setFilingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const today = new Date();
  const summary = useMemo(() => summarize(invoices, expenses, new Date()), [invoices, expenses]);
  const filedByPeriod = useMemo(() => new Map(vatReturns.map((r) => [r.period, r])), [vatReturns]);
  const nextReturn = upcomingVatReturn(summary, today, new Set(filedByPeriod.keys()));

  const handleUnfile = async (period: VatPeriod) => {
    if (!window.confirm(`Mark the ${period.label} return as not filed?`)) return;
    setActionError('');
    try {
      await unmarkVatReturnFiled(period.key);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update. Please try again.');
    }
  };
  const nextDaysLeft = daysBetween(today, nextReturn.dueDate);
  const isLoading = invoicesLoading || expensesLoading;

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">VAT Reports</h1>
            <p className="text-sm text-slate-600 mt-1">Your VAT position for each month, and when each return is due</p>
          </div>
          {summary.periods.length > 0 && (
            <button type="button" onClick={() => downloadCsv(summary.periods, filedByPeriod)} className="btn-secondary flex items-center gap-2 rounded-2xl">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        <DataErrorBanner errors={[invoicesError, expensesError, vatReturnsError, actionError]} />

        {/* Next return */}
        <div className="card-bento p-6 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-orange-700" />
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Next VAT return</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {nextReturn.netVat > 0 ? formatNaira(nextReturn.netVat, 2) : 'Nothing to pay'}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {nextReturn.label} return, due {formatDueDate(nextReturn.dueDate)}
            {nextDaysLeft >= 0 && ` (${nextDaysLeft === 0 ? 'today' : `in ${nextDaysLeft} day${nextDaysLeft === 1 ? '' : 's'}`})`}.
            {nextReturn.netVat < 0 && ` You have a credit of ${formatNaira(-nextReturn.netVat, 2)} to carry forward.`}
            {nextReturn.netVat <= 0 && ' A return still needs to be filed.'}
          </p>
        </div>

        {/* Monthly table */}
        <div className="card-bento p-0 overflow-hidden">
          {isLoading ? (
            <p className="p-8 text-center text-slate-500">Loading…</p>
          ) : summary.periods.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-700 font-medium">No VAT activity yet</p>
              <p className="text-sm text-slate-500 mt-1">Issue invoices and approve expenses to see your monthly VAT here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-left text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3 text-right">Output VAT</th>
                    <th className="px-4 py-3 text-right">Input VAT</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3">Return due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {summary.periods.map((period) => {
                    const filed = filedByPeriod.get(period.key);
                    const status = periodStatus(period, today, filed);
                    return (
                      <React.Fragment key={period.key}>
                      <tr className="bg-white">
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {period.label}
                          <span className="block text-xs font-normal text-slate-500">
                            {period.invoiceCount} invoice{period.invoiceCount === 1 ? '' : 's'}, {period.expenseCount} expense{period.expenseCount === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatNaira(period.outputVat, 2)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatNaira(period.inputVat, 2)}</td>
                        <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${period.netVat > 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                          {period.netVat >= 0 ? formatNaira(period.netVat, 2) : `${formatNaira(-period.netVat, 2)} credit`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDueDate(period.dueDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${status.className}`}>{status.label}</span>
                          {filed && (
                            <span className="block text-xs text-slate-500 mt-1 whitespace-nowrap">
                              Paid {formatNaira(filed.amount_paid, 2)}{filed.reference ? ` · ${filed.reference}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {filed ? (
                            <button type="button" onClick={() => handleUnfile(period)} className="text-xs font-semibold text-slate-500 hover:underline">
                              Undo
                            </button>
                          ) : period.key !== periodKey(today) && filingKey !== period.key ? (
                            <button type="button" onClick={() => setFilingKey(period.key)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark as filed
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      {filingKey === period.key && !filed && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <MarkFiledForm period={period} onDone={() => setFilingKey(null)} />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <p>
            <strong>How this is calculated:</strong> output VAT is the VAT on issued (non-draft) invoices dated in the month. Input VAT is the
            VAT on approved expenses dated in the month. Monthly returns are due by the 21st of the following month.
          </p>
          <p>
            Mark each month as filed once you've submitted the return, so reminders stop and late returns are flagged. These are estimates from
            your records, not tax advice; confirm figures with a tax professional before filing.
          </p>
        </div>
      </div>
    </div>
  );
}
