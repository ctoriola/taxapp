import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Landmark, ArrowDownLeft, ArrowUpRight, Check, X, Undo2, Receipt, FileSpreadsheet, AlertCircle, Link2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusPill from '../components/StatusPill';
import { Panel, PanelTitle, withNaira } from '../components/dashboard/ui';
import { useBankTransactions, useCustomers, useExpenses, useInvoices } from '../context/DataContext';
import { balanceDue, formatNaira, isIssued } from '../lib/finance';
import {
  BankTransaction,
  Cell,
  ColumnMap,
  detectColumns,
  findHeaderRow,
  fingerprintId,
  mappingProblem,
  MatchCandidate,
  parseCsv,
  suggestMatches,
  toTransactions,
  TransactionStatus,
} from '../lib/bankImport';
import { matchToInvoice, recordAsExpense, saveTransactions, setTransactionStatus, undoMatch } from '../services/bankService';

const money = (n: number) => withNaira(formatNaira(n, 2));

function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- Import ----------

const FIELDS: { key: keyof ColumnMap; label: string; hint?: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'reference', label: 'Reference', hint: 'optional' },
  { key: 'credit', label: 'Money in (credit)' },
  { key: 'debit', label: 'Money out (debit)' },
  { key: 'amount', label: 'Single amount column', hint: 'if there are no debit/credit columns' },
  { key: 'balance', label: 'Balance', hint: 'optional' },
];

async function readFile(file: File): Promise<Cell[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') return parseCsv(await file.text());
  if (name.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file)) as Cell[][];
  }
  throw new Error('Use a CSV or Excel (.xlsx) export of your statement. PDF statements are coming later.');
}

