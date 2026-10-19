import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Receipt } from 'lucide-react';
import { createExpense } from '../services/expenseService';
import PageHeader from '../components/PageHeader';
import { withNaira } from '../components/dashboard/ui';

const EXPENSE_CATEGORIES = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals & Entertainment' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'services', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

const VAT_RATE = 0.075; // 7.5%

const naira = (value: number) => `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CreateExpensePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('office_supplies');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [applyVAT, setApplyVAT] = useState(true);
  const [notes, setNotes] = useState('');

  // Calculate totals
  const numAmount = parseFloat(amount) || 0;
  const vatAmount = applyVAT ? numAmount * VAT_RATE : 0;
  const totalAmount = numAmount + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);
      await createExpense(
        description,
        numAmount,
        category,
        expenseDate,
        applyVAT,
        notes
      );

      navigate('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Record Expense" description="Add a business cost; VAT is worked out for you" back={{ to: '/expenses', label: 'All expenses' }} />

      {error && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4">
          <p className="text-brand-down text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Expense Details Card */}
        <section className="card p-5 sm:p-6 lg:col-span-2 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-full border border-brand-line text-brand-ink flex items-center justify-center flex-shrink-0">
              <Receipt className="w-[18px] h-[18px]" />
            </span>
            <h2 className="text-lg font-semibold text-brand-ink">Expense Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="expense-description" className="field-label">Description *</label>
              <input
                id="expense-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Office furniture, Software license..."
                className="input-field"
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="expense-amount" className="field-label">Amount (₦) *</label>
              <input
                id="expense-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="input-field"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="expense-category" className="field-label">Category</label>
              <select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Expense Date */}
            <div>
              <label htmlFor="expense-date" className="field-label">Expense Date</label>
              <input id="expense-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="input-field" />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="expense-notes" className="field-label">Notes (Optional)</label>
              <textarea
                id="expense-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={3}
                className="input-field"
              />
            </div>
          </div>

          {/* VAT Toggle */}
          <label htmlFor="applyVAT" className="flex items-center gap-3 mt-6 pt-5 border-t border-brand-line text-sm font-medium text-brand-ink cursor-pointer">
            <input
              type="checkbox"
              id="applyVAT"
              checked={applyVAT}
              onChange={(e) => setApplyVAT(e.target.checked)}
              className="w-4 h-4 rounded border-brand-line accent-brand-forest"
            />
            Apply VAT (7.5%)
          </label>
        </section>

        {/* Summary + actions */}
        <div className="space-y-4 min-w-0">
          <section className="rounded-[28px] bg-brand-lime p-5 sm:p-6 text-brand-ink">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-ink/75 mb-4">Expense Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-brand-ink/75">Amount</span>
                <span className="font-medium tabular-nums">{withNaira(naira(numAmount))}</span>
              </div>
              {applyVAT && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-brand-ink/75">VAT (7.5%)</span>
                  <span className="font-medium tabular-nums">{withNaira(naira(vatAmount))}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline gap-3 border-t border-brand-ink/15 pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-medium tracking-tight tabular-nums truncate">{withNaira(naira(totalAmount))}</span>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/expenses')} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
