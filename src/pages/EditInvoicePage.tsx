import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useInvoices } from '../context/DataContext';
import CustomerSelect from '../components/CustomerSelect';
import NewCustomerModal from '../components/NewCustomerModal';
import InvoiceLineItem, { LineItem } from '../components/InvoiceLineItem';
import InvoiceSummary from '../components/InvoiceSummary';
import { updateInvoice, Invoice } from '../services/invoiceService';
import PageHeader from '../components/PageHeader';


export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, isLoading: invoicesLoading, error: invoicesError } = useInvoices();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [applyVat, setApplyVat] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fill the form once the invoice is available from the live store. Later updates to the
  // stored invoice don't overwrite edits in progress.
  useEffect(() => {
    if (invoice || invoicesLoading || !id) return;

    if (invoicesError) {
      setErrorMessage(invoicesError);
      setIsLoading(false);
      return;
    }

    const data = invoices.find((i) => i.id === id);
    if (!data) {
      setErrorMessage('Invoice not found');
    } else if (data.status !== 'draft') {
      // Only allow editing draft invoices
      setErrorMessage('Only draft invoices can be edited');
    } else {
      setInvoice(data);
      setSelectedCustomer(data.customer_id);
      setInvoiceDate(data.invoice_date);
      setDueDate(data.due_date);
      setNotes(data.notes || '');
      setApplyVat(data.apply_vat);
      // The line item editor keys rows by id, which saved items may not have
      setLineItems((data.line_items || []).map((item, index) => ({
        ...item,
        id: item.id || `${Date.now()}-${index}`,
      })));
    }
    setIsLoading(false);
  }, [id, invoice, invoices, invoicesLoading, invoicesError]);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    const vat = applyVat ? subtotal * 0.075 : 0;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (updated: LineItem) => {
    setLineItems(lineItems.map(item => (item.id === updated.id ? updated : item)));
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleSaveInvoice = async () => {
    if (!selectedCustomer || lineItems.length === 0 || !invoice) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const totals = calculateTotals();

      await updateInvoice(invoice.id, {
        customer_id: selectedCustomer,
        invoice_date: invoiceDate,
        due_date: dueDate,
        notes,
        apply_vat: applyVat,
        subtotal: totals.subtotal,
        vat_amount: totals.vat,
        total_amount: totals.total,
        line_items: lineItems,
      });

      setSuccessMessage('Invoice updated successfully');
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      console.error('Error updating invoice:', err);
      setErrorMessage('Failed to update invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const back = { to: id ? `/invoices/${id}` : '/invoices', label: 'Back to Invoices' };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit Invoice" back={{ to: '/invoices', label: 'Back to Invoices' }} />
        <div className="card p-10 text-center">
          <div className="w-10 h-10 mx-auto border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
          <p className="text-brand-muted mt-4">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit Invoice" back={{ to: '/invoices', label: 'Back to Invoices' }} />
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-[28px] p-6 text-center">
          <p className="text-brand-down">{errorMessage || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-5">
      <PageHeader title="Edit Invoice" description={invoice.invoice_number} back={{ to: '/invoices', label: 'Back to Invoices' }} />

      {errorMessage && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
          <p className="text-brand-down">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div role="status" className="bg-brand-lime/40 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
          <p className="text-brand-forest">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-ink mb-5">Invoice Details</h2>

            {/* Customer Selection */}
            <div className="mb-5">
              <span className="field-label">Customer</span>
              <CustomerSelect
                selectedCustomerId={selectedCustomer}
                onSelect={setSelectedCustomer}
                onAddNew={() => setIsNewCustomerModalOpen(true)}
              />
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div>
                <label htmlFor="edit-invoice-date" className="field-label">Invoice Date</label>
                <input
                  id="edit-invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="edit-due-date" className="field-label">Due Date</label>
                <input
                  id="edit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer h-[50px]">
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-forest"
                  />
                  <span className="text-sm font-medium text-brand-ink">Apply VAT (7.5%)</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="edit-invoice-notes" className="field-label">Notes</label>
              <textarea
                id="edit-invoice-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for the customer..."
                className="input-field resize-none"
                rows={4}
              />
            </div>
          </section>

          {/* Line Items */}
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-brand-ink">Line Items</h2>
              <button onClick={handleAddLineItem} className="btn-secondary">
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <InvoiceLineItem
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateLineItem}
                  onRemove={handleRemoveLineItem}
                  index={index}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-4 min-w-0">
          <InvoiceSummary
            subtotal={totals.subtotal}
            applyVat={applyVat}
            onVatToggle={setApplyVat}
          />
          <button onClick={handleSaveInvoice} disabled={isSaving} className="btn-primary w-full">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => navigate(back.to)}
            disabled={isSaving}
            className="w-full h-11 rounded-full text-sm font-semibold text-brand-muted hover:text-brand-ink hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* New Customer Modal */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={() => setIsNewCustomerModalOpen(false)}
      />
    </div>
  );
}
