import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Mail, Phone, Building2, FileText, Users, Wallet, Check, X } from 'lucide-react';
import { useCustomers, useInvoices } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import StatusPill, { PillTone } from '../components/StatusPill';
import { Panel, PanelTitle, withNaira } from '../components/dashboard/ui';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  status: 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
  created_at: string;
}

const STATUS_TONES: Record<Invoice['status'], PillTone> = {
  draft: 'neutral',
  unpaid: 'neutral',
  partially_paid: 'warn',
  paid: 'good',
  overdue: 'bad',
};

const BACK = { to: '/customers', label: 'All customers' };

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, isLoading: customersLoading, error: customersError, updateCustomer, deleteCustomer } = useCustomers();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', tax_id: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { invoices: allInvoices, isLoading: invoicesLoading, error: invoicesError } = useInvoices();

  const customer: Customer | null = customers.find(c => c.id === id) ?? null;
  const invoices: Invoice[] = allInvoices.filter(inv => inv.customer_id === id);
  const isLoading = customersLoading || invoicesLoading;
  const error = (!customer && (customersError || invoicesError)) || (!isLoading && !customer ? 'Customer not found' : '');

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

  const startEditing = () => {
    if (!customer) return;
    setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '', tax_id: customer.tax_id || '' });
    setActionError('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!form.name.trim()) {
      setActionError('Customer name is required.');
      return;
    }
    setIsSaving(true);
    setActionError('');
    try {
      await updateCustomer(customer.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        tax_id: form.tax_id.trim() || null,
      });
      setIsEditing(false);
    } catch {
      setActionError("Couldn't save the changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Customers with invoices can't be deleted: the invoices would lose who they were for
  const handleDelete = async () => {
    if (!customer) return;
    if (invoices.length > 0) {
      setActionError(`${customer.name} has ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}, so they can't be deleted. Delete their draft invoices first; issued invoices are tax records and stay.`);
      return;
    }
    if (!window.confirm(`Delete ${customer.name}? This can't be undone.`)) return;
    setActionError('');
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      navigate('/customers');
    } catch {
      setIsDeleting(false);
      setActionError(`Couldn't delete ${customer.name}. Please try again.`);
    }
  };

  // Calculate customer metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total_amount, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
  const totalOutstanding = totalInvoiced - totalPaid;
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const unpaidCount = invoices.filter(i => i.status === 'unpaid' || i.status === 'partially_paid').length;

  if ((isLoading && !customer) || isDeleting) {
    return (
      <div className="space-y-5">
        <PageHeader title="Customer" back={BACK} />
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-muted">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-5">
        <PageHeader title="Customer" back={BACK} />
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-6 text-center">
          <p className="text-brand-down">{error || 'Customer not found'}</p>
        </div>
      </div>
    );
  }

  const contactRows = [
    { icon: <Mail className="w-4 h-4" />, label: 'Email', value: customer.email },
    { icon: <Phone className="w-4 h-4" />, label: 'Phone', value: customer.phone },
    ...(customer.tax_id ? [{ icon: <Building2 className="w-4 h-4" />, label: 'Tax ID', value: customer.tax_id }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.name}
        description="Customer Profile"
        back={BACK}
        actions={
          <>
            <button type="button" onClick={startEditing} disabled={isEditing} className="btn-primary">
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button type="button" onClick={handleDelete} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        }
      />

      {actionError && (
        <p role="alert" className="rounded-2xl bg-brand-down/5 border border-brand-down/20 px-4 py-3 text-sm text-brand-down">{actionError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Contact Information */}
        <Panel className="lg:col-span-5">
          <PanelTitle icon={<Users className="w-[18px] h-[18px]" />} title="Contact Information" />
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4" aria-label="Edit customer">
              {([
                { key: 'name', label: 'Customer name', type: 'text', required: true },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Phone', type: 'tel' },
                { key: 'tax_id', label: 'Tax ID (TIN)', type: 'text' },
              ] as const).map((field) => (
                <div key={field.key}>
                  <label htmlFor={`edit-${field.key}`} className="field-label">{field.label}</label>
                  <input
                    id={`edit-${field.key}`}
                    name={field.key}
                    type={field.type}
                    required={'required' in field}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="input-field"
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={isSaving} className="btn-primary">
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
          <ul className="space-y-4">
            {contactRows.map((row) => (
              <li key={row.label} className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-full border border-brand-line flex items-center justify-center text-brand-ink flex-shrink-0">
                  {row.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-brand-muted">{row.label}</p>
                  <p className="text-brand-ink font-medium truncate">{row.value}</p>
                </div>
              </li>
            ))}
          </ul>
          )}
        </Panel>

        {/* Summary: lime highlight, like the dashboard's return card */}
        <section className="lg:col-span-7 min-w-0 rounded-[28px] bg-brand-lime p-5 sm:p-6 text-brand-ink flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center">
              <Wallet className="w-[18px] h-[18px]" />
            </span>
            <h2 className="text-lg font-semibold">Summary</h2>
          </div>
          <p className="text-sm text-brand-ink/75 mt-6">Outstanding</p>
          <p className="text-[36px] sm:text-5xl font-medium tracking-tight leading-tight break-all">{withNaira(formatCurrency(totalOutstanding))}</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl bg-white/35 p-4 min-w-0">
              <p className="text-xs text-brand-ink/75">Total Invoiced</p>
              <p className="text-lg sm:text-xl font-semibold mt-1 truncate">{withNaira(formatCurrency(totalInvoiced))}</p>
            </div>
            <div className="rounded-2xl bg-white/35 p-4 min-w-0">
              <p className="text-xs text-brand-ink/75">Amount Paid</p>
              <p className="text-lg sm:text-xl font-semibold mt-1 truncate">{withNaira(formatCurrency(totalPaid))}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <Panel>
          <p className="text-sm text-brand-muted">Invoices Created</p>
          <p className="text-3xl font-medium tracking-tight text-brand-ink mt-1">{invoices.length}</p>
        </Panel>
        <Panel>
          <p className="text-sm text-brand-muted">Status Breakdown</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusPill tone="good">{paidCount} Paid</StatusPill>
            <StatusPill tone="warn">{unpaidCount} Unpaid</StatusPill>
          </div>
        </Panel>
      </div>

      {/* Invoices List */}
      <Panel className="p-0 sm:p-0 overflow-hidden">
        <div className="p-5 sm:p-6 pb-0 sm:pb-0">
          <PanelTitle icon={<FileText className="w-[18px] h-[18px]" />} title={`Invoices (${invoices.length})`} />
        </div>

        {invoices.length === 0 ? (
          <div className="px-6 pb-10 pt-4 text-center">
            <p className="text-brand-muted">No invoices for this customer yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-head px-5 sm:px-6 py-3">Invoice #</th>
                  <th className="table-head px-5 sm:px-6 py-3">Date</th>
                  <th className="table-head px-5 sm:px-6 py-3 text-right">Amount</th>
                  <th className="table-head px-5 sm:px-6 py-3 text-right">Paid</th>
                  <th className="table-head px-5 sm:px-6 py-3">Status</th>
                  <th className="table-head px-5 sm:px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="table-row">
                    <td className="px-5 sm:px-6 py-4 font-semibold text-brand-ink whitespace-nowrap">{invoice.invoice_number}</td>
                    <td className="px-5 sm:px-6 py-4 text-brand-muted whitespace-nowrap">{formatDate(invoice.invoice_date)}</td>
                    <td className="px-5 sm:px-6 py-4 font-semibold text-brand-ink text-right tabular-nums whitespace-nowrap">{withNaira(formatCurrency(invoice.total_amount))}</td>
                    <td className="px-5 sm:px-6 py-4 text-brand-ink text-right tabular-nums whitespace-nowrap">{withNaira(formatCurrency(invoice.amount_paid))}</td>
                    <td className="px-5 sm:px-6 py-4">
                      <StatusPill tone={STATUS_TONES[invoice.status] || 'neutral'}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                      </StatusPill>
                    </td>
                    <td className="px-5 sm:px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="text-brand-forest font-semibold hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
