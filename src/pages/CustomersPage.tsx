import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2, Mail, Phone, Building2, ArrowUpRight } from 'lucide-react';
import { useCustomers, useInvoices } from '../context/DataContext';
import PageHeader from '../components/PageHeader';

function formatAdded(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CustomersPage() {
  const { customers, deleteCustomer, isLoading, error } = useCustomers();
  const { invoices } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.tax_id?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Customers with invoices can't be deleted: the invoices would lose who they were for
  const handleDelete = async (id: string) => {
    const invoiceCount = invoices.filter((inv) => inv.customer_id === id).length;
    if (invoiceCount > 0) {
      const name = customers.find((c) => c.id === id)?.name || 'This customer';
      window.alert(`${name} has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}, so they can't be deleted.`);
      return;
    }
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Manage and track your customers"
        actions={
          <Link to="/customers/add" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        }
      />

      {error && (
        <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4">
          <p className="text-brand-down text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading && customers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-muted">Loading customers...</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-muted" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or tax ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-full bg-white border border-transparent text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-forest"
              />
            </div>
            <p className="text-sm text-brand-muted">
              {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {filteredCustomers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="card p-5 sm:p-6 flex flex-col min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center text-base font-semibold flex-shrink-0" aria-hidden="true">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-brand-ink truncate">{customer.name}</h3>
                      <p className="text-xs text-brand-muted">Added {formatAdded(customer.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-brand-down hover:bg-brand-down/10 transition-colors flex-shrink-0"
                      title="Delete customer"
                      aria-label={`Delete ${customer.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-5 space-y-2.5 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full border border-brand-line flex items-center justify-center flex-shrink-0">
                        <Mail className="w-3.5 h-3.5 text-brand-ink" />
                      </span>
                      <a href={`mailto:${customer.email}`} className="text-brand-ink hover:text-brand-forest hover:underline truncate">
                        {customer.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full border border-brand-line flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3.5 h-3.5 text-brand-ink" />
                      </span>
                      <a href={`tel:${customer.phone}`} className="text-brand-ink hover:text-brand-forest hover:underline truncate">
                        {customer.phone}
                      </a>
                    </div>
                  </div>

                  <Link to={`/customers/${customer.id}`} className="btn-secondary w-full mt-5">
                    <ArrowUpRight className="w-4 h-4" />
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-10 sm:p-12 text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-lime text-brand-forest mb-4">
                <Building2 className="w-6 h-6" />
              </span>
              <h3 className="text-lg font-semibold text-brand-ink mb-2">
                {customers.length === 0 ? 'No Customers Yet' : 'No Matching Customers'}
              </h3>
              <p className="text-brand-muted mb-6">
                {customers.length === 0 ? 'Add your first customer to get started.' : 'Try adjusting your search criteria.'}
              </p>
              {customers.length === 0 && (
                <Link to="/customers/add" className="btn-primary">
                  Add First Customer
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
