import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { useCustomers } from '../context/CustomersContext';

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
        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-left font-medium text-slate-900 flex items-center justify-between hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className={selectedCustomer ? 'text-slate-900' : 'text-slate-500'}>
          {selectedCustomer ? selectedCustomer.name : 'Select a customer...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-300 rounded-lg shadow-lg z-50">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Customer List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {searchTerm ? 'No customers found' : 'No customers yet'}
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 ${
                    selectedCustomerId === customer.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-slate-900">{customer.name}</div>
                  {customer.email && (
                    <div className="text-xs text-slate-500 mt-0.5">{customer.email}</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add New Customer Option */}
          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSearchTerm('');
                onAddNew();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors text-sm"
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
