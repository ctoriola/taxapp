import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, FileText, Eye, Trash2, Send, TrendingUp, AlertCircle, CheckCircle2, DollarSign, Menu, X, LogOut, Settings, Bell, Search, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchInvoices } from '../services/invoiceService';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  created_at: string;
  vat_amount: number;
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'unpaid' | 'paid'>('all');
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
    loadInvoices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (activeTab === 'draft') return invoice.status === 'draft';
    if (activeTab === 'unpaid') return invoice.status === 'unpaid' || invoice.status === 'partially_paid';
    if (activeTab === 'paid') return invoice.status === 'paid';
    return true;
  });

  // Group invoices by month
  const groupedByMonth = filteredInvoices.reduce((groups: Record<string, Invoice[]>, invoice) => {
    const date = new Date(invoice.invoice_date);
    const monthKey = date.toLocaleString('en-NG', { year: 'numeric', month: 'long' });
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(invoice);
    return groups;
  }, {});

  // Sort months in reverse chronological order
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    const dateA = new Date(groupedByMonth[a][0].invoice_date);
    const dateB = new Date(groupedByMonth[b][0].invoice_date);
    return dateB.getTime() - dateA.getTime();
  });

  // Flatten grouped invoices for pagination
  const allGroupedInvoices: Array<{ type: 'month' | 'invoice'; month?: string; invoice?: Invoice }> = [];
  sortedMonths.forEach(month => {
    allGroupedInvoices.push({ type: 'month', month });
    groupedByMonth[month].forEach(invoice => {
      allGroupedInvoices.push({ type: 'invoice', invoice });
    });
  });

  // Paginate items
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = allGroupedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(allGroupedInvoices.length / ITEMS_PER_PAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700';
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-700';
      case 'partially_paid':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    });
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

      <div className="px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Invoices</h1>
            <p className="text-sm text-slate-600 mt-1">Manage and track your invoices</p>
          </div>
          <button
            onClick={() => navigate('/invoices/create')}
            className="btn-primary flex items-center gap-2 rounded-2xl"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-stone-200/50">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'draft'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Drafts ({invoices.filter(i => i.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveTab('unpaid')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'unpaid'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Unpaid ({invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'paid'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid ({invoices.filter(i => i.status === 'paid').length})
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 mt-4">Loading invoices...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredInvoices.length === 0 && (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-6">
            {activeTab === 'draft' && 'No draft invoices yet'}
            {activeTab === 'unpaid' && 'No unpaid invoices yet'}
            {activeTab === 'paid' && 'No paid invoices yet'}
            {activeTab === 'all' && 'No invoices yet'}
            </p>
            <button
              onClick={() => navigate('/invoices/create')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Invoice
            </button>
          </div>
        )}

        {/* Invoices Grouped by Month with Pagination */}
        {!isLoading && filteredInvoices.length > 0 && (
          <>
            {paginatedItems.map((item, index) => (
              item.type === 'month' ? (
                <div key={`month-${index}`} className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 mt-6">{item.month}</h3>
                  <div className="card-bento overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-stone-100/50 border-b border-stone-200/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Invoice #
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200/50">
                        {groupedByMonth[item.month!].map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="hover:bg-stone-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-900">
                                {invoice.invoice_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              {formatDate(invoice.invoice_date)}
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-sm">
                              {formatDate(invoice.due_date)}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1.5 rounded-xl text-xs font-semibold ${getStatusBadge(
                                  invoice.status
                                )}`}
                              >
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                                  className="p-2 hover:bg-stone-100 rounded-xl transition-all duration-200"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4 text-slate-600" />
                                </button>
                                {invoice.status === 'draft' && (
                                  <>
                                    <button
                                      onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                      className="p-2 hover:bg-stone-100 rounded-xl transition-all duration-200"
                                      title="Edit"
                                    >
                                      <FileText className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <button
                                      className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </>
                                )}
                                {invoice.status === 'draft' && (
                                  <button
                                    className="p-2 hover:bg-green-50 rounded-xl transition-all duration-200"
                                    title="Send"
                                  >
                                    <Send className="w-4 h-4 text-green-600" />
                                  </button>
                                )}
                              </div>
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
        )}

        {/* Summary Cards */}
        {!isLoading && invoices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {/* Revenue Collected */}
            <div className="card-bento bg-gradient-to-br from-emerald-50 to-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Revenue Collected</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </div>

            {/* Outstanding Amount */}
            <div className="card-bento bg-gradient-to-br from-amber-50 to-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {formatCurrency(invoices.reduce((sum, i) => sum + (i.total_amount - (i.amount_paid || 0)), 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </div>

            {/* Total Invoiced */}
            <div className="card-bento bg-gradient-to-br from-blue-50 to-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Total Invoiced</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(invoices.reduce((sum, i) => sum + i.total_amount, 0))}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>

            {/* Invoice Count */}
            <div className="card-bento bg-gradient-to-br from-slate-100 to-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Invoices</p>
                  <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
                </div>
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-slate-700" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
