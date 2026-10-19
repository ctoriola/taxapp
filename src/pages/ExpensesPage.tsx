import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, TrendingDown, AlertCircle, CheckCircle2, Clock, XCircle, Package, Plug, Plane, Utensils, Monitor, Briefcase, CircleDollarSign } from 'lucide-react';
import { Expense } from '../services/expenseService';
import { useExpenses } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';

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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  office_supplies: <Package className="w-4 h-4" />,
  utilities: <Plug className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  meals: <Utensils className="w-4 h-4" />,
  equipment: <Monitor className="w-4 h-4" />,
  services: <Briefcase className="w-4 h-4" />,
  other: <CircleDollarSign className="w-4 h-4" />,
};

const STATUS: Record<string, { tone: PillTone; icon: React.ReactNode; label: string }> = {
  draft: { tone: 'neutral', icon: <Clock className="w-3 h-3" />, label: 'Draft' },
  pending: { tone: 'warn', icon: <AlertCircle className="w-3 h-3" />, label: 'Pending' },
  approved: { tone: 'good', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
  rejected: { tone: 'bad', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
};

function getStatusBadge(status: string) {
  const cfg = STATUS[status];
  if (!cfg) return null;
  return <StatusPill tone={cfg.tone} icon={cfg.icon}>{cfg.label}</StatusPill>;
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { expenses, isLoading, error } = useExpenses();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showVATOnly, setShowVATOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, showVATOnly]);

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

  const stats = [
    { label: 'Total Expenses', value: withNaira(formatCurrency(totalExpenses)), icon: <TrendingDown className="w-[18px] h-[18px]" />, highlight: false },
    { label: 'Approved', value: withNaira(formatCurrency(totalApproved)), icon: <CheckCircle2 className="w-[18px] h-[18px]" />, highlight: true },
    { label: 'VAT Reclaimable', value: withNaira(formatCurrency(totalVAT)), icon: <AlertCircle className="w-[18px] h-[18px]" />, highlight: false },
    { label: 'Pending Review', value: pendingCount, icon: <Clock className="w-[18px] h-[18px]" />, highlight: false },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expenses"
        description="Track and manage your business expenses"
        actions={
          <button onClick={() => navigate('/expenses/create')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        }
      />

      {error && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4">
          <p className="text-brand-down text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-[28px] p-4 sm:p-6 min-w-0 ${stat.highlight ? 'bg-brand-lime' : 'bg-white'}`}>
            <div className="flex items-center justify-between gap-3">
              <p className={`text-xs sm:text-sm ${stat.highlight ? 'text-brand-ink/75' : 'text-brand-muted'}`}>{stat.label}</p>
              <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${stat.highlight ? 'bg-white/40 text-brand-ink' : 'border border-brand-line text-brand-ink'}`}>
                {stat.icon}
              </span>
            </div>
            <p className="text-lg sm:text-[28px] font-medium tracking-tight text-brand-ink mt-3 break-all">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="overflow-x-auto">
          <div role="tablist" aria-label="Expense status" className="inline-flex p-1 rounded-full bg-brand-canvas min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={activeTab === tab.value}
                onClick={() => setActiveTab(tab.value as TabType)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.value ? 'bg-white text-brand-ink font-semibold shadow-sm' : 'text-brand-muted font-medium hover:text-brand-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <label htmlFor="vatToggle" className="flex items-center gap-3 text-sm font-medium text-brand-ink cursor-pointer">
            <input
              type="checkbox"
              id="vatToggle"
              checked={showVATOnly}
              onChange={(e) => setShowVATOnly(e.target.checked)}
              className="w-4 h-4 rounded border-brand-line accent-brand-forest"
            />
            Show only expenses with VAT
          </label>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-muted">Loading expenses...</p>
        </div>
      ) : filteredExpenses.length > 0 ? (
        <>
          {paginatedItems.map((item, index) =>
            item.type === 'month' ? (
              <section key={`month-${index}`} className="card p-0 overflow-hidden">
                <h3 className="px-5 sm:px-6 pt-5 pb-3 text-lg font-semibold text-brand-ink">{item.month}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr>
                        <th className="table-head px-5 sm:px-6 py-3">Date</th>
                        <th className="table-head px-4 py-3">Description</th>
                        <th className="table-head px-4 py-3">Category</th>
                        <th className="table-head px-4 py-3">Amount</th>
                        <th className="table-head px-4 py-3">VAT</th>
                        <th className="table-head px-4 py-3">Status</th>
                        <th className="table-head px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByMonth[item.month!].map((expense) => (
                        <tr key={expense.id} className="table-row">
                          <td className="px-5 sm:px-6 py-4 text-sm text-brand-ink whitespace-nowrap">{formatDate(expense.expense_date)}</td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-brand-ink">{expense.description}</div>
                            {expense.notes && <div className="text-xs text-brand-muted mt-1">{expense.notes}</div>}
                          </td>
                          <td className="px-4 py-4 text-sm text-brand-muted">
                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                              {CATEGORY_ICONS[expense.category]}
                              {CATEGORY_LABELS[expense.category]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-brand-ink whitespace-nowrap tabular-nums">{withNaira(formatCurrency(expense.amount))}</td>
                          <td className="px-4 py-4 text-sm text-brand-muted whitespace-nowrap tabular-nums">
                            {expense.apply_vat ? withNaira(formatCurrency(expense.vat_amount)) : 'No VAT'}
                          </td>
                          <td className="px-4 py-4">{getStatusBadge(expense.status)}</td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => navigate(`/expenses/${expense.id}`)}
                              className="text-brand-forest hover:underline font-semibold text-sm"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-10 px-4 rounded-full bg-white text-sm font-medium text-brand-ink disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-lime/40 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      currentPage === page ? 'bg-brand-forest text-brand-lime' : 'bg-white text-brand-ink hover:bg-brand-lime/40'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-10 px-4 rounded-full bg-white text-sm font-medium text-brand-ink disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-lime/40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card p-10 sm:p-12 text-center">
          <span className="w-14 h-14 rounded-full bg-brand-lime/50 text-brand-forest flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-6 h-6" />
          </span>
          <h3 className="text-lg font-semibold text-brand-ink mb-2">No expenses yet</h3>
          <p className="text-brand-muted mb-6">
            {activeTab !== 'all' ? 'No expenses in this category.' : 'Start recording expenses to track your spending.'}
          </p>
          {activeTab === 'all' && (
            <button onClick={() => navigate('/expenses/create')} className="btn-primary">
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          )}
        </div>
      )}
    </div>
  );
}
