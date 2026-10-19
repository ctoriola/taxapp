import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, FileText, AlertCircle, Users } from 'lucide-react';
import { useCustomers } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { PanelTitle } from '../components/dashboard/ui';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const { addCustomer, isLoading, customers } = useCustomers();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tax_id: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone) {
      setError('Please fill in name and phone');
      return;
    }

    // Validate email format if provided
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      // Check for duplicate email in existing customers only if email is provided
      const customerEmailExists = customers.some(
        (customer) => customer.email.toLowerCase() === formData.email.toLowerCase()
      );
      if (customerEmailExists) {
        setError('A customer with this email already exists');
        return;
      }
    }

    try {
      await addCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: formData.tax_id || null,
      });
      navigate('/customers');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add customer';
      setError(message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Add New Customer" back={{ to: '/customers', label: 'All customers' }} />
      <div className="card p-5 sm:p-8 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
                <p className="text-brand-down text-sm">{error}</p>
              </div>
            )}

            {/* Contact Information */}
            <div>
              <PanelTitle icon={<Users className="w-[18px] h-[18px]" />} title="Contact Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="md:col-span-2">
                  <label htmlFor="name" className="field-label">
                    Name (Individual or Company)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-muted" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe or Company Ltd"
                      className="input-field pl-11"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="field-label">
                    Email Address <span className="text-brand-muted text-xs font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-muted" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="input-field pl-11"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="field-label">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-muted" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234 801 234 5678"
                      className="input-field pl-11"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="pt-6 border-t border-brand-line">
              <PanelTitle icon={<FileText className="w-[18px] h-[18px]" />} title="Tax Information" />
              <div>
                <label htmlFor="tax_id" className="field-label">
                  Tax ID / BVN / CAC Number (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-brand-muted" />
                  <input
                    id="tax_id"
                    name="tax_id"
                    type="text"
                    value={formData.tax_id}
                    onChange={handleChange}
                    placeholder="TID-000123"
                    className="input-field pl-11"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-brand-line">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
