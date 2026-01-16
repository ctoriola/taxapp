import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchExpense, updateExpenseStatus, deleteExpense, Expense } from '../services/expenseService';

const CATEGORY_LABELS: Record<string, string> = {
  office_supplies: 'Office Supplies',
  utilities: 'Utilities',
  travel: 'Travel',
  meals: 'Meals & Entertainment',
  equipment: 'Equipment',
  services: 'Professional Services',
  other: 'Other',
};

function getStatusBadge(status: string) {
  const config = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock, label: 'Draft' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle, label: 'Pending Approval' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
  };

  const cfg = config[status as keyof typeof config];
  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-4 h-4" />
      {cfg.label}
    </div>
  );
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadExpense(id);
    }
  }, [id]);

  const loadExpense = async (expenseId: string) => {
    try {
      setIsLoading(true);
      const data = await fetchExpense(expenseId);
      setExpense(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'draft' | 'pending' | 'approved' | 'rejected') => {
    if (!expense) return;

    try {
      setIsUpdating(true);
      const updated = await updateExpenseStatus(expense.id, newStatus);
      setExpense(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
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
      setError(err instanceof Error ? err.message : 'Failed to delete expense');
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate('/expenses')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Expense Not Found</h1>
          </div>
        </div>
        <main className="max-w-4xl mx-auto p-6 lg:p-10">
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-6">This expense could not be found.</p>
            <button
              onClick={() => navigate('/expenses')}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Expenses
            </button>
          </div>
        </main>
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
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/expenses')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Back to expenses"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Expense Details</h1>
              <p className="text-sm text-slate-500 mt-1">{formatDate(expense.created_at)}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={isUpdating}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete expense"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6 lg:p-10">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Expense Details Card */}
        <div className="card p-8 mb-6">
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{expense.description}</h2>
                <p className="text-sm text-slate-500 mt-2">
                  {CATEGORY_LABELS[expense.category]} • {formatDate(expense.expense_date)}
                </p>
              </div>
              {getStatusBadge(expense.status)}
            </div>

            {expense.notes && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Amount Details */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Amount</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(expense.amount)}</p>
            </div>
            {expense.apply_vat && (
              <>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">VAT (7.5%)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(expense.vat_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(expense.total_amount)}</p>
                </div>
              </>
            )}
          </div>

          {/* Category Info */}
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Category</p>
              <p className="text-lg font-semibold text-slate-900">{CATEGORY_LABELS[expense.category]}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">VAT Applied</p>
              <p className="text-lg font-semibold text-slate-900">
                {expense.apply_vat ? 'Yes (7.5%)' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Actions */}
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Status</h3>
          <div className="flex flex-wrap gap-3">
            {(['draft', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={isUpdating || expense.status === status}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  expense.status === status
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {status === 'draft' ? '📝 Draft' : ''}
                {status === 'pending' ? '⏳ Pending' : ''}
                {status === 'approved' ? '✅ Approve' : ''}
                {status === 'rejected' ? '❌ Reject' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="card p-6 text-sm text-slate-500">
          <div className="flex justify-between items-center">
            <span>Created {formatDate(expense.created_at)}</span>
            <span>Last updated {formatDate(expense.updated_at)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
