import { supabase } from '../lib/supabaseClient';

export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  apply_vat: boolean;
  status: 'draft' | 'sent' | 'paid';
  line_items: InvoiceLineItem[];
  company_logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyLogo {
  id: string;
  user_id: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
}

// Upload company logo
export async function uploadCompanyLogo(file: File): Promise<CompanyLogo> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('logos')
      .upload(`company-logos/${fileName}`, file, { upsert: true });

    if (storageError) throw storageError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(`company-logos/${fileName}`);

    // Save logo reference in database
    const { data, error } = await supabase
      .from('company_logos')
      .upsert({
        user_id: user.id,
        logo_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || { id: '', user_id: user.id, logo_url: urlData.publicUrl, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  } catch (err) {
    console.error('Error uploading logo:', err);
    throw err;
  }
}

// Get company logo
export async function getCompanyLogo(): Promise<CompanyLogo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('company_logos')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching logo:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.warn('Error fetching company logo:', err);
    return null;
  }
}

// Delete company logo
export async function deleteCompanyLogo(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('company_logos')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting logo:', err);
    throw err;
  }
}

// Create invoice
export async function createInvoice(invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        customer_id: invoice.customer_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        notes: invoice.notes,
        subtotal: invoice.subtotal,
        vat_amount: invoice.vat_amount,
        total_amount: invoice.total_amount,
        apply_vat: invoice.apply_vat,
        status: invoice.status,
        line_items: invoice.line_items,
        company_logo_url: invoice.company_logo_url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating invoice:', err);
    throw err;
  }
}

// Get invoices
export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching invoices:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Error fetching invoices:', err);
    return [];
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
