import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, CheckCircle2, XCircle, Clock, AlertCircle, FileText, Package, Plug, Plane, Utensils, Monitor, Briefcase, CircleDollarSign } from 'lucide-react';
import { updateExpenseStatus, deleteExpense } from '../services/expenseService';
import { useExpenses } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';

const CATEGORY_LABELS: Record<string, string> = {
  office_supplies: 'Office Supplies',
  utilities: 'Utilities',
  travel: 'Travel',
  meals: 'Meals & Entertainment',
  equipment: 'Equipment',
  services: 'Professional Services',
  other: 'Other',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  office_supplies: <Package className="w-[18px] h-[18px]" />,
  utilities: <Plug className="w-[18px] h-[18px]" />,
  travel: <Plane className="w-[18px] h-[18px]" />,
  meals: <Utensils className="w-[18px] h-[18px]" />,
  equipment: <Monitor className="w-[18px] h-[18px]" />,
  services: <Briefcase className="w-[18px] h-[18px]" />,
  other: <CircleDollarSign className="w-[18px] h-[18px]" />,
};

const STATUS: Record<string, { tone: PillTone; icon: React.ReactNode; label: string }> = {
  draft: { tone: 'neutral', icon: <Clock className="w-3.5 h-3.5" />, label: 'Draft' },
  pending: { tone: 'warn', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Pending Approval' },
  approved: { tone: 'good', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Approved' },
  rejected: { tone: 'bad', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Rejected' },
};

function getStatusBadge(status: string) {
  const cfg = STATUS[status];
  if (!cfg) return null;
  return <StatusPill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</StatusPill>;
}

const STATUS_ACTIONS = [
  { status: 'draft' as const, label: 'Draft', icon: <FileText className="w-4 h-4" /> },
  { status: 'pending' as const, label: 'Pending', icon: <Clock className="w-4 h-4" /> },
  { status: 'approved' as const, label: 'Approve', icon: <CheckCircle2 className="w-4 h-4" /> },
  { status: 'rejected' as const, label: 'Reject', icon: <XCircle className="w-4 h-4" /> },
];

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { expenses, isLoading, error: loadError } = useExpenses();
  const expense = expenses.find((e) => e.id === id) ?? null;
  const [actionError, setActionError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const error = loadError || actionError || (!isLoading && !expense ? 'Expense not found' : '');

  const handleStatusUpdate = async (newStatus: 'draft' | 'pending' | 'approved' | 'rejected') => {
    if (!expense) return;

    try {
      setIsUpdating(true);
      await updateExpenseStatus(expense.id, newStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;

    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      setIsUpdating(true);
      await deleteExpense(expense.id);
      navigate('/expenses');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete expense');
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-brand-muted">Loading expense...</p>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="space-y-5">
        <PageHeader title="Expense Not Found" back={{ to: '/expenses', label: 'All expenses' }} />
        <div className="card p-10 sm:p-12 text-center">
          <p className="text-brand-muted mb-6">{loadError || 'This expense could not be found.'}</p>
          <button onClick={() => navigate('/expenses')} className="btn-primary">
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Expense Details"
        description={formatDate(expense.created_at)}
        back={{ to: '/expenses', label: 'All expenses' }}
        actions={
          <button onClick={handleDelete} disabled={isUpdating} className="btn-danger" title="Delete expense" aria-label="Delete expense">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        }
      />

      {error && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4">
          <p className="text-brand-down text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Expense Details Card */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full border border-brand-line text-brand-ink flex items-center justify-center flex-shrink-0">
              {CATEGORY_ICONS[expense.category]}
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-brand-ink break-words">{expense.description}</h2>
              <p className="text-sm text-brand-muted mt-1">
                {CATEGORY_LABELS[expense.category]} • {formatDate(expense.expense_date)}
              </p>
            </div>
          </div>
          {getStatusBadge(expense.status)}
        </div>

        {expense.notes && (
          <div className="mt-5 p-4 bg-brand-canvas rounded-2xl">
            <p className="text-sm text-brand-ink/80">{expense.notes}</p>
          </div>
        )}

        {/* Amount Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="rounded-2xl bg-brand-canvas p-4 min-w-0">
            <p className="text-sm text-brand-muted">Amount</p>
            <p className="text-2xl font-medium tracking-tight text-brand-ink mt-1 truncate">{withNaira(formatCurrency(expense.amount))}</p>
          </div>
          {expense.apply_vat && (
            <>
              <div className="rounded-2xl bg-brand-lime/50 p-4 min-w-0">
                <p className="text-sm text-brand-ink/75">VAT (7.5%)</p>
                <p className="text-2xl font-medium tracking-tight text-brand-ink mt-1 truncate">{withNaira(formatCurrency(expense.vat_amount))}</p>
              </div>
              <div className="rounded-2xl bg-brand-canvas p-4 min-w-0">
                <p className="text-sm text-brand-muted">Total</p>
                <p className="text-2xl font-medium tracking-tight text-brand-ink mt-1 truncate">{withNaira(formatCurrency(expense.total_amount))}</p>
              </div>
            </>
          )}
        </div>

        {/* Category Info */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="rounded-2xl border border-brand-line p-4">
            <dt className="text-sm text-brand-muted">Category</dt>
            <dd className="text-lg font-semibold text-brand-ink mt-1">{CATEGORY_LABELS[expense.category]}</dd>
          </div>
          <div className="rounded-2xl border border-brand-line p-4">
            <dt className="text-sm text-brand-muted">VAT Applied</dt>
            <dd className="text-lg font-semibold text-brand-ink mt-1">{expense.apply_vat ? 'Yes (7.5%)' : 'No'}</dd>
          </div>
        </dl>
      </section>

      {/* Status Actions */}
      <section className="card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-brand-ink mb-4">Change Status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.map(({ status, label, icon }) => {
            const current = expense.status === status;
            const style = current
              ? 'bg-brand-forest text-brand-lime border-brand-forest'
              : status === 'approved'
              ? 'bg-brand-lime text-brand-ink border-brand-lime hover:bg-brand-lime-deep'
              : status === 'rejected'
              ? 'bg-white text-brand-down border-brand-down/40 hover:bg-brand-down/5'
              : 'bg-white text-brand-ink border-brand-line hover:bg-brand-canvas';
            return (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={isUpdating || current}
                aria-pressed={current}
                className={`inline-flex items-center gap-2 h-11 px-5 rounded-full border text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                  current ? '' : 'disabled:opacity-50'
                } ${style}`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Metadata */}
      <div className="flex flex-wrap justify-between gap-2 px-1 text-sm text-brand-muted">
        <span>Created {formatDate(expense.created_at)}</span>
        <span>Last updated {formatDate(expense.updated_at)}</span>
      </div>
    </div>
  );
}
