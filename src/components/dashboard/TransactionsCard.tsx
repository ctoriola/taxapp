import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MoreHorizontal, Check, X, Receipt } from 'lucide-react';
import type { Expense } from '../../services/expenseService';
import { updateExpenseStatus } from '../../services/expenseService';
import { Panel, PanelTitle, Money, roundButton, withNaira } from './ui';

export interface ActivityItem {
  key: string;
  to: string;
  title: string;
  subtitle: string;
  amount: number;
  kind: 'income' | 'expense' | 'pending' | 'draft';
  initial: string;
}

interface Props {
  activity: ActivityItem[];
  pendingExpenses: Expense[];
  money: Money;
  isLoading?: boolean;
}

const AMOUNT_STYLE: Record<ActivityItem['kind'], string> = {
  income: 'text-brand-up',
  expense: 'text-brand-down',
  pending: 'text-brand-ink',
  draft: 'text-brand-muted',
};

// Latest invoices and expenses; an expense waiting for approval is pinned on top with approve/reject
export default function TransactionsCard({ activity, pendingExpenses, money, isLoading = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const waiting = [...pendingExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
  const next = waiting[0];

  const decide = async (status: 'approved' | 'rejected') => {
    if (!next) return;
    setBusy(true);
    setError('');
    try {
      await updateExpenseStatus(next.id, status);
    } catch {
      setError('Couldn\'t update the expense. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const rows = activity.filter((item) => !next || item.key !== `expense-${next.id}`).slice(0, next ? 3 : 4);

  return (
    <Panel className="flex flex-col">
      <PanelTitle
        icon={<FileText className="w-[18px] h-[18px]" />}
        title="Transactions"
        action={
          <Link to="/invoices" aria-label="All invoices" className={`${roundButton} border border-brand-line text-brand-ink hover:bg-brand-canvas`}>
            <MoreHorizontal className="w-5 h-5" />
          </Link>
        }
      />

      {next && (
        <div className="flex items-center gap-3 p-3 -mx-1 rounded-2xl border border-brand-orange/30 bg-brand-orange/[0.04]">
          <span className="w-10 h-10 rounded-full border border-brand-line bg-white flex items-center justify-center flex-shrink-0">
            <Receipt className="w-4 h-4 text-brand-ink" />
          </span>
          <Link to={`/expenses/${next.id}`} className="min-w-0 flex-1">
            <p className="text-sm font-medium text-brand-ink truncate">{next.description || 'Expense'} {withNaira(money(next.total_amount || 0))}</p>
            <p className="text-xs text-brand-orange font-medium">
              Awaiting approval{waiting.length > 1 ? ` · ${waiting.length - 1} more` : ''}
            </p>
          </Link>
          <button type="button" onClick={() => decide('approved')} disabled={busy} aria-label={`Approve ${next.description}`} title="Approve" className="w-9 h-9 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center hover:brightness-95 disabled:opacity-50 flex-shrink-0">
            <Check className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={() => decide('rejected')} disabled={busy} aria-label={`Reject ${next.description}`} title="Reject" className="w-9 h-9 rounded-full border border-brand-line bg-white text-brand-ink flex items-center justify-center hover:bg-brand-canvas disabled:opacity-50 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-brand-down mt-2">{error}</p>}

      {rows.length === 0 && !next && isLoading ? (
        <p className="text-sm text-brand-muted" role="status">Loading your activity…</p>
      ) : rows.length === 0 && !next ? (
        <p className="text-sm text-brand-muted">
          No activity yet. <Link to="/invoices/create" className="font-semibold text-brand-forest hover:underline">Create an invoice</Link> or{' '}
          <Link to="/expenses/create" className="font-semibold text-brand-forest hover:underline">record an expense</Link>.
        </p>
      ) : (
        <ul className="divide-y divide-brand-line mt-1">
          {rows.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className="flex items-center gap-3 py-3.5 hover:bg-brand-canvas/60 -mx-2 px-2 rounded-xl transition-colors">
                <span className="w-10 h-10 rounded-full border border-brand-line flex items-center justify-center text-sm font-semibold text-brand-ink flex-shrink-0" aria-hidden="true">
                  {item.initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-brand-ink truncate">{item.title}</span>
                  <span className="block text-xs text-brand-muted truncate">{item.subtitle}</span>
                </span>
                <span className={`text-sm sm:text-base font-semibold tabular-nums whitespace-nowrap ${AMOUNT_STYLE[item.kind]}`}>
                  {item.kind === 'income' ? '+' : item.kind === 'expense' ? '-' : ''}
                  {withNaira(money(item.amount))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
