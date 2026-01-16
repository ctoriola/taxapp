import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft, Users, FileText, Bell, Search, Plus, Home } from 'lucide-react';
import { useCustomers } from '../context/CustomersContext';
import { useAuth } from '../context/AuthContext';
import { fetchInvoices } from '../services/invoiceService';
import { fetchExpenses } from '../services/expenseService';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

interface StatCard {
  label: string;
  value: string;
  currency: string;
  icon: React.ReactNode;
  bgColor: string;
  iconBgColor: string;
}

interface InsightCard {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { customers, refreshCustomers, isLoading } = useCustomers();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    refreshCustomers();
    loadInvoices();
    loadExpenses();
  }, [refreshCustomers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const notificationContainer = (event.target as HTMLElement).closest('[class*="notification"]');
      if (!notificationContainer && notificationsOpen) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [notificationsOpen]);

  const loadInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await fetchExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expenses:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Calculate metrics from invoices
  const totalRevenue = invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
  const totalVATCollected = invoices.reduce((sum, i) => sum + (i.vat_amount || 0), 0);
  
  // Calculate VAT paid from approved expenses
  const totalVATPaid = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + (e.vat_amount || 0), 0);
  
  const totalPayableTax = totalVATCollected - totalVATPaid;
  const totalOutstanding = invoices.reduce((sum, i) => sum + (i.total_amount - (i.amount_paid || 0)), 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length;

  // Calculate expense metrics
  const totalExpenses = expenses.reduce((sum, e) => sum + e.total_amount, 0);
  const approvedExpenses = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const profit = totalRevenue - totalExpenses;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    });
  };

  const navItems: NavItem[] = [
    { label: 'Overview', href: '#', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Invoices', href: '/invoices', icon: <FileText className="w-5 h-5" /> },
    { label: 'Expenses', href: '/expenses', icon: <ArrowDownLeft className="w-5 h-5" /> },
    { label: 'Reports', href: '#', icon: <AlertCircle className="w-5 h-5" /> },
    { label: 'Customers', href: '/customers', icon: <Users className="w-5 h-5" /> },
  ];

  const statCards: StatCard[] = [
    {
      label: 'Revenue Collected',
      value: formatCurrency(totalRevenue),
      currency: '',
      icon: <ArrowUpRight className="w-6 h-6" />,
      bgColor: 'bg-blue-50',
      iconBgColor: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Profit',
      value: formatCurrency(profit),
      currency: '',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: profit >= 0 ? 'bg-green-50' : 'bg-red-50',
      iconBgColor: profit >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(totalOutstanding),
      currency: '',
      icon: <AlertCircle className="w-6 h-6" />,
      bgColor: 'bg-amber-50',
      iconBgColor: 'bg-amber-100 text-amber-600',
    },
    {
      label: 'VAT Collected',
      value: formatCurrency(totalVATCollected),
      currency: '',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'bg-emerald-50',
      iconBgColor: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'VAT Paid',
      value: formatCurrency(totalVATPaid),
      currency: '',
      icon: <ArrowDownLeft className="w-6 h-6" />,
      bgColor: 'bg-slate-50',
      iconBgColor: 'bg-slate-200 text-slate-600',
    },
    {
      label: 'Payable VAT',
      value: formatCurrency(totalPayableTax),
      currency: '',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'bg-red-50',
      iconBgColor: 'bg-red-100 text-red-600',
    },
    {
      label: 'Total Invoices',
      value: invoices.length.toString(),
      currency: '',
      icon: <FileText className="w-6 h-6" />,
      bgColor: 'bg-slate-50',
      iconBgColor: 'bg-slate-200 text-slate-600',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      currency: '',
      icon: <ArrowDownLeft className="w-6 h-6" />,
      bgColor: 'bg-purple-50',
      iconBgColor: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Approved Expenses',
      value: formatCurrency(approvedExpenses),
      currency: '',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'bg-cyan-50',
      iconBgColor: 'bg-cyan-100 text-cyan-600',
    },
    {
      label: 'Pending Approval',
      value: pendingExpenses.toString(),
      currency: '',
      icon: <AlertCircle className="w-6 h-6" />,
      bgColor: 'bg-orange-50',
      iconBgColor: 'bg-orange-100 text-orange-600',
    },
  ];

  const emphasizedCards = [
    {
      label: 'Paid Invoices',
      value: paidInvoices.toString(),
      currency: '',
      dueDate: `${unpaidInvoices} unpaid`,
      highlighted: true,
    },
    {
      label: 'Total Expenses',
      value: expenses.length.toString(),
      currency: '',
      dueDate: `${expenses.length} expenses`,
      highlighted: false,
    },
  ];

  const insights: InsightCard[] = [
    {
      title: 'Overview',
      description: `You have ${invoices.length} invoices with ${paidInvoices} paid and ${unpaidInvoices} awaiting payment.`,
      type: 'info',
    },
    ...(totalOutstanding > 0 ? [{
      title: 'Outstanding Balance',
      description: `You have ${formatCurrency(totalOutstanding)} pending payment from customers.`,
      type: 'warning',
    }] : []),
    ...(invoices.length > 0 ? [{
      title: 'Tax Summary',
      description: `VAT Collected: ${formatCurrency(totalVATCollected)} | Payable VAT: ${formatCurrency(totalPayableTax)}`,
      type: 'success',
    }] : [{
      title: 'No Invoices Yet',
      description: 'Create your first invoice to get started.',
      type: 'info',
    }]),
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

  const allTransactions = [
    ...invoices.map(inv => ({
      description: `Invoice ${inv.invoice_number}`,
      amount: formatCurrency(inv.amount_paid || 0),
      type: inv.amount_paid > 0 ? 'income' : 'pending',
      date: formatDate(inv.created_at),
      timestamp: new Date(inv.created_at).getTime(),
    })),
    ...expenses.map(exp => ({
      description: `Expense - ${exp.description || 'Untitled'}`,
      amount: formatCurrency(exp.total_amount || 0),
      type: 'expense',
      date: formatDate(exp.created_at),
      timestamp: new Date(exp.created_at).getTime(),
    })),
  ];

  const recentTransactions = allTransactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const lastThreeTransactions = allTransactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

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
          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200 relative"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {lastThreeTransactions.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {lastThreeTransactions.map((txn, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{txn.description}</p>
                              <p className="text-xs text-slate-500 mt-1">{txn.date}</p>
                            </div>
                            <span className={`text-sm font-semibold ${
                              txn.type === 'income' ? 'text-emerald-600' : 
                              txn.type === 'expense' ? 'text-red-600' : 
                              'text-slate-600'
                            }`}>
                              {txn.amount}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No recent transactions
                    </div>
                  )}
                </div>
              </div>
            )}

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

      <div className="flex gap-6 px-6 lg:px-8 py-8">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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

          {/* Primary Stats - Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue Collected - Large */}
            <div className="card-bento md:col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-50 to-white p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <ArrowUpRight className="w-8 h-8 text-emerald-700" />
                </div>
              </div>
              <p className="text-sm text-slate-600">Increased from last month</p>
            </div>

            {/* Profit - Large */}
            <div className="card-bento md:col-span-1 lg:col-span-2 bg-gradient-to-br from-blue-50 to-white p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Net Profit</p>
                  <p className="text-2xl font-bold text-blue-900">{profit >= 0 ? formatCurrency(profit) : `-${formatCurrency(Math.abs(profit))}`}</p>
                </div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-8 h-8 ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                </div>
              </div>
              <p className="text-sm text-slate-600">Revenue minus expenses</p>
            </div>

            {/* VAT Collected */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">VAT Collected</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalVATCollected)}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </div>

            {/* VAT Paid */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">VAT Paid</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalVATPaid)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </div>

            {/* Outstanding */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Outstanding</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalOutstanding)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-700" />
                </div>
              </div>
            </div>

            {/* Payable Tax */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Payable VAT</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalPayableTax)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-700" />
                </div>
              </div>
            </div>

            {/* Total Invoices */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Invoices</p>
                  <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Expenses</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-purple-700" />
                </div>
              </div>
            </div>

            {/* Pending Expenses */}
            <div className="card-bento p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pending Expenses</p>
                  <p className="text-lg font-bold text-slate-900">{pendingExpenses}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Section - Insights & Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Insights */}
            <div className="lg:col-span-2 card-bento p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Smart Insights</h3>
              <div className="space-y-4">
                {insights.slice(0, 3).map((insight) => (
                  <div
                    key={insight.title}
                    className={`p-4 rounded-2xl border-l-4 ${
                      insight.type === 'success'
                        ? 'border-l-emerald-500 bg-emerald-50'
                        : insight.type === 'warning'
                        ? 'border-l-amber-500 bg-amber-50'
                        : 'border-l-blue-500 bg-blue-50'
                    }`}
                  >
                    <h4 className={`font-semibold text-sm mb-1 ${
                      insight.type === 'success'
                        ? 'text-emerald-900'
                        : insight.type === 'warning'
                        ? 'text-amber-900'
                        : 'text-blue-900'
                    }`}>
                      {insight.title}
                    </h4>
                    <p className={`text-xs ${
                      insight.type === 'success'
                        ? 'text-emerald-700'
                        : insight.type === 'warning'
                        ? 'text-amber-700'
                        : 'text-blue-700'
                    }`}>
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              {/* Paid Invoices */}
              {emphasizedCards[0] && (
                <div className="card-bento p-6 bg-gradient-to-br from-emerald-50 to-white">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Paid Invoices</p>
                  <p className="text-xl font-bold text-emerald-900 mb-2">{emphasizedCards[0].value}</p>
                  <p className="text-xs text-slate-600">{emphasizedCards[0].dueDate}</p>
                </div>
              )}

              {/* Total Expenses */}
              {emphasizedCards[1] && (
                <div className="card-bento p-6 bg-gradient-to-br from-slate-100 to-white">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Expenses</p>
                  <p className="text-xl font-bold text-slate-900 mb-2">{emphasizedCards[1].value}</p>
                  <p className="text-xs text-slate-500">{emphasizedCards[1].dueDate}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity & Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 card-bento p-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Activity</h3>
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction, idx) => (
                  <div key={`${transaction.description}-${idx}`} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{transaction.description}</p>
                      <p className="text-xs text-slate-500 mt-1">{transaction.date}</p>
                    </div>
                    <p className={`text-lg font-bold ${
                      transaction.type === 'income'
                        ? 'text-emerald-600'
                        : transaction.type === 'expense'
                        ? 'text-amber-600'
                        : 'text-slate-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Customers */}
            {customers.length > 0 && (
              <div className="card-bento p-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Customers</h3>
                <div className="space-y-3">
                  {customers.slice(0, 5).map((customer) => (
                    <Link
                      key={customer.id}
                      to="/customers"
                      className="p-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                        <p className="text-xs text-slate-500 truncate">{customer.email}</p>
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
