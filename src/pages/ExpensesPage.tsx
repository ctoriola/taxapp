import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, TrendingDown, DollarSign, AlertCircle, CheckCircle2, Clock, XCircle, Menu, X, LogOut, Settings, Bell, Home } from 'lucide-react';
import { fetchExpenses, Expense } from '../services/expenseService';
import { useAuth } from '../context/AuthContext';

type TabType = 'all' | 'draft' | 'pending' | 'approved' | 'rejected';

const CATEGORY_LABELS: Record<string, string> = {
  office_supplies: 'Office Supplies',
  utilities: 'Utilities',
  travel: 'Travel',
  meals: 'Meals',
  equipment: 'Equipment',
  services: 'Services',
  other: 'Other',
};

function getStatusBadge(status: string) {
  const config = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock, label: 'Draft' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertCircle, label: 'Pending' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Rejected' },
  };

  const cfg = config[status as keyof typeof config];
  if (!cfg) return null;

  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </div>
  );
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showVATOnly, setShowVATOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, showVATOnly]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      const data = await fetchExpenses();
      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses by tab
  const filteredByStatus = expenses.filter((expense) => {
    if (activeTab === 'all') return true;
    return expense.status === activeTab;
  });

  // Filter by VAT
  const filteredByVAT = filteredByStatus.filter((expense) => {
    if (showVATOnly) {
      return expense.apply_vat === true;
    }
    return true;
  });

  // Filter by search query
  const filteredExpenses = filteredByVAT.filter((expense) => {
    const query = searchQuery.toLowerCase();
    return (
      expense.description.toLowerCase().includes(query) ||
      CATEGORY_LABELS[expense.category].toLowerCase().includes(query)
    );
  });

  // Group expenses by month
  const groupedByMonth = filteredExpenses.reduce((groups: Record<string, Expense[]>, expense) => {
    const date = new Date(expense.expense_date);
    const monthKey = date.toLocaleString('en-NG', { year: 'numeric', month: 'long' });
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(expense);
    return groups;
  }, {});

  // Sort months in reverse chronological order
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    const dateA = new Date(groupedByMonth[a][0].expense_date);
    const dateB = new Date(groupedByMonth[b][0].expense_date);
    return dateB.getTime() - dateA.getTime();
  });

  // Flatten grouped expenses for pagination
  const allGroupedExpenses: Array<{ type: 'month' | 'expense'; month?: string; expense?: Expense }> = [];
  sortedMonths.forEach(month => {
    allGroupedExpenses.push({ type: 'month', month });
    groupedByMonth[month].forEach(expense => {
      allGroupedExpenses.push({ type: 'expense', expense });
    });
  });

  // Paginate items
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = allGroupedExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(allGroupedExpenses.length / ITEMS_PER_PAGE);

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.total_amount, 0);
  const totalApproved = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalVAT = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + e.vat_amount, 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  const tabs = [
    { value: 'all', label: `All (${expenses.length})` },
    { value: 'draft', label: `Draft (${expenses.filter(e => e.status === 'draft').length})` },
    { value: 'pending', label: `Pending (${expenses.filter(e => e.status === 'pending').length})` },
    { value: 'approved', label: `Approved (${expenses.filter(e => e.status === 'approved').length})` },
    { value: 'rejected', label: `Rejected (${expenses.filter(e => e.status === 'rejected').length})` },
  ];

  const formatCurrency = (value: number) =>
    `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Expenses</h1>
            <p className="text-sm text-slate-600 mt-1">Track and manage your business expenses</p>
          </div>
          <button
            onClick={() => navigate('/expenses/create')}
            className="btn-primary flex items-center gap-2 rounded-2xl"
          >
            <Plus className="w-5 h-5" />
            Record Expense
          </button>
        </div>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card-bento p-6 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-600 mb-2 font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="card-bento p-6 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-600 mb-2 font-medium">Approved</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalApproved)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="card-bento p-6 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-600 mb-2 font-medium">VAT Reclaimable</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalVAT)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card-bento p-6 bg-gradient-to-br from-amber-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone-600 mb-2 font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-stone-200/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as TabType)}
              className={`px-4 py-3 font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.value
                  ? 'border-emerald-700 text-emerald-700'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-12"
            />
          </div>
        </div>

        {/* VAT Toggle */}
        <div className="mb-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="vatToggle"
            checked={showVATOnly}
            onChange={(e) => setShowVATOnly(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-700"
          />
          <label htmlFor="vatToggle" className="text-sm font-medium text-stone-700">
            Show only expenses with VAT
          </label>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-stone-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-stone-600">Loading expenses...</p>
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            {paginatedItems.map((item, index) => (
              item.type === 'month' ? (
                <div key={`month-${index}`} className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 mt-6">{item.month}</h3>
                  <div className="card-bento overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-200/50 bg-stone-100/50">
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Date</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Description</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Category</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Amount</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">VAT</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Status</th>
                            <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-stone-900">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedByMonth[item.month!].map((expense) => (
                            <tr key={expense.id} className="border-b border-stone-200/50 hover:bg-stone-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-900">{formatDate(expense.expense_date)}</td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-slate-900">{expense.description}</div>
                                {expense.notes && <div className="text-xs text-stone-500 mt-1">{expense.notes}</div>}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-600">
                                {CATEGORY_LABELS[expense.category]}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {formatCurrency(expense.amount)}
                              </td>
                              <td className="px-6 py-4 text-sm text-stone-600">
                                {expense.apply_vat ? formatCurrency(expense.vat_amount) : 'No VAT'}
                              </td>
                              <td className="px-6 py-4">{getStatusBadge(expense.status)}</td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => navigate(`/expenses/${expense.id}`)}
                                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-stone-100 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg bg-stone-100 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card-bento p-12 text-center">
            <TrendingDown className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No expenses yet</h3>
            <p className="text-stone-600 mb-6">
              {activeTab !== 'all'
                ? 'No expenses in this category.'
                : 'Start recording expenses to track your spending.'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => navigate('/expenses/create')}
                className="inline-flex items-center gap-2 px-4 py-2 btn-primary rounded-2xl transition-all"
              >
                <Plus className="w-5 h-5" />
                Record Expense
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
