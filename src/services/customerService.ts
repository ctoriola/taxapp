import { supabase } from '../lib/supabaseClient';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  business_type: string;
  phone: string;
  location: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export async function saveUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>, userId?: string): Promise<UserProfile> {
  try {
    let user_id = userId;
    
    // If no userId provided, try to get it from auth
    if (!user_id) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }
      user_id = user.id;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user_id,
        email: profile.email,
        full_name: profile.full_name,
        business_name: profile.business_name,
        business_type: profile.business_type,
        phone: profile.phone,
        location: profile.location,
        logo_url: profile.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('RLS/Database error details:', error);
      if (error.code === 'PGRST301') {
        throw new Error('Permission denied. Please try logging in again.');
      }
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error saving user profile:', err);
    throw err;
  }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user profile:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.warn('Error fetching user profile:', err);
    return null;
  }
}

export async function updateUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: profile.email,
        full_name: profile.full_name,
        business_name: profile.business_name,
        business_type: profile.business_type,
        phone: profile.phone,
        location: profile.location,
        logo_url: profile.logo_url || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Error updating user profile:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    return data;
  } catch (err) {
    console.warn('Error updating user profile:', err);
    throw err;
  }
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching customers:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Error fetching customers:', err);
    return [];
  }
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          user_id: user.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          tax_id: customer.tax_id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding customer - Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      
      // Provide user-friendly error message for duplicate email
      if (error.code === '23505') {
        throw new Error('A customer with this email already exists');
      }
      
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error adding customer - Full error:', err);
    throw err;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      console.warn('Error deleting customer:', error);
      throw error;
    }
  } catch (err) {
    console.warn('Error deleting customer:', err);
    throw err;
  }
}

export async function updateCustomer(
  id: string,
  customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
): Promise<Customer> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        tax_id: customer.tax_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Error updating customer:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.warn('Error updating customer:', err);
    throw err;
  }
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result); // Returns base64 data URL
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}
