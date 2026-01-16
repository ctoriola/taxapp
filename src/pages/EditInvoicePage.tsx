import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, X as XIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomersContext';
import CustomerSelect from '../components/CustomerSelect';
import NewCustomerModal from '../components/NewCustomerModal';
import InvoiceLineItem, { LineItem } from '../components/InvoiceLineItem';
import InvoiceSummary from '../components/InvoiceSummary';
import { supabase } from '../lib/supabaseClient';

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
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  line_items: LineItem[];
  company_logo_url: string | null;
}

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customers, refreshCustomers } = useCustomers();

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

  // Load customers and invoice on mount
  useEffect(() => {
    if (id) {
      const loadData = async () => {
        // Load customers first to ensure they're available for selection
        await refreshCustomers();
        loadInvoice(id);
      };
      loadData();
    }
  }, [id, refreshCustomers]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        console.error('Error loading invoice:', error);
        setErrorMessage('Failed to load invoice');
        return;
      }

      if (!data) {
        setErrorMessage('Invoice not found');
        return;
      }

      // Only allow editing draft invoices
      if (data.status !== 'draft') {
        setErrorMessage('Only draft invoices can be edited');
        return;
      }

      setInvoice(data);
      setSelectedCustomer(data.customer_id);
      setInvoiceDate(data.invoice_date);
      setDueDate(data.due_date);
      setNotes(data.notes || '');
      setApplyVat(data.apply_vat);
      setLineItems(data.line_items || []);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setErrorMessage('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

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

      const { error } = await supabase
        .from('invoices')
        .update({
          customer_id: selectedCustomer,
          invoice_date: invoiceDate,
          due_date: dueDate,
          notes: notes || null,
          apply_vat: applyVat,
          subtotal: totals.subtotal,
          vat_amount: totals.vat,
          total_amount: totals.total,
          line_items: lineItems,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) {
        console.error('Error updating invoice:', error);
        setErrorMessage('Failed to update invoice');
        return;
      }

      setSuccessMessage('Invoice updated successfully');
      setTimeout(() => {
        navigate(`/invoices/${invoice.id}`);
      }, 1000);
    } catch (err) {
      console.error('Error updating invoice:', err);
      setErrorMessage('Failed to update invoice');
    } finally {
      setIsSaving(false);
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

  if (!invoice) {
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
          <p className="text-red-700">{errorMessage || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </button>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left Column - Form */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Invoice</h2>

            {/* Customer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomerSelect
                    selectedCustomerId={selectedCustomer}
                    onSelect={setSelectedCustomer}
                    onAddNew={() => setIsNewCustomerModalOpen(true)}
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyVat}
                    onChange={(e) => setApplyVat(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700">Apply VAT (7.5%)</span>
                </label>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
                <button
                  onClick={handleAddLineItem}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
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
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for the customer..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveInvoice}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div>
          <InvoiceSummary
            subtotal={totals.subtotal}
            applyVat={applyVat}
            onVatToggle={setApplyVat}
          />
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
