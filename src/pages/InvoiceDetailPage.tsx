import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Download, Send, Edit2, Copy, CheckCircle, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { issueInvoice, updateInvoice } from '../services/invoiceService';
import { invoiceMailto, openEmail } from '../lib/invoiceEmail';
import { useCustomers, useInvoices } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { withNaira } from '../components/dashboard/ui';

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


export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { customers } = useCustomers();
  
  const { invoices, isLoading, error: loadError } = useInvoices();
  const invoice = invoices.find((i) => i.id === id) ?? null;
  const error = loadError || (!isLoading && !invoice ? 'Invoice not found' : '');
  const location = useLocation();
  const [sentNotice, setSentNotice] = useState(Boolean((location.state as { sent?: boolean } | null)?.sent));
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    // Inject print styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = printStyles;
    document.head.appendChild(styleSheet);

    return () => {
      styleSheet.remove();
    };
  }, []);

  // Keep the payment field in step with the stored invoice, unless it's being edited
  const storedAmountPaid = invoice?.amount_paid || 0;
  useEffect(() => {
    if (!isEditingPayment) setAmountPaid(storedAmountPaid);
  }, [storedAmountPaid, isEditingPayment]);

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
        return { tone: 'neutral' as PillTone, label: 'Draft' };
      case 'unpaid':
        return { tone: 'info' as PillTone, label: 'Unpaid' };
      case 'partially_paid':
        return { tone: 'warn' as PillTone, label: 'Partially Paid' };
      case 'paid':
        return { tone: 'good' as PillTone, label: 'Paid' };
      case 'overdue':
        return { tone: 'bad' as PillTone, label: 'Overdue' };
      default:
        return { tone: 'neutral' as PillTone, label: status };
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

  // Issue the draft and open the user's email app addressed to the customer
  const handleSend = async () => {
    if (!invoice) return;
    const customer = customers.find((c) => c.id === invoice.customer_id);
    if (!window.confirm(`Send ${invoice.invoice_number}${customer ? ` to ${customer.name}` : ''}? It will be marked as issued and count towards your VAT.`)) return;
    setIsSending(true);
    setSendError('');
    try {
      await issueInvoice(invoice);
      openEmail(invoiceMailto({ invoice, customer, businessName: profile?.business_name }));
      setSentNotice(true);
    } catch {
      setSendError("Couldn't send the invoice. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = () => {
    // Navigate to edit page with invoice ID
    navigate(`/invoices/${id}/edit`);
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    // Get the invoice document element
    const element = document.getElementById('invoice-document');
    if (!element) {
      console.error('Invoice document not found');
      return;
    }

    // Clone the element to preserve original styling
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Remove on-screen controls (the payment Edit button) from the cloned element
    clonedElement.querySelectorAll('[data-pdf-exclude]').forEach((el) => el.remove());

    // Create PDF options
    const opt = {
      margin: 10,
      filename: `${invoice.invoice_number}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    // The PDF library is large, so it's only downloaded when someone actually exports
    const { default: html2pdf } = await import('html2pdf.js');
    html2pdf().set(opt).from(clonedElement).save();
  };

  const handleUpdatePayment = async () => {
    if (!invoice) return;

    setPaymentError('');
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      setPaymentError('Amount paid cannot be negative');
      return;
    }
    if (amountPaid > invoice.total_amount) {
      setPaymentError(`Amount paid cannot exceed the invoice total of ${formatCurrency(invoice.total_amount)}`);
      return;
    }

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

      await updateInvoice(invoice.id, {
        amount_paid: amountPaid,
        status: newStatus,
      });

      // The live store picks up the change, so there's no local copy to update
      setIsEditingPayment(false);
    } catch (err) {
      console.error('Error updating payment:', err);
      setPaymentError('Could not save payment. Please try again.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const back = { to: '/invoices', label: 'Back to Invoices' };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Invoice" back={back} />
        <div className="card p-10 text-center">
          <div className="w-10 h-10 mx-auto border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
          <p className="text-brand-muted mt-4">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-5">
        <PageHeader title="Invoice" back={back} />
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-[28px] p-6 text-center">
          <p className="text-brand-down">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(invoice.status);
  const customer = customers.find((c) => c.id === invoice.customer_id);
  const outstanding = invoice.total_amount - (invoice.amount_paid || 0);

  return (
    <div className="space-y-5">
      <PageHeader
        back={back}
        title={invoice.invoice_number}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {getCustomerName(invoice.customer_id)} · due {formatDate(invoice.due_date)}
          </span>
        }
        actions={
          <>
            {invoice.status === 'draft' && (
              <>
                <button onClick={handleEdit} className="btn-primary">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button type="button" onClick={handleSend} disabled={isSending} className="btn-lime">
                  <Send className="w-4 h-4" />
                  {isSending ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
            <button onClick={handlePrint} className="btn-secondary">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={handleDownloadPDF} className="btn-secondary">
              <Download className="w-4 h-4" />
              PDF
            </button>
          </>
        }
      />

      {sentNotice && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-brand-lime/40 px-5 py-4 print:hidden">
          <p className="text-sm text-brand-ink">
            <span className="font-semibold">Marked as sent.</span> Your email app opened with a message to{' '}
            {customer?.email || 'your customer'}. Download the PDF and attach it before sending.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDownloadPDF} className="btn-primary h-9">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button type="button" onClick={() => setSentNotice(false)} className="text-sm font-medium text-brand-forest hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}
      {sendError && <p role="alert" className="text-sm text-brand-down">{sendError}</p>}

      {/* At-a-glance tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="rounded-[28px] bg-brand-lime p-5 sm:p-6">
          <p className="text-sm text-brand-ink/75">Total amount</p>
          <p className="text-2xl sm:text-[28px] font-medium tracking-tight text-brand-ink mt-2 break-all">{withNaira(formatCurrency(invoice.total_amount))}</p>
        </div>
        <div className="rounded-[28px] bg-white p-5 sm:p-6">
          <p className="text-sm text-brand-muted">Paid so far</p>
          <p className="text-2xl sm:text-[28px] font-medium tracking-tight text-brand-ink mt-2 break-all">{withNaira(formatCurrency(invoice.amount_paid || 0))}</p>
        </div>
        <div className="rounded-[28px] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-brand-muted">Outstanding</p>
            <StatusPill tone={statusColor.tone}>{statusColor.label}</StatusPill>
          </div>
          <p className={`text-2xl sm:text-[28px] font-medium tracking-tight mt-2 break-all ${outstanding > 0 ? 'text-brand-ink' : 'text-brand-up'}`}>{withNaira(formatCurrency(outstanding))}</p>
        </div>
      </div>

      {/* Invoice Document (also printed and exported as PDF: plain text only, no ₦ drawing) */}
      <div id="invoice-document" className="bg-white rounded-[28px] max-w-4xl mx-auto overflow-hidden">
        <div className="p-6 sm:p-10">
          {/* Header Section */}
          <div className="flex flex-wrap items-start justify-between gap-6 mb-10 pb-8 border-b border-brand-line">
            <div className="flex items-start gap-4 min-w-0">
              {profile?.logo_url && (
                <img
                  src={profile.logo_url}
                  alt="Company logo"
                  className="h-16 w-auto"
                />
              )}
              <div className="min-w-0">
                <div className="text-2xl sm:text-3xl font-bold text-brand-ink mb-2 break-words">
                  {profile?.business_name || 'Your Company'}
                </div>
                {profile && (
                  <div className="text-sm text-brand-muted space-y-1">
                    {profile.email && <p>{profile.email}</p>}
                    {profile.phone && <p>{profile.phone}</p>}
                    {profile.location && <p>{profile.location}</p>}
                    {profile.tax_id && <p>TIN: {profile.tax_id}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="mb-3">
                <StatusPill tone={statusColor.tone}>{statusColor.label}</StatusPill>
              </div>
              <div className="text-2xl font-bold text-brand-ink">{invoice.invoice_number}</div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 mb-10">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Invoice Date</p>
                <p className="text-lg text-brand-ink font-medium">{formatDate(invoice.invoice_date)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Due Date</p>
                <p className="text-lg text-brand-ink font-medium">{formatDate(invoice.due_date)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Invoice ID</p>
              <div className="bg-brand-canvas rounded-2xl p-4 flex items-center justify-between group">
                <code className="text-sm font-mono text-brand-ink break-all">{invoice.invoice_number}</code>
                <button
                  onClick={() => copyToClipboard(invoice.invoice_number)}
                  className="ml-2 p-2 text-brand-muted hover:text-brand-ink hover:bg-white rounded-full transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                  title="Copy ID"
                >
                  {copiedId ? (
                    <CheckCircle className="w-5 h-5 text-brand-up" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bill To Section */}
          <div className="mb-10">
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">Bill To</p>
            <div className="text-brand-ink">
              <p className="text-lg font-semibold mb-1">{getCustomerName(invoice.customer_id)}</p>
              {customer?.tax_id && (
                <p className="text-sm text-brand-muted">TIN: {customer.tax_id}</p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8 border-t border-brand-line pt-8 overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-brand-canvas">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-muted rounded-l-xl">Description</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-muted">Quantity</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-muted">Unit Price</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-brand-muted rounded-r-xl">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item, index) => (
                  <tr key={index} className="border-b border-brand-line">
                    <td className="py-4 px-4 text-brand-ink">{item.description}</td>
                    <td className="py-4 px-4 text-center text-brand-ink">{item.quantity}</td>
                    <td className="py-4 px-4 text-right text-brand-ink whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                    <td className="py-4 px-4 text-right font-semibold text-brand-ink whitespace-nowrap">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-10">
            <div className="w-full sm:max-w-sm">
              <div className="flex justify-between items-center py-3 px-4">
                <span className="text-brand-muted font-medium">Subtotal</span>
                <span className="text-brand-ink font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.apply_vat && (
                <div className="flex justify-between items-center py-3 px-4 border-t border-brand-line">
                  <span className="text-brand-muted font-medium">VAT (7.5%)</span>
                  <span className="text-brand-ink font-medium">{formatCurrency(invoice.vat_amount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-3 py-4 px-4 rounded-2xl bg-brand-lime mt-2">
                <span className="text-base sm:text-lg font-bold text-brand-ink">Total Amount</span>
                <span className="text-xl sm:text-2xl font-bold text-brand-ink">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>

              {/* Payment Status */}
              <div className="py-4 px-4 mt-2 rounded-2xl bg-brand-canvas">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-sm font-semibold text-brand-muted">Amount Paid</span>
                  {!isEditingPayment ? (
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-brand-ink">
                        {formatCurrency(amountPaid)}
                      </span>
                      <button
                        data-pdf-exclude
                        onClick={() => setIsEditingPayment(true)}
                        className="h-8 px-3 rounded-full bg-white border border-brand-line text-brand-forest text-sm font-semibold hover:bg-brand-lime/40 transition-colors print:hidden"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        min="0"
                        max={invoice.total_amount}
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-32 h-9 px-3 rounded-full border border-brand-line bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
                      />
                      <button
                        onClick={handleUpdatePayment}
                        disabled={isUpdatingPayment}
                        className="h-9 px-4 rounded-full bg-brand-forest text-brand-lime text-sm font-semibold hover:bg-brand-forest-hover transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingPayment(false);
                          setAmountPaid(invoice.amount_paid || 0);
                          setPaymentError('');
                        }}
                        className="h-9 px-4 rounded-full bg-white border border-brand-line text-brand-ink text-sm font-semibold hover:bg-brand-canvas transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {paymentError && (
                  <p role="alert" className="text-xs text-brand-down mt-2 print:hidden">{paymentError}</p>
                )}
                {invoice.status === 'partially_paid' && (
                  <p className="text-xs text-brand-muted mt-2">
                    Outstanding: {formatCurrency(invoice.total_amount - (invoice.amount_paid || 0))}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="bg-brand-canvas rounded-2xl p-6">
              <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2">Notes</p>
              <p className="text-brand-ink whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-brand-line text-center text-sm text-brand-muted">
            <p>Thank you for your business!</p>
            <p className="mt-2">Generated on {formatDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
