import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, ArrowDownLeft } from 'lucide-react';
import { useCustomers, useExpenses, useInvoices } from '../context/DataContext';
import { formatNaira } from '../lib/finance';

interface Result {
  key: string;
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const MAX_RESULTS = 8;

// Header search across invoices, customers and expenses, from the live data already loaded
export default function GlobalSearch() {
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = (...fields: (string | null | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));
    const customerName = (id: string) => customers.find((c) => c.id === id)?.name || '';

    const invoiceResults = invoices
      .filter((i) => matches(i.invoice_number, customerName(i.customer_id), i.notes))
      .map((i) => ({
        key: `invoice-${i.id}`,
        to: `/invoices/${i.id}`,
        icon: <FileText className="w-4 h-4 text-blue-600" />,
        title: i.invoice_number,
        subtitle: `${customerName(i.customer_id) || 'Customer'} · ${formatNaira(i.total_amount)}`,
      }));
    const customerResults = customers
      .filter((c) => matches(c.name, c.email, c.phone, c.tax_id))
      .map((c) => ({
        key: `customer-${c.id}`,
        to: `/customers/${c.id}`,
        icon: <Users className="w-4 h-4 text-emerald-600" />,
        title: c.name,
        subtitle: c.email || c.phone || 'Customer',
      }));
    const expenseResults = expenses
      .filter((e) => matches(e.description, e.category, e.notes))
      .map((e) => ({
        key: `expense-${e.id}`,
        to: `/expenses/${e.id}`,
        icon: <ArrowDownLeft className="w-4 h-4 text-purple-600" />,
        title: e.description,
        subtitle: `Expense · ${formatNaira(e.total_amount)}`,
      }));

    return [...invoiceResults, ...customerResults, ...expenseResults].slice(0, MAX_RESULTS);
  }, [query, customers, invoices, expenses]);

  useEffect(() => setHighlighted(0), [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const open = (result: Result) => {
    setIsOpen(false);
    setQuery('');
    navigate(result.to);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlighted]) {
      open(results[highlighted]);
    }
  };

  const showDropdown = isOpen && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search invoices, customers, expenses..."
        aria-label="Search invoices, customers and expenses"
        className="input-field pl-10 py-2.5"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No matches for "{query.trim()}"</p>
          ) : (
            <ul role="listbox">
              {results.map((result, index) => (
                <li key={result.key} role="option" aria-selected={index === highlighted}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => open(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${index === highlighted ? 'bg-stone-100' : ''}`}
                  >
                    {result.icon}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{result.title}</span>
                      <span className="block text-xs text-slate-500 truncate">{result.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
