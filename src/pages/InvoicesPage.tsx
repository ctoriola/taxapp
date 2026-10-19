import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Eye, Trash2, Send, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useInvoices } from '../context/DataContext';
import DataErrorBanner from '../components/DataErrorBanner';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';

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

const STATUS_TONE: Record<string, PillTone> = {
  draft: 'neutral',
  unpaid: 'info',
  partially_paid: 'warn',
  paid: 'good',
  overdue: 'bad',
};

type Tab = 'all' | 'draft' | 'unpaid' | 'paid';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { invoices, isLoading, error: loadError } = useInvoices();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: `All Invoices (${invoices.length})` },
    { key: 'draft', label: `Drafts (${invoices.filter(i => i.status === 'draft').length})` },
    { key: 'unpaid', label: `Unpaid (${invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length})` },
    { key: 'paid', label: `Paid (${invoices.filter(i => i.status === 'paid').length})` },
  ];

  const stats = [
    { label: 'Revenue Collected', value: formatCurrency(invoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0)), icon: <TrendingUp className="w-[18px] h-[18px]" />, highlight: true },
    { label: 'Outstanding', value: formatCurrency(invoices.reduce((sum, i) => sum + (i.total_amount - (i.amount_paid || 0)), 0)), icon: <AlertCircle className="w-[18px] h-[18px]" /> },
    { label: 'Total Invoiced', value: formatCurrency(invoices.reduce((sum, i) => sum + i.total_amount, 0)), icon: <FileText className="w-[18px] h-[18px]" /> },
    { label: 'Total Invoices', value: String(invoices.length), icon: <CheckCircle2 className="w-[18px] h-[18px]" /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Manage and track your invoices"
        actions={
          <button onClick={() => navigate('/invoices/create')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        }
      />

      <DataErrorBanner errors={[loadError]} />

      {/* Summary tiles */}
      {!isLoading && invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-[28px] p-5 sm:p-6 ${stat.highlight ? 'bg-brand-lime' : 'bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm ${stat.highlight ? 'text-brand-ink/75' : 'text-brand-muted'}`}>{stat.label}</p>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center ${stat.highlight ? 'bg-white/40 text-brand-ink' : 'border border-brand-line text-brand-ink'}`}>
                  {stat.icon}
                </span>
              </div>
              <p className="text-2xl sm:text-[28px] font-medium tracking-tight text-brand-ink mt-3 break-all">{withNaira(stat.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div role="tablist" aria-label="Filter invoices" className="inline-flex p-1 rounded-full bg-white min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                activeTab === tab.key ? 'bg-brand-lime text-brand-ink font-semibold' : 'text-brand-muted font-medium hover:text-brand-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="card p-10 text-center">
          <div className="w-10 h-10 mx-auto border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
          <p className="text-brand-muted mt-4">Loading invoices...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredInvoices.length === 0 && (
        <div className="card p-10 text-center">
          <span className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-canvas flex items-center justify-center">
            <FileText className="w-6 h-6 text-brand-muted" />
          </span>
          <p className="text-brand-ink text-lg mb-6">
            {activeTab === 'draft' && 'No draft invoices yet'}
            {activeTab === 'unpaid' && 'No unpaid invoices yet'}
            {activeTab === 'paid' && 'No paid invoices yet'}
            {activeTab === 'all' && 'No invoices yet'}
          </p>
          <button onClick={() => navigate('/invoices/create')} className="btn-primary">
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
              <section key={`month-${index}`} className="card overflow-hidden">
                <h2 className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 text-lg font-semibold text-brand-ink">{item.month}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="table-head px-5 sm:px-6 py-3">Invoice #</th>
                        <th className="table-head px-5 sm:px-6 py-3">Date</th>
                        <th className="table-head px-5 sm:px-6 py-3">Due Date</th>
                        <th className="table-head px-5 sm:px-6 py-3">Amount</th>
                        <th className="table-head px-5 sm:px-6 py-3">Status</th>
                        <th className="table-head px-5 sm:px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByMonth[item.month!].map((invoice) => (
                        <tr key={invoice.id} className="table-row">
                          <td className="px-5 sm:px-6 py-4">
                            <span className="font-semibold text-brand-ink">{invoice.invoice_number}</span>
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-brand-muted text-sm whitespace-nowrap">{formatDate(invoice.invoice_date)}</td>
                          <td className="px-5 sm:px-6 py-4 text-brand-muted text-sm whitespace-nowrap">{formatDate(invoice.due_date)}</td>
                          <td className="px-5 sm:px-6 py-4 font-semibold text-brand-ink whitespace-nowrap tabular-nums">{withNaira(formatCurrency(invoice.total_amount))}</td>
                          <td className="px-5 sm:px-6 py-4">
                            <StatusPill tone={STATUS_TONE[invoice.status] || 'neutral'}>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </StatusPill>
                          </td>
                          <td className="px-5 sm:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-canvas transition-colors"
                                title="View"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {invoice.status === 'draft' && (
                                <>
                                  <button
                                    onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-canvas transition-colors"
                                    title="Edit"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-brand-down hover:bg-brand-down/10 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {invoice.status === 'draft' && (
                                <button
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-brand-up hover:bg-brand-lime/40 transition-colors"
                                  title="Send"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-10 px-4 rounded-full bg-white text-sm font-medium text-brand-ink disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-lime/40 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
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
      )}
    </div>
  );
}
