import React, { useMemo, useState } from 'react';
import { Download, CheckCircle2, Sparkle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useExpenses, useInvoices, useVatReturns } from '../context/DataContext';
import { markVatReturnFiled, unmarkVatReturnFiled, VatReturnRecord } from '../services/vatReturnService';
import DataErrorBanner from '../components/DataErrorBanner';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';
import { daysBetween, formatNaira, periodKey, summarize, upcomingVatReturn, VatPeriod } from '../lib/finance';

function periodStatus(period: VatPeriod, today: Date, filed?: VatReturnRecord): { label: string; tone: PillTone } {
  if (filed) return { label: `Filed ${formatShortDate(filed.filed_on)}`, tone: 'good' };
  if (period.key === periodKey(today)) return { label: 'In progress', tone: 'neutral' };
  const daysLeft = daysBetween(today, period.dueDate);
  if (daysLeft < 0) return { label: 'Not filed · past due', tone: 'bad' };
  if (daysLeft <= 7) return { label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, tone: 'bad' };
  return { label: 'Upcoming', tone: 'warn' };
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
    <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3 p-4 sm:p-5 bg-brand-canvas/60 border-t border-brand-line">
      <label className="text-xs font-medium text-brand-ink w-full sm:w-auto">
        Date filed
        <input type="date" value={filedOn} max={todayIso()} onChange={(e) => setFiledOn(e.target.value)} className="input-field mt-1 py-2 bg-white" required />
      </label>
      <label className="text-xs font-medium text-brand-ink w-full sm:w-auto">
        Amount paid (₦)
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-1 py-2 sm:w-36 bg-white" required />
      </label>
      <label className="text-xs font-medium text-brand-ink flex-1 min-w-[10rem]">
        Payment reference (optional)
        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. receipt or RRR number" className="input-field mt-1 py-2 bg-white" />
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="btn-secondary h-10">Cancel</button>
        <button type="submit" disabled={isSaving} className="btn-primary h-10">{isSaving ? 'Saving…' : 'Save'}</button>
      </div>
      {error && <p className="w-full text-xs text-brand-down">{error}</p>}
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
    <div className="space-y-5">
      <PageHeader
        title="VAT Reports"
        description="Your VAT position for each month, and when each return is due"
        actions={
          summary.periods.length > 0 && (
            <button type="button" onClick={() => downloadCsv(summary.periods, filedByPeriod)} className="btn-secondary">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )
        }
      />

      <DataErrorBanner errors={[invoicesError, expensesError, vatReturnsError, actionError]} />

      {/* Next return */}
      <section className="relative overflow-hidden bg-brand-lime rounded-[28px] p-5 sm:p-6 text-brand-ink">
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -top-4 right-2 w-36 sm:w-44 text-white/25 pointer-events-none">
          <path fill="currentColor" d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0 Z" />
        </svg>
        <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:items-end">
          <div>
            <span className="inline-flex items-center gap-3 h-10 pl-4 pr-1.5 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold uppercase tracking-wider">
              Next VAT return
              <span className="w-7 h-7 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center">
                <Sparkle className="w-3.5 h-3.5" fill="currentColor" />
              </span>
            </span>
            <p className="text-[34px] sm:text-5xl font-medium tracking-tight leading-tight mt-5">
              {nextReturn.netVat > 0 ? withNaira(formatNaira(nextReturn.netVat, 2)) : 'Nothing to pay'}
            </p>
            <p className="text-sm text-brand-ink/75 mt-1 max-w-xl">
              {nextReturn.label} return, due {formatDueDate(nextReturn.dueDate)}
              {nextDaysLeft >= 0 && ` (${nextDaysLeft === 0 ? 'today' : `in ${nextDaysLeft} day${nextDaysLeft === 1 ? '' : 's'}`})`}.
              {nextReturn.netVat < 0 && <> You have a credit of {withNaira(formatNaira(-nextReturn.netVat, 2))} to carry forward.</>}
              {nextReturn.netVat <= 0 && ' A return still needs to be filed.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-[22rem]">
            {[
              { label: 'VAT charged', value: nextReturn.outputVat, icon: <ArrowUpRight className="w-4 h-4" /> },
              { label: 'VAT on expenses', value: nextReturn.inputVat, icon: <ArrowDownLeft className="w-4 h-4" /> },
            ].map((tile) => (
              <div key={tile.label} className="rounded-2xl bg-white/35 p-4 min-w-0">
                <div className="flex items-center justify-between text-xs text-brand-ink/75">
                  <span>{tile.label}</span>
                  {tile.icon}
                </div>
                <p className="text-base sm:text-lg font-semibold mt-2 truncate">{withNaira(formatNaira(tile.value, 2))}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Monthly table */}
      <section className="card overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
          <h2 className="text-lg font-semibold text-brand-ink">By month</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading">
            <div className="w-8 h-8 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
          </div>
        ) : summary.periods.length === 0 ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <p className="text-brand-ink font-medium">No VAT activity yet</p>
            <p className="text-sm text-brand-muted mt-1">Issue invoices and approve expenses to see your monthly VAT here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 sm:px-6 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Output VAT</th>
                  <th className="px-4 py-3 text-right">Input VAT</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3">Return due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 sm:px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {summary.periods.map((period) => {
                  const filed = filedByPeriod.get(period.key);
                  const status = periodStatus(period, today, filed);
                  return (
                    <React.Fragment key={period.key}>
                    <tr className="table-row">
                      <td className="px-5 sm:px-6 py-4 font-medium text-brand-ink whitespace-nowrap">
                        {period.label}
                        <span className="block text-xs font-normal text-brand-muted">
                          {period.invoiceCount} invoice{period.invoiceCount === 1 ? '' : 's'}, {period.expenseCount} expense{period.expenseCount === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">{withNaira(formatNaira(period.outputVat, 2))}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">{withNaira(formatNaira(period.inputVat, 2))}</td>
                      <td className={`px-4 py-4 text-right font-semibold whitespace-nowrap tabular-nums ${period.netVat > 0 ? 'text-brand-ink' : 'text-brand-up'}`}>
                        {period.netVat >= 0 ? withNaira(formatNaira(period.netVat, 2)) : <>{withNaira(formatNaira(-period.netVat, 2))} credit</>}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-brand-ink">{formatDueDate(period.dueDate)}</td>
                      <td className="px-4 py-4">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        {filed && (
                          <span className="block text-xs text-brand-muted mt-1 whitespace-nowrap">
                            Paid {withNaira(formatNaira(filed.amount_paid, 2))}{filed.reference ? ` · ${filed.reference}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right whitespace-nowrap">
                        {filed ? (
                          <button type="button" onClick={() => handleUnfile(period)} className="text-xs font-semibold text-brand-muted hover:text-brand-ink hover:underline">
                            Undo
                          </button>
                        ) : period.key !== periodKey(today) && filingKey !== period.key ? (
                          <button type="button" onClick={() => setFilingKey(period.key)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold hover:bg-brand-forest-hover transition-colors">
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
      </section>

      <div className="text-xs text-brand-muted space-y-1 px-1">
        <p>
          <strong className="text-brand-ink">How this is calculated:</strong> output VAT is the VAT on issued (non-draft) invoices dated in the month. Input VAT is the
          VAT on approved expenses dated in the month. Monthly returns are due by the 21st of the following month.
        </p>
        <p>
          Mark each month as filed once you've submitted the return, so reminders stop and late returns are flagged. These are estimates from
          your records, not tax advice; confirm figures with a tax professional before filing.
        </p>
      </div>
    </div>
  );
}
