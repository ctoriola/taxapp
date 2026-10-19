import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Send, AlertCircle, CheckCircle } from 'lucide-react';
import CustomerSelect from '../components/CustomerSelect';
import NewCustomerModal from '../components/NewCustomerModal';
import InvoiceLineItem, { LineItem } from '../components/InvoiceLineItem';
import InvoiceSummary from '../components/InvoiceSummary';
import { createInvoice, generateInvoiceNumber } from '../services/invoiceService';
import PageHeader from '../components/PageHeader';

export default function CreateInvoicePage() {
  const navigate = useNavigate();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [applyVat, setApplyVat] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Generate invoice number on mount
  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
  }, []);

  // Set default due date to 30 days from now
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setDueDate(date.toISOString().split('T')[0]);
  }, []);

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

  const handleUpdateLineItem = (updatedItem: LineItem) => {
    setLineItems(lineItems.map(item => (item.id === updatedItem.id ? updatedItem : item)));
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleCustomerCreated = (customerId: string, customerName: string) => {
    setSelectedCustomer(customerId);
    setIsNewCustomerModalOpen(false);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.line_total, 0);
  };

  const handleSaveAsDraft = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedCustomer) {
      setErrorMessage('Please select a customer');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one line item');
      return;
    }

    setIsLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const vatAmount = applyVat ? subtotal * 0.075 : 0;
      const totalAmount = subtotal + vatAmount;

      await createInvoice({
        customer_id: selectedCustomer,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        notes,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        amount_paid: 0,
        apply_vat: applyVat,
        status: 'draft',
        line_items: lineItems.map(({ id, ...item }) => item),
      });
      navigate('/invoices', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save invoice';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedCustomer) {
      setErrorMessage('Please select a customer');
      return;
    }

    if (lineItems.length === 0) {
      setErrorMessage('Please add at least one line item');
      return;
    }

    if (!dueDate) {
      setErrorMessage('Please set a due date');
      return;
    }

    setIsLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const vatAmount = applyVat ? subtotal * 0.075 : 0;
      const totalAmount = subtotal + vatAmount;

      await createInvoice({
        customer_id: selectedCustomer,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        notes,
        subtotal,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        amount_paid: 0,
        apply_vat: applyVat,
        status: 'unpaid',
        line_items: lineItems.map(({ id, ...item }) => item),
      });
      navigate('/invoices', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save invoice';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = calculateSubtotal();

  return (
    <div className="space-y-5">
      <PageHeader title="Create Invoice" back={{ to: '/invoices', label: 'All invoices' }} />

      {/* Status Messages */}
      {successMessage && (
        <div role="status" className="bg-brand-lime/40 rounded-2xl p-4 flex gap-3 items-start">
          <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-forest font-medium">Success</p>
            <p className="text-brand-forest text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-brand-down font-medium">Error</p>
            <p className="text-brand-down text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Invoice Header Card */}
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-brand-ink mb-5">Invoice Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="invoice-number" className="field-label">Invoice Number</label>
                <input
                  id="invoice-number"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="invoice-date" className="field-label">Invoice Date</label>
                <input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="due-date" className="field-label">Due Date</label>
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="mb-4">
              <span className="field-label">Customer *</span>
              <CustomerSelect
                selectedCustomerId={selectedCustomer}
                onSelect={setSelectedCustomer}
                onAddNew={() => setIsNewCustomerModalOpen(true)}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="invoice-notes" className="field-label">Notes (Optional)</label>
              <textarea
                id="invoice-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or payment instructions..."
                rows={3}
                className="input-field resize-none"
              />
            </div>
          </section>

          {/* Line Items Card */}
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold text-brand-ink">Line Items</h2>
              <button type="button" onClick={handleAddLineItem} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-brand-canvas">
                <p className="text-brand-muted mb-4">No line items yet</p>
                <button type="button" onClick={handleAddLineItem} className="btn-secondary">
                  <Plus className="w-4 h-4" />
                  Add First Item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <InvoiceLineItem
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={handleUpdateLineItem}
                    onRemove={handleRemoveLineItem}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Summary and actions */}
        <div className="lg:col-span-1 space-y-4 min-w-0">
          <InvoiceSummary
            subtotal={subtotal}
            applyVat={applyVat}
            onVatToggle={setApplyVat}
          />

          <div className="space-y-3">
            <button onClick={handleSendInvoice} disabled={isLoading} className="btn-primary w-full">
              <Send className="w-4 h-4" />
              {isLoading ? 'Processing...' : 'Save Invoice'}
            </button>
            <button onClick={handleSaveAsDraft} disabled={isLoading} className="btn-secondary w-full">
              <Save className="w-4 h-4" />
              Save as Draft
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              disabled={isLoading}
              className="w-full h-11 rounded-full text-sm font-semibold text-brand-muted hover:text-brand-ink hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />
    </div>
  );
}
