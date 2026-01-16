import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send, Edit2, Copy, CheckCircle, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useCustomers } from '../context/CustomersContext';

// Print styles
const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #invoice-document, #invoice-document * {
      visibility: visible;
    }
    #invoice-document {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      box-shadow: none;
      border: none;
      max-width: 100%;
    }
    @page {
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
  }
`;

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  notes: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  apply_vat: boolean;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  amount_paid: number;
  line_items: LineItem[];
  company_logo_url: string | null;
  created_at: string;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { customers } = useCustomers();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  useEffect(() => {
    // Inject print styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);

    if (id) {
      loadInvoice(id);
    }

    return () => {
      styleSheet.remove();
    };
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError) {
        console.error('Error fetching invoice:', fetchError);
        setError('Failed to load invoice');
        return;
      }

      if (!data) {
        setError('Invoice not found');
        return;
      }

      setInvoice(data);
      setAmountPaid(data.amount_paid || 0);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Customer';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' };
      case 'unpaid':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Unpaid' };
      case 'partially_paid':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Partially Paid' };
      case 'paid':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' };
      case 'overdue':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    // Navigate to edit page with invoice ID
    navigate(`/invoices/${id}/edit`);
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;

    // Get the invoice document element
    const element = document.getElementById('invoice-document');
    if (!element) {
      console.error('Invoice document not found');
      return;
    }

    // Clone the element to preserve original styling
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Remove edit buttons from the cloned element
    const editButtons = clonedElement.querySelectorAll('[class*="bg-blue-100"]');
    editButtons.forEach(button => {
      const buttonText = button.textContent?.trim();
      if (buttonText === 'Edit') {
        button.remove();
      }
    });

    // Create PDF options
    const opt = {
      margin: 10,
      filename: `${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    // Generate and save PDF
    html2pdf().set(opt).from(clonedElement).save();
  };

  const handleUpdatePayment = async () => {
    if (!invoice) return;

    try {
      setIsUpdatingPayment(true);
      
      // Determine status based on amount paid
      let newStatus: 'unpaid' | 'partially_paid' | 'paid';
      if (amountPaid <= 0) {
        newStatus = 'unpaid';
      } else if (amountPaid >= invoice.total_amount) {
        newStatus = 'paid';
      } else {
        newStatus = 'partially_paid';
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: amountPaid,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) {
        console.error('Error updating payment:', error);
        return;
      }

      // Update local state
      setInvoice({
        ...invoice,
        amount_paid: amountPaid,
        status: newStatus,
      });
      setIsEditingPayment(false);
    } catch (err) {
      console.error('Error updating payment:', err);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <div className="text-center py-12">
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(invoice.status);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div id="invoice-document" className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-4xl mx-auto">
        {/* Document Content */}
        <div className="p-4 sm:p-8 lg:p-12">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-slate-200">
            <div className="flex items-start gap-3 sm:gap-4 flex-shrink-0">
              {profile?.logo_url && (
                <img
                  src={profile.logo_url}
                  alt="Company logo"
                  className="h-16 w-auto"
                />
              )}
              <div>
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  {profile?.business_name || 'Your Company'}
                </div>
                {profile && (
                  <div className="text-sm text-slate-600 space-y-1">
                    {profile.email && <p>{profile.email}</p>}
                    {profile.phone && <p>{profile.phone}</p>}
                    {profile.location && <p>{profile.location}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${statusColor.bg} ${statusColor.text} mb-4`}>
                {statusColor.label}
              </div>
              <div className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-12">
            {/* Left Column */}
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Invoice Date</p>
                <p className="text-lg text-slate-900 font-medium">{formatDate(invoice.invoice_date)}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Due Date</p>
                <p className="text-lg text-slate-900 font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            </div>

            {/* Right Column - Invoice ID */}
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Invoice ID</p>
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 flex items-center justify-between group hover:bg-slate-100 transition-colors">
                <code className="text-sm font-mono text-slate-900 break-all">{invoice.invoice_number}</code>
                <button
                  onClick={() => copyToClipboard(invoice.invoice_number)}
                  className="ml-2 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy ID"
                >
                  {copiedId ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="mb-12">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Bill To</p>
            <div className="text-slate-900">
              <p className="text-lg font-semibold mb-1">{getCustomerName(invoice.customer_id)}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8 border-t border-slate-200 pt-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900 bg-slate-50">Description</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-900 bg-slate-50">Quantity</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900 bg-slate-50">Unit Price</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900 bg-slate-50">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-4 px-4 text-slate-900">{item.description}</td>
                    <td className="py-4 px-4 text-center text-slate-900">{item.quantity}</td>
                    <td className="py-4 px-4 text-right text-slate-900">{formatCurrency(item.unit_price)}</td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-12">
            <div className="w-full max-w-xs">
              {/* Subtotal */}
              <div className="flex justify-between items-center py-3 px-4 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="text-slate-900 font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {/* VAT */}
              {invoice.apply_vat && (
                <div className="flex justify-between items-center py-3 px-4 border-t border-slate-200">
                  <span className="text-slate-600 font-medium">VAT (7.5%)</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(invoice.vat_amount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center py-4 px-4 border-t-2 border-slate-300 bg-slate-50">
                <span className="text-lg font-bold text-slate-900">Total Amount</span>
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>

              {/* Payment Status */}
              <div className="py-4 px-4 border-t border-slate-200 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Amount Paid</span>
                  {!isEditingPayment ? (
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(amountPaid)}
                      </span>
                      <button
                        onClick={() => setIsEditingPayment(true)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors print:hidden"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max={invoice.total_amount}
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-32 px-3 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleUpdatePayment}
                        disabled={isUpdatingPayment}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingPayment(false);
                          setAmountPaid(invoice.amount_paid);
                        }}
                        className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-sm hover:bg-slate-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {invoice.status === 'partially_paid' && (
                  <p className="text-xs text-slate-600 mt-2">
                    Outstanding: {formatCurrency(invoice.total_amount - (invoice.amount_paid || 0))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Notes</p>
              <p className="text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">Generated on {formatDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