function ImportPanel({ existingIds, onClose }: { existingIds: Set<string>; onClose: (imported: number) => void }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Cell[][] | null>(null);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setIsBusy(true);
    try {
      const data = await readFile(file);
      if (data.length < 2) throw new Error('That file has no transactions in it.');
      const header = findHeaderRow(data);
      setRows(data);
      setHeaderIndex(header);
      setMap(detectColumns(data[header]));
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file couldn't be read.");
    } finally {
      setIsBusy(false);
    }
  };

  const header = rows ? rows[headerIndex] : [];
  const problem = map ? mappingProblem(map) : null;
  const parsed = useMemo(() => (rows && map && !problem ? toTransactions(rows, headerIndex, map) : null), [rows, map, headerIndex, problem]);
  const fresh = parsed ? parsed.rows.filter((r) => !existingIds.has(fingerprintId(r.fingerprint))) : [];
  const duplicates = parsed ? parsed.rows.length - fresh.length : 0;

  const importNow = async () => {
    if (!fresh.length) return;
    setIsBusy(true);
    setError('');
    try {
      onClose(await saveTransactions(fresh, fileName));
    } catch {
      setError("Couldn't save the transactions. Please try again.");
      setIsBusy(false);
    }
  };

  return (
    <Panel>
      <PanelTitle
        icon={<FileSpreadsheet className="w-[18px] h-[18px]" />}
        title="Import a bank statement"
        action={
          <button type="button" onClick={() => onClose(0)} aria-label="Close import" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-brand-canvas">
            <X className="w-4 h-4" />
          </button>
        }
      />
      {error && (
        <p role="alert" className="mb-4 flex gap-2 rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {!rows ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-line bg-brand-canvas/50 px-4 py-10 text-center cursor-pointer hover:border-brand-forest/40 transition-colors">
          <Upload className="w-6 h-6 text-brand-ink" />
          <span className="text-sm font-medium text-brand-ink">{isBusy ? 'Reading file…' : 'Choose a CSV or Excel statement'}</span>
          <span className="text-xs text-brand-muted max-w-sm">Download it from your bank's internet banking. Lines you've already imported are skipped automatically.</span>
          <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choose} disabled={isBusy} className="sr-only" aria-label="Choose statement file" />
        </label>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-brand-muted">
            <span className="font-semibold text-brand-ink">{fileName}</span>. Check the columns below; we've guessed them from the headings.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="bank-header-row" className="field-label">Heading row</label>
              <select
                id="bank-header-row"
                value={headerIndex}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setHeaderIndex(i);
                  setMap(detectColumns(rows[i]));
                }}
                className="input-field"
              >
                {rows.slice(0, 30).map((r, i) => (
                  <option key={i} value={i}>Row {i + 1}: {r.filter((c) => c !== null && c !== '').slice(0, 3).join(' · ').slice(0, 40)}</option>
                ))}
              </select>
            </div>
            {map &&
              FIELDS.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`bank-col-${field.key}`} className="field-label">
                    {field.label} {field.hint && <span className="font-normal text-brand-muted">({field.hint})</span>}
                  </label>
                  <select
                    id={`bank-col-${field.key}`}
                    value={map[field.key] ?? ''}
                    onChange={(e) => setMap({ ...map, [field.key]: e.target.value === '' ? null : Number(e.target.value) })}
                    className="input-field"
                  >
                    <option value="">Not in this file</option>
                    {header.map((h, i) => (
                      <option key={i} value={i}>{String(h ?? '').trim() || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
          </div>

          {problem ? (
            <p role="alert" className="text-sm text-brand-orange font-medium">{problem}</p>
          ) : parsed && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <StatusPill tone="good">{fresh.length} new</StatusPill>
                {duplicates > 0 && <StatusPill tone="neutral">{duplicates} already imported</StatusPill>}
                {parsed.skipped > 0 && <StatusPill tone="neutral">{parsed.skipped} rows skipped (totals, blanks or no date)</StatusPill>}
              </div>
              <div className="relative overflow-x-auto rounded-2xl border border-brand-line">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="table-head px-4 py-2">Date</th>
                      <th className="table-head px-4 py-2">Description</th>
                      <th className="table-head px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 6).map((r) => (
                      <tr key={r.fingerprint} className="table-row">
                        <td className="px-4 py-2 whitespace-nowrap">{formatDay(r.date)}</td>
                        <td className="px-4 py-2 truncate max-w-[18rem]">{r.description}</td>
                        <td className={`px-4 py-2 text-right whitespace-nowrap tabular-nums font-semibold ${r.direction === 'in' ? 'text-brand-up' : 'text-brand-down'}`}>
                          {r.direction === 'in' ? '+' : '-'}
                          {money(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 6 && <p className="text-xs text-brand-muted">Showing 6 of {parsed.rows.length}.</p>}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={importNow} disabled={isBusy || !!problem || fresh.length === 0} className="btn-primary">
              <Check className="w-4 h-4" />
              {isBusy ? 'Importing…' : `Import ${fresh.length} transaction${fresh.length === 1 ? '' : 's'}`}
            </button>
            <button type="button" onClick={() => setRows(null)} disabled={isBusy} className="btn-secondary">Choose another file</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- Review ----------

type Tab = 'review' | 'matched' | 'expense' | 'ignored' | 'all';

const TAB_FILTER: Record<Tab, (t: BankTransaction) => boolean> = {
  review: (t) => t.status === 'unreviewed',
  matched: (t) => t.status === 'matched',
  expense: (t) => t.status === 'expense',
  ignored: (t) => t.status === 'ignored',
  all: () => true,
};

export default function BankPage() {
  const { transactions, isLoading, error } = useBankTransactions();
  const { invoices } = useInvoices();
  const { customers } = useCustomers();
  const { expenses } = useExpenses();
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('review');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [picking, setPicking] = useState<string | null>(null);

  const existingIds = useMemo(() => new Set(transactions.map((t) => t.id)), [transactions]);
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Customer';
  const candidates: MatchCandidate[] = useMemo(
    () =>
      invoices
        .filter((i) => isIssued(i) && balanceDue(i) > 0)
        .map((i) => ({ id: i.id, invoice_number: i.invoice_number, customer_name: customerName(i.customer_id), outstanding: balanceDue(i), invoice_date: i.invoice_date })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, customers]
  );
  const invoiceNumber = (id?: string | null) => invoices.find((i) => i.id === id)?.invoice_number || 'invoice';

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || a.fingerprint.localeCompare(b.fingerprint));
  const visible = sorted.filter(TAB_FILTER[tab]);
  const count = (status: TransactionStatus) => transactions.filter((t) => t.status === status).length;
  const totalIn = transactions.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0);

  const run = async (id: string, action: () => Promise<unknown>, success?: string) => {
    setBusyId(id);
    setActionError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
      setPicking(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'That didn\'t work. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'review', label: `To review (${count('unreviewed')})` },
    { key: 'matched', label: `Matched (${count('matched')})` },
    { key: 'expense', label: `Expenses (${count('expense')})` },
    { key: 'ignored', label: `Ignored (${count('ignored')})` },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank"
        description="Import statements, match payments to invoices, and turn spending into expenses."
        actions={
          !isImporting && (
            <button type="button" onClick={() => setIsImporting(true)} className="btn-primary">
              <Upload className="w-4 h-4" />
              Import statement
            </button>
          )
        }
      />

      {(error || actionError) && <p role="alert" className="rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">{error || actionError}</p>}
      {notice && <p role="status" className="rounded-2xl bg-brand-lime/40 px-4 py-3 text-sm text-brand-forest">{notice}</p>}

      {isImporting && (
        <ImportPanel
          existingIds={existingIds}
          onClose={(imported) => {
            setIsImporting(false);
            if (imported) {
              setTab('review');
              setNotice(`Imported ${imported} transaction${imported === 1 ? '' : 's'}. Review them below.`);
            }
          }}
        />
      )}

      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'To review', value: String(count('unreviewed')), highlight: true },
            { label: 'Money in', value: formatNaira(totalIn, 2) },
            { label: 'Money out', value: formatNaira(totalOut, 2) },
            { label: 'Matched to invoices', value: formatNaira(transactions.filter((t) => t.status === 'matched').reduce((s, t) => s + (t.matched_amount || 0), 0), 2) },
          ].map((s) => (
            <div key={s.label} className={`rounded-[28px] p-4 sm:p-6 min-w-0 ${s.highlight ? 'bg-brand-lime' : 'bg-white'}`}>
              <p className={`text-xs sm:text-sm ${s.highlight ? 'text-brand-ink/75' : 'text-brand-muted'}`}>{s.label}</p>
              <p className="text-lg sm:text-[28px] font-medium tracking-tight text-brand-ink mt-3 break-all">{withNaira(s.value)}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
        </div>
      ) : transactions.length === 0 ? (
        !isImporting && (
          <Panel className="text-center py-12">
            <span className="inline-flex w-12 h-12 rounded-full bg-brand-lime items-center justify-center text-brand-forest mb-4">
              <Landmark className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-semibold text-brand-ink">No bank transactions yet</h2>
            <p className="text-sm text-brand-muted mt-1 max-w-md mx-auto">
              Import a CSV or Excel statement to match customer payments to invoices and record spending as expenses.
            </p>
            <button type="button" onClick={() => setIsImporting(true)} className="btn-primary mt-5">
              <Upload className="w-4 h-4" />
              Import statement
            </button>
          </Panel>
        )
      ) : (
        <>
          <div role="tablist" aria-label="Filter transactions" className="inline-flex flex-wrap p-1 rounded-full bg-white">
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
            {visible.length === 0 ? (
              <p className="p-8 text-center text-sm text-brand-muted">{tab === 'review' ? 'All caught up. Nothing left to review.' : 'Nothing here yet.'}</p>
            ) : (
              <ul>
                {visible.map((t) => {
                  const suggestions = t.direction === 'in' && t.status === 'unreviewed' ? suggestMatches(t, candidates) : [];
                  const expense = t.expense_id ? expenses.find((e) => e.id === t.expense_id) : undefined;
                  const busy = busyId === t.id;
                  return (
                    <li key={t.id} className="border-t border-brand-line first:border-t-0 px-5 sm:px-6 py-4">
                      <div className="flex flex-wrap items-start gap-3">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.direction === 'in' ? 'bg-brand-lime/60 text-brand-forest' : 'bg-brand-canvas text-brand-ink'}`} aria-hidden="true">
                          {t.direction === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-brand-ink break-words">{t.description || '(no description)'}</p>
                          <p className="text-xs text-brand-muted">
                            {formatDay(t.date)}
                            {t.reference && ` · ${t.reference}`} · {t.direction === 'in' ? 'Money in' : 'Money out'}
                          </p>
                        </div>
                        <p className={`text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap ${t.direction === 'in' ? 'text-brand-up' : 'text-brand-ink'}`}>
                          {t.direction === 'in' ? '+' : '-'}
                          {money(t.amount)}
                        </p>
                      </div>

                      <div className="mt-3 sm:pl-[3.25rem] flex flex-wrap items-center gap-2">
                        {t.status === 'unreviewed' && t.direction === 'in' && (
                          <>
                            {suggestions.map((s) => (
                              <button
                                key={s.invoice.id}
                                type="button"
                                disabled={busy}
                                onClick={() => run(t.id, () => matchToInvoice(t, s.invoice.id), `Payment recorded on ${s.invoice.invoice_number}.`)}
                                title={s.reason}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-brand-lime text-brand-ink text-xs font-semibold hover:bg-brand-lime-deep disabled:opacity-50"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                Match {s.invoice.invoice_number} · {s.invoice.customer_name}
                              </button>
                            ))}
                            {picking === t.id ? (
                              <select
                                autoFocus
                                aria-label="Choose an invoice to match"
                                defaultValue=""
                                disabled={busy}
                                onChange={(e) => e.target.value && run(t.id, () => matchToInvoice(t, e.target.value), 'Payment recorded on the invoice.')}
                                className="h-9 rounded-full border border-brand-line bg-white px-3 text-xs"
                              >
                                <option value="" disabled>Choose an unpaid invoice…</option>
                                {candidates.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.invoice_number} · {c.customer_name} · {formatNaira(c.outstanding, 2)} owed
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button type="button" onClick={() => setPicking(t.id)} disabled={candidates.length === 0} className="h-9 px-3 rounded-full border border-brand-line text-xs font-semibold text-brand-ink hover:bg-brand-canvas disabled:opacity-40">
                                {suggestions.length ? 'Other invoice…' : 'Match to an invoice…'}
                              </button>
                            )}
                          </>
                        )}
                        {t.status === 'unreviewed' && t.direction === 'out' && (
                          <>
                            <button type="button" disabled={busy} onClick={() => run(t.id, () => recordAsExpense(t), 'Saved as a draft expense. Add the receipt and VAT details before approving it.')} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold hover:bg-brand-forest-hover disabled:opacity-50">
                              <Receipt className="w-3.5 h-3.5" />
                              Record as expense
                            </button>
                            <StatusPill tone="warn">VAT unknown until you add the receipt</StatusPill>
                          </>
                        )}
                        {t.status === 'unreviewed' && (
                          <button type="button" disabled={busy} onClick={() => run(t.id, () => setTransactionStatus(t, 'ignored'))} className="h-9 px-3 rounded-full text-xs font-semibold text-brand-muted hover:text-brand-ink hover:bg-brand-canvas">
                            Ignore
                          </button>
                        )}
                        {t.status === 'matched' && (
                          <>
                            <StatusPill tone="good" icon={<Check className="w-3 h-3" />}>
                              {withNaira(formatNaira(t.matched_amount || 0, 2))} paid on {invoiceNumber(t.matched_invoice_id)}
                            </StatusPill>
                            <Link to={`/invoices/${t.matched_invoice_id}`} className="text-xs font-semibold text-brand-forest hover:underline">View invoice</Link>
                            <button type="button" disabled={busy} onClick={() => run(t.id, () => undoMatch(t), 'Match undone; the payment was removed from the invoice.')} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-muted hover:text-brand-ink">
                              <Undo2 className="w-3.5 h-3.5" />
                              Undo
                            </button>
                          </>
                        )}
                        {t.status === 'expense' && (
                          <>
                            <StatusPill tone={expense?.status === 'approved' ? 'good' : 'warn'}>
                              {expense ? `Expense · ${expense.status}` : 'Expense recorded'}
                            </StatusPill>
                            {expense && !expense.apply_vat && expense.status !== 'approved' && <span className="text-xs text-brand-orange">Needs receipt and VAT details</span>}
                            {t.expense_id && <Link to={`/expenses/${t.expense_id}`} className="text-xs font-semibold text-brand-forest hover:underline">Open expense</Link>}
                          </>
                        )}
                        {t.status === 'ignored' && (
                          <button type="button" disabled={busy} onClick={() => run(t.id, () => setTransactionStatus(t, 'unreviewed'))} className="text-xs font-semibold text-brand-forest hover:underline">
                            Restore to review
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <p className="text-xs text-brand-muted">
            Matching only records who paid what. VAT treatment comes from your invoices and receipts, not from bank lines, so expenses created here start as drafts without VAT.
          </p>
        </>
      )}
    </div>
  );
}
