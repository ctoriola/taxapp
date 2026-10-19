import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { addCustomer } from '../services/customerService';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customerId: string, customerName: string) => void;
}

export default function NewCustomerModal({ isOpen, onClose, onCustomerCreated }: NewCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newCustomer = await addCustomer({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        tax_id: null,
      });

      onCustomerCreated(newCustomer.id, newCustomer.name);
      
      // Reset form
      setFormData({ name: '', email: '', phone: '' });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create customer';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="new-customer-title">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <h2 id="new-customer-title" className="text-lg font-semibold text-brand-ink">Add New Customer</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-brand-line hover:bg-brand-canvas transition-colors"
          >
            <X className="w-5 h-5 text-brand-ink" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-brand-down/5 border border-brand-down/20 rounded-2xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-brand-down flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-down">{error}</p>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="field-label">
              Customer Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Company or individual name"
              className="input-field"
            />
          </div>

          {/* Email */}
          <div>
            <label className="field-label">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="customer@example.com"
              className="input-field"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="field-label">
              Phone (Optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 8XX XXX XXXX"
              className="input-field"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1"
            >
              {isLoading ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
