import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { getDocFast, now, requireUid, settleWrite, userCollection, userCollectionDoc, withId } from './db';

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  apply_vat: boolean;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  company_logo_url?: string;
  created_at: string;
  updated_at: string;
}

type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>;

// Create invoice
export async function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
  try {
    const uid = await requireUid();
    const timestamp = now();
    const data = {
      customer_id: invoice.customer_id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      notes: invoice.notes || '',
      subtotal: invoice.subtotal,
      vat_amount: invoice.vat_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      apply_vat: invoice.apply_vat,
      status: invoice.status,
      line_items: invoice.line_items,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const ref = doc(userCollection(uid, 'invoices'));
    await settleWrite(setDoc(ref, data));
    return { id: ref.id, ...data };
  } catch (err) {
    console.error('Error creating invoice:', err);
    throw err;
  }
}

// Get a single invoice, or null if it doesn't exist
export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const uid = await requireUid();
  const snapshot = await getDocFast(userCollectionDoc(uid, 'invoices', id));
  return snapshot.exists() ? withId<Invoice>(snapshot) : null;
}

// Update invoice fields
export async function updateInvoice(id: string, updates: InvoiceUpdate): Promise<void> {
  try {
    const uid = await requireUid();
    await settleWrite(updateDoc(userCollectionDoc(uid, 'invoices', id), { ...updates, updated_at: now() }));
  } catch (err) {
    console.error('Error updating invoice:', err);
    throw err;
  }
}

// Generate invoice number
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}
