import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { AlertCircle, X } from 'lucide-react';
import { describeFirestoreError, onBackgroundWriteError, subscribeToUserCollection, UserCollection } from '../services/db';
import { addCustomer, deleteCustomer, updateCustomer, Customer } from '../services/customerService';
import { Invoice } from '../services/invoiceService';
import { Expense } from '../services/expenseService';
import { VatReturnRecord } from '../services/vatReturnService';

// One live subscription per collection for the whole session. Pages read from here, so
// navigating between them is instant and every page sees new data as soon as it's written.

interface LiveCollection<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY = { items: [], isLoading: true, error: null };

function useLiveCollection<T>(uid: string | null, name: UserCollection, orderField: string, label: string): LiveCollection<T> {
  const [state, setState] = useState<LiveCollection<T>>(EMPTY);

  useEffect(() => {
    if (!uid) {
      setState(EMPTY);
      return;
    }

    setState(EMPTY);
    return subscribeToUserCollection<T>(
      uid,
      name,
      orderField,
      ({ items, isLoading }) => setState({ items, isLoading, error: null }),
      (error) => {
        console.error(`Error loading ${name}:`, error);
        setState({ items: [], isLoading: false, error: describeFirestoreError(error, label) });
      }
    );
  }, [uid, name, orderField, label]);

  return state;
}

type CustomerInput = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

interface DataContextType {
  customers: LiveCollection<Customer>;
  invoices: LiveCollection<Invoice>;
  expenses: LiveCollection<Expense>;
  vatReturns: LiveCollection<VatReturnRecord>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;

  const customers = useLiveCollection<Customer>(uid, 'customers', 'created_at', 'customers');
  const invoices = useLiveCollection<Invoice>(uid, 'invoices', 'created_at', 'invoices');
  const expenses = useLiveCollection<Expense>(uid, 'expenses', 'expense_date', 'expenses');
  const vatReturns = useLiveCollection<VatReturnRecord>(uid, 'vatReturns', 'period', 'filed VAT returns');

  // A save that outlived its confirmation timeout and was then rejected by the server
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  useEffect(() => onBackgroundWriteError(setBackgroundError), []);

  return (
    <DataContext.Provider value={{ customers, invoices, expenses, vatReturns }}>
      {children}
      {backgroundError && (
        <div role="alert" className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{backgroundError}</p>
          <button type="button" onClick={() => setBackgroundError(null)} aria-label="Dismiss" className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </DataContext.Provider>
  );
}

function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('Data hooks must be used within DataProvider');
  }
  return context;
}

export function useInvoices() {
  const { invoices } = useData();
  return { invoices: invoices.items, isLoading: invoices.isLoading, error: invoices.error };
}

export function useExpenses() {
  const { expenses } = useData();
  return { expenses: expenses.items, isLoading: expenses.isLoading, error: expenses.error };
}

export function useVatReturns() {
  const { vatReturns } = useData();
  return { vatReturns: vatReturns.items, isLoading: vatReturns.isLoading, error: vatReturns.error };
}

export function useCustomers() {
  const { customers } = useData();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Writes update the list through the live subscription, so these just call the service
  const run = useCallback(async <R,>(action: () => Promise<R>, fallback: string): Promise<R> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      return await action();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : fallback);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    customers: customers.items,
    isLoading: customers.isLoading || isSaving,
    error: customers.error ?? saveError,
    addCustomer: (customer: CustomerInput) => run(() => addCustomer(customer), 'Failed to add customer'),
    updateCustomer: (id: string, customer: CustomerInput) => run(() => updateCustomer(id, customer), 'Failed to update customer'),
    deleteCustomer: (id: string) => run(() => deleteCustomer(id), 'Failed to delete customer'),
  };
}
