import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft, Users, FileText, Plus, Home, BarChart3, CalendarClock } from 'lucide-react';
import { useCustomers, useInvoices, useExpenses } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import DataErrorBanner from '../components/DataErrorBanner';
import SmartInsights from '../components/SmartInsights';
import NotificationsBell from '../components/NotificationsBell';
import { balanceDue, buildInsights, daysBetween, formatNaira, summarize, upcomingVatReturn } from '../lib/finance';
import GlobalSearch from '../components/GlobalSearch';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { customers } = useCustomers();
  const { invoices, error: invoicesError } = useInvoices();
  const { expenses, error: expensesError } = useExpenses();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const today = new Date();
  const summary = useMemo(() => summarize(invoices, expenses, new Date()), [invoices, expenses]);
  const insights = useMemo(() => buildInsights(invoices, expenses, customers, new Date()), [invoices, expenses, customers]);
  const vatReturn = upcomingVatReturn(summary, today);
  const vatDaysLeft = daysBetween(today, vatReturn.dueDate);
  const pendingExpenses = summary.pendingExpenses.length;
  const formatCurrency = (amount: number) => formatNaira(amount);

  const navItems: NavItem[] = [
    { label: 'Overview', href: '/dashboard', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Invoices', href: '/invoices', icon: <FileText className="w-5 h-5" /> },
    { label: 'Expenses', href: '/expenses', icon: <ArrowDownLeft className="w-5 h-5" /> },
    { label: 'VAT Reports', href: '/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Customers', href: '/customers', icon: <Users className="w-5 h-5" /> },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Customer';

  const recentActivity = [
    ...invoices.map((inv) => {
      const outstanding = balanceDue(inv);
      return {
        key: `invoice-${inv.id}`,
        to: `/invoices/${inv.id}`,
        description: `Invoice ${inv.invoice_number} · ${customerName(inv.customer_id)}`,
        detail: inv.status === 'draft' ? 'Draft' : outstanding === 0 ? 'Paid' : inv.amount_paid > 0 ? 'Part paid' : 'Awaiting payment',
        amount: formatCurrency(inv.status !== 'draft' && outstanding === 0 ? inv.amount_paid : inv.total_amount),
        type: inv.status === 'draft' ? 'draft' : outstanding === 0 ? 'income' : 'pending',
        date: formatDate(inv.created_at),
        timestamp: new Date(inv.created_at).getTime(),
      };
    }),
    ...expenses.map((exp) => ({
      key: `expense-${exp.id}`,
      to: `/expenses/${exp.id}`,
      description: `Expense · ${exp.description || 'Untitled'}`,
      detail: exp.status.charAt(0).toUpperCase() + exp.status.slice(1),
      amount: formatCurrency(exp.total_amount || 0),
      type: 'expense',
      date: formatDate(exp.created_at),
      timestamp: new Date(exp.created_at).getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

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
            <GlobalSearch />
          </div>

          {/* Right: Notifications & Profile */}
          <div className="flex items-center gap-4 relative">
            <NotificationsBell insights={insights} />

            <Link to="/settings" title="Business profile" className="rounded-full hover:shadow-lg transition-all">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Company logo"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            </Link>

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

      <div className="flex gap-6 px-6 lg:px-8 py-8">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] invisible lg:visible'
          } fixed lg:sticky top-20 lg:top-24 left-6 lg:left-0 h-[calc(100vh-100px)] lg:h-auto w-56 bg-white rounded-3xl shadow-lg lg:shadow-none lg:rounded-none lg:w-64 border border-stone-200/50 lg:border-0 transition-all duration-300 lg:transition-none pt-6 lg:pt-0 overflow-y-auto z-30 lg:translate-x-0`}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = window.location.pathname === item.href;
              return item.href.startsWith('/') ? (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-600'}>{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                  )}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="sidebar-item sidebar-item-inactive"
                >
                  {item.icon}
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold text-emerald-900 mb-2">Dashboard</h1>
            <p className="text-xs text-slate-600">Plan, manage, and grow your business with ease.</p>
            </div>
            <Link
              to="/invoices/create"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </Link>
          </div>

          <DataErrorBanner errors={[invoicesError, expensesError]} />

          {/* Primary Stats - Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Payments received - Large */}
            <div className="card-bento md:col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-50 to-white p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-900">{formatCurrency(summary.collected)}</p>
                </div>
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <ArrowUpRight className="w-8 h-8 text-emerald-700" />
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Payments received, including VAT · {summary.paidCount} of {summary.issuedCount} invoices fully paid
              </p>
            </div>

            {/* Profit - Large */}
            <div className="card-bento md:col-span-1 lg:col-span-2 bg-gradient-to-br from-blue-50 to-white p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Net Profit</p>
                  <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-blue-900' : 'text-red-700'}`}>
                    {summary.profit >= 0 ? formatCurrency(summary.profit) : `-${formatCurrency(Math.abs(summary.profit))}`}
                  </p>
                </div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${summary.profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-8 h-8 ${summary.profit >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                </div>
              </div>
              <p className="text-sm text-slate-600">Revenue received minus approved expenses, both excluding VAT</p>
            </div>

            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">VAT Collected</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.outputVat)}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Charged on issued invoices</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">VAT Paid</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.inputVat)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-purple-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">On approved expenses</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Outstanding</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.outstanding)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">{summary.awaitingPaymentCount} invoice{summary.awaitingPaymentCount === 1 ? '' : 's'} awaiting payment</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{summary.netVat >= 0 ? 'Payable VAT' : 'VAT Credit'}</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(Math.abs(summary.netVat))}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">{summary.netVat >= 0 ? 'VAT collected minus VAT paid' : 'VAT paid exceeds VAT collected'}</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Invoices</p>
                  <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">{summary.draftInvoices.length} draft{summary.draftInvoices.length === 1 ? '' : 's'}</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Expenses</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(summary.approvedExpensesTotal)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-purple-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Approved, including VAT</p>
            </div>
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pending Expenses</p>
                  <p className="text-lg font-bold text-slate-900">{pendingExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-700" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Awaiting approval</p>
            </div>
          </div>

          {/* Secondary Section - Insights & key dates */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SmartInsights insights={insights} />

            <div className="space-y-4">
              {/* Next VAT return */}
              <Link to="/reports" className="block card-bento p-6 bg-gradient-to-br from-orange-50 to-white hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock className="w-4 h-4 text-orange-700" />
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Next VAT Return</p>
                </div>
                <p className="text-xl font-bold text-slate-900 mb-1">
                  {vatReturn.netVat > 0 ? formatCurrency(vatReturn.netVat) : 'Nothing to pay'}
                </p>
                <p className="text-xs text-slate-600">
                  {vatReturn.label} · due {vatReturn.dueDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  {' '}({vatDaysLeft === 0 ? 'today' : `in ${vatDaysLeft} day${vatDaysLeft === 1 ? '' : 's'}`})
                </p>
              </Link>

              {/* Overdue invoices */}
              <Link to="/invoices" className={`block card-bento p-6 hover:shadow-md transition-all ${summary.overdueInvoices.length > 0 ? 'bg-gradient-to-br from-red-50 to-white' : 'bg-gradient-to-br from-emerald-50 to-white'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${summary.overdueInvoices.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>Overdue Invoices</p>
                <p className="text-xl font-bold text-slate-900 mb-1">
                  {summary.overdueInvoices.length > 0 ? formatCurrency(summary.overdueAmount) : 'None'}
                </p>
                <p className="text-xs text-slate-600">
                  {summary.overdueInvoices.length > 0
                    ? `${summary.overdueInvoices.length} invoice${summary.overdueInvoices.length === 1 ? '' : 's'} past due date`
                    : 'Every issued invoice is within its due date'}
                </p>
              </Link>
            </div>
          </div>

          {/* Recent Activity & Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 card-bento p-6 sm:p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No activity yet. <Link to="/invoices/create" className="font-semibold text-emerald-700 hover:underline">Create an invoice</Link> or{' '}
                  <Link to="/expenses/create" className="font-semibold text-emerald-700 hover:underline">record an expense</Link>.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <Link key={item.key} to={item.to} className="flex items-center justify-between gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.date} · {item.detail}</p>
                      </div>
                      <p className={`text-base sm:text-lg font-bold whitespace-nowrap ${
                        item.type === 'income'
                          ? 'text-emerald-600'
                          : item.type === 'expense'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}>
                        {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}{item.amount}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Customers */}
            {customers.length > 0 && (
              <div className="card-bento p-6 sm:p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Customers</h3>
                <div className="space-y-3">
                  {customers.slice(0, 5).map((customer) => (
                    <Link
                      key={customer.id}
                      to={`/customers/${customer.id}`}
                      className="p-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                        <p className="text-xs text-slate-500 truncate">{customer.email || customer.phone}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
