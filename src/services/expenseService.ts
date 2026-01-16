import { supabase } from '../lib/supabaseClient';

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  category: 'office_supplies' | 'utilities' | 'travel' | 'meals' | 'equipment' | 'services' | 'other';
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  apply_vat: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all expenses for the authenticated user
export async function fetchExpenses(): Promise<Expense[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }
}

// Fetch a single expense
export async function fetchExpense(id: string): Promise<Expense> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching expense:', error);
    throw error;
  }
}

// Create a new expense
export async function createExpense(
  description: string,
  amount: number,
  category: string,
  expense_date: string,
  apply_vat: boolean = true,
  notes?: string
): Promise<Expense> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Calculate VAT (7.5%)
    const vat_amount = apply_vat ? amount * 0.075 : 0;
    const total_amount = amount + vat_amount;

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user.id,
          description,
          amount,
          vat_amount,
          total_amount,
          category,
          expense_date,
          apply_vat,
          notes,
          status: 'draft',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
}

// Update expense status
export async function updateExpenseStatus(
  id: string,
  status: 'draft' | 'pending' | 'approved' | 'rejected'
): Promise<Expense> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('expenses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating expense status:', error);
    throw error;
  }
}

// Update expense details
export async function updateExpense(
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Recalculate VAT if amount or apply_vat changed
    let dataToUpdate = { ...updates };
    if (updates.amount !== undefined || updates.apply_vat !== undefined) {
      const expense = await fetchExpense(id);
      const newAmount = updates.amount ?? expense.amount;
      const newApplyVat = updates.apply_vat ?? expense.apply_vat;
      
      const vat_amount = newApplyVat ? newAmount * 0.075 : 0;
      const total_amount = newAmount + vat_amount;

      dataToUpdate = {
        ...dataToUpdate,
        vat_amount,
        total_amount,
        updated_at: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(dataToUpdate)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

// Delete an expense
export async function deleteExpense(id: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

// Get total approved expenses for VAT calculation
export async function getApprovedExpensesTotal(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('expenses')
      .select('vat_amount')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (error) throw error;
    
    return (data || []).reduce((sum, exp) => sum + (exp.vat_amount || 0), 0);
  } catch (error) {
    console.error('Error getting approved expenses total:', error);
    throw error;
  }
}
