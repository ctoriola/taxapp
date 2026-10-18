import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, CalendarClock } from 'lucide-react';
import { useExpenses, useInvoices } from '../context/DataContext';
import DataErrorBanner from '../components/DataErrorBanner';
import { daysBetween, formatNaira, periodKey, summarize, upcomingVatReturn, VatPeriod } from '../lib/finance';

function periodStatus(period: VatPeriod, today: Date): { label: string; className: string } {
  if (period.key === periodKey(today)) return { label: 'In progress', className: 'bg-blue-100 text-blue-700' };
  const daysLeft = daysBetween(today, period.dueDate);
  if (daysLeft < 0) return { label: 'Due date passed', className: 'bg-slate-100 text-slate-600' };
  if (daysLeft <= 7) return { label: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, className: 'bg-red-100 text-red-700' };
  return { label: 'Upcoming', className: 'bg-amber-100 text-amber-700' };
}

function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function downloadCsv(periods: VatPeriod[]) {
  const rows = [
    ['Period', 'Output VAT (NGN)', 'Input VAT (NGN)', 'Net VAT (NGN)', 'Invoices', 'Expenses', 'Return due'],
    ...periods.map((p) => [
      p.label,
      p.outputVat.toFixed(2),
      p.inputVat.toFixed(2),
      p.netVat.toFixed(2),
      String(p.invoiceCount),
      String(p.expenseCount),
      p.dueDate.toISOString().slice(0, 10),
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
  const today = new Date();
  const summary = useMemo(() => summarize(invoices, expenses, new Date()), [invoices, expenses]);
  const nextReturn = upcomingVatReturn(summary, today);
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
            <button type="button" onClick={() => downloadCsv(summary.periods)} className="btn-secondary flex items-center gap-2 rounded-2xl">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>

        <DataErrorBanner errors={[invoicesError, expensesError]} />

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {summary.periods.map((period) => {
                    const status = periodStatus(period, today);
                    return (
                      <tr key={period.key} className="bg-white">
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
                        </td>
                      </tr>
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
          <p>These are estimates from your records, not tax advice. VATClear doesn't know which returns you've filed; confirm with a tax professional.</p>
        </div>
      </div>
    </div>
  );
}
