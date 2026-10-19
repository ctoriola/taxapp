import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useCustomers } from '../context/DataContext';

interface CustomerSelectProps {
  selectedCustomerId: string | null;
  onSelect: (customerId: string) => void;
  onAddNew: () => void;
}

export default function CustomerSelect({ selectedCustomerId, onSelect, onAddNew }: CustomerSelectProps) {
  const { customers } = useCustomers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    onSelect(customerId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full px-4 py-3 rounded-2xl border border-brand-line bg-brand-canvas/60 text-left font-medium text-brand-ink flex items-center justify-between gap-2 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-forest focus:border-transparent"
      >
        <span className={`truncate ${selectedCustomer ? 'text-brand-ink' : 'text-brand-muted'}`}>
          {selectedCustomer ? selectedCustomer.name : 'Select a customer...'}
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-brand-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brand-line rounded-3xl shadow-lg z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-brand-line">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-full border border-brand-line bg-brand-canvas/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest focus:border-transparent focus:bg-white"
              autoFocus
            />
          </div>

          {/* Customer List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-brand-muted text-sm">
                {searchTerm ? 'No customers found' : 'No customers yet'}
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-brand-canvas transition-colors border-b border-brand-line last:border-0 ${
                    selectedCustomerId === customer.id ? 'bg-brand-lime/30' : ''
                  }`}
                >
                  <div className="font-medium text-brand-ink">{customer.name}</div>
                  {customer.email && (
                    <div className="text-xs text-brand-muted mt-0.5">{customer.email}</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add New Customer Option */}
          <div className="border-t border-brand-line p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
                onAddNew();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-brand-forest hover:bg-brand-lime/30 rounded-full font-semibold transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
