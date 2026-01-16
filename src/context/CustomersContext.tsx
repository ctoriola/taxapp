import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { fetchCustomers, addCustomer, deleteCustomer, updateCustomer, Customer } from '../services/customerService';

interface CustomersContextType {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  refreshCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
}

export const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export function CustomersProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch customers';
      setError(message);
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const newCustomer = await addCustomer(customer);
      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add customer';
      setError(message);
      console.error('Error adding customer:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete customer';
      setError(message);
      console.error('Error deleting customer:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCustomer = async (
    id: string,
    customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateCustomer(id, customer);
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update customer';
      setError(message);
      console.error('Error updating customer:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomersContext.Provider
      value={{
        customers,
        isLoading,
        error,
        refreshCustomers,
        addCustomer: handleAddCustomer,
        deleteCustomer: handleDeleteCustomer,
        updateCustomer: handleUpdateCustomer,
      }}
    >
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const context = React.useContext(CustomersContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within CustomersProvider');
  }
  return context;
}
