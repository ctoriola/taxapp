import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Menu, X, LogOut, Settings, Bell, Search, Home } from 'lucide-react';
import { createExpense } from '../services/expenseService';
import { useAuth } from '../context/AuthContext';

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

export default function CreateExpensePage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('office_supplies');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [applyVAT, setApplyVAT] = useState(true);
  const [notes, setNotes] = useState('');

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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
    <div className="min-h-screen bg-stone-50">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-stone-200/50">
        <div className="flex items-center justify-between px-6 lg:px-8 py-4">
          {/* Left: Logo & Sidebar Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-stone-100 rounded-xl transition-all duration-200"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>            <Link
              to="/dashboard"
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Dashboard"
            >
              <Home className="w-5 h-5 text-slate-600" />
            </Link>            <div className="hidden lg:flex items-center gap-3">
              {profile?.logo_url && (
                <img
                  src={profile.logo_url}
                  alt="Company logo"
                  className="h-8 w-auto"
                />
              )}
              <div>
                <h2 className="text-xl font-bold text-emerald-700">{profile?.business_name || 'Business'}</h2>
                <p className="text-xs text-slate-600 mt-1">Logged in as: {user?.email || 'User'}</p>
              </div>
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="input-field pl-10 py-2.5"
              />
            </div>
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-4">
            <button className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200 relative">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </button>

            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Company logo"
                className="h-10 w-10 rounded-full object-cover cursor-pointer hover:shadow-lg transition-all"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:shadow-lg transition-all">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <Link
              to="/settings"
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <main className="px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-900">Record Expense</h1>
        </div>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Expense Details Card */}
          <div className="card-bento p-6 mb-6">
            <h2 className="text-lg font-semibold text-emerald-900 mb-6">Expense Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Description *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Office furniture, Software license..."
                  className="input-field w-full"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Amount (₦) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="input-field w-full"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field w-full"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Date */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional details..."
                  rows={3}
                  className="input-field w-full"
                />
              </div>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center gap-3 pt-4 border-t border-stone-200/50">
              <input
                type="checkbox"
                id="applyVAT"
                checked={applyVAT}
                onChange={(e) => setApplyVAT(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-700"
              />
              <label htmlFor="applyVAT" className="text-sm font-medium text-stone-700">
                Apply VAT (7.5%)
              </label>
            </div>
          </div>

          {/* Summary Card */}
          <div className="card-bento p-6 mb-6 bg-gradient-to-br from-emerald-50 to-white border-emerald-200/50">
            <h3 className="text-sm font-semibold text-emerald-900 mb-4">Expense Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Amount</span>
                <span className="font-medium text-slate-900">
                  ₦{numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {applyVAT && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">VAT (7.5%)</span>
                  <span className="font-medium text-slate-900">
                    ₦{vatAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t border-emerald-200/50 pt-3">
                <span className="text-slate-900">Total</span>
                <span className="text-emerald-700">
                  ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="flex-1 px-4 py-2 btn-secondary rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 btn-primary rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
