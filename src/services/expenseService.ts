import { deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDocFast, now, requireUid, settleWrite, userCollection, userCollectionDoc, withId } from './db';

export interface Expense {
  id: string;
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

// Fetch a single expense
export async function fetchExpense(id: string): Promise<Expense> {
  try {
    const uid = await requireUid();
    const snapshot = await getDocFast(userCollectionDoc(uid, 'expenses', id));
    if (!snapshot.exists()) throw new Error('Expense not found');
    return withId<Expense>(snapshot);
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
    const uid = await requireUid();

    // Calculate VAT (7.5%)
    const vat_amount = apply_vat ? amount * 0.075 : 0;
    const total_amount = amount + vat_amount;
    const timestamp = now();

    const data = {
      description,
      amount,
      vat_amount,
      total_amount,
      category: category as Expense['category'],
      expense_date,
      apply_vat,
      notes: notes || '',
      status: 'draft' as const,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const ref = doc(userCollection(uid, 'expenses'));
    await settleWrite(setDoc(ref, data));
    return { id: ref.id, ...data };
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
    const uid = await requireUid();
    await settleWrite(updateDoc(userCollectionDoc(uid, 'expenses', id), { status, updated_at: now() }));
    return fetchExpense(id);
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
    const uid = await requireUid();

    // Never let callers overwrite the document id or creation time
    const { id: _id, created_at: _createdAt, ...fields } = updates;
    let dataToUpdate: Partial<Expense> = { ...fields, updated_at: now() };

    // Recalculate VAT if amount or apply_vat changed
    if (updates.amount !== undefined || updates.apply_vat !== undefined) {
      const expense = await fetchExpense(id);
      const newAmount = updates.amount ?? expense.amount;
      const newApplyVat = updates.apply_vat ?? expense.apply_vat;

      const vat_amount = newApplyVat ? newAmount * 0.075 : 0;
      const total_amount = newAmount + vat_amount;

      dataToUpdate = { ...dataToUpdate, vat_amount, total_amount };
    }

    await settleWrite(updateDoc(userCollectionDoc(uid, 'expenses', id), dataToUpdate));
    return fetchExpense(id);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

// Delete an expense
export async function deleteExpense(id: string): Promise<void> {
  try {
    const uid = await requireUid();
    await settleWrite(deleteDoc(userCollectionDoc(uid, 'expenses', id)));
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

// Get total approved expenses for VAT calculation
export async function getApprovedExpensesTotal(): Promise<number> {
  try {
    const uid = await requireUid();
    const snapshot = await getDocs(query(userCollection(uid, 'expenses'), where('status', '==', 'approved')));
    return snapshot.docs.reduce((sum, d) => sum + (d.data().vat_amount || 0), 0);
  } catch (error) {
    console.error('Error getting approved expenses total:', error);
    throw error;
  }
}
