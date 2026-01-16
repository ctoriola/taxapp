import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCustomers } from '../context/CustomersContext';
import { Plus, Save, Send, X as XIcon, AlertCircle, CheckCircle, Menu, LogOut, Settings, Bell, Search, Home } from 'lucide-react';
import CustomerSelect from '../components/CustomerSelect';
import NewCustomerModal from '../components/NewCustomerModal';
import InvoiceLineItem, { LineItem } from '../components/InvoiceLineItem';
import InvoiceSummary from '../components/InvoiceSummary';
import { createInvoice, generateInvoiceNumber } from '../services/invoiceService';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { customers, refreshCustomers } = useCustomers();

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Generate invoice number and load customers on mount
  useEffect(() => {
    const generateNumber = async () => {
      const number = await generateInvoiceNumber();
      setInvoiceNumber(number);
    };
    generateNumber();
    refreshCustomers();
  }, [refreshCustomers]);

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
        apply_vat: applyVat,
        status: 'draft',
        line_items: lineItems.map(({ id, ...item }) => item),
      });

      setSuccessMessage('Invoice saved as draft successfully!');
      setTimeout(() => navigate('/invoices', { replace: true }), 1500);
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
        apply_vat: applyVat,
        status: 'unpaid',
        line_items: lineItems.map(({ id, ...item }) => item),
      });

      setSuccessMessage('Invoice saved successfully!');
      setTimeout(() => navigate('/invoices', { replace: true }), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save invoice';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = calculateSubtotal();

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
                <XIcon className="w-6 h-6 text-slate-600" />
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

            <button
              className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-emerald-900">Create Invoice</h1>
        </div>

        {/* Status Messages */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-emerald-800 font-medium">Success</p>
              <p className="text-emerald-700 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header Card */}
            <div className="card-bento p-6">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">Invoice Details</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Invoice Number */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Customer Selection */}
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Customer *
                </label>
                <CustomerSelect
                  selectedCustomerId={selectedCustomer}
                  onSelect={setSelectedCustomer}
                  onAddNew={() => setIsNewCustomerModalOpen(true)}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-700 mb-2 font-medium">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes or payment instructions..."
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
            </div>

            {/* Line Items Card */}
            <div className="card-bento p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-emerald-900">Line Items</h2>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-2 px-4 py-2 btn-primary rounded-2xl transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-stone-500 mb-4">No line items yet</p>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-2 px-4 py-2 btn-secondary rounded-2xl transition-all"
                  >
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
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Summary */}
            <InvoiceSummary
              subtotal={subtotal}
              applyVat={applyVat}
              onVatToggle={setApplyVat}
            />

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleSaveAsDraft}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-secondary rounded-2xl transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                onClick={handleSendInvoice}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-primary rounded-2xl transition-all disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {isLoading ? 'Processing...' : 'Save Invoice'}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-stone-300 text-stone-700 rounded-2xl font-medium hover:bg-stone-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
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
