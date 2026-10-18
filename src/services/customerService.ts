import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { currentUid, now, requireUid, userCollection, userCollectionDoc, userDoc, withId } from './db';

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

type ProfileInput = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;

// Logos are stored inline on the profile document, which Firestore caps at 1 MB
const MAX_LOGO_BYTES = 500 * 1024;

export async function saveUserProfile(profile: ProfileInput, userId?: string): Promise<UserProfile> {
  try {
    const uid = userId ?? (await requireUid());
    const ref = userDoc(uid);
    const existing = await getDoc(ref);
    const timestamp = now();

    const data = {
      email: profile.email,
      full_name: profile.full_name,
      business_name: profile.business_name,
      business_type: profile.business_type,
      phone: profile.phone,
      location: profile.location,
      logo_url: profile.logo_url || null,
      created_at: existing.exists() ? existing.data().created_at : timestamp,
      updated_at: timestamp,
    };

    await setDoc(ref, data);
    return { id: uid, ...data, logo_url: data.logo_url ?? undefined };
  } catch (err) {
    console.error('Error saving user profile:', err);
    throw err;
  }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    const uid = await currentUid();
    if (!uid) {
      return null;
    }

    const snapshot = await getDoc(userDoc(uid));
    if (!snapshot.exists()) {
      return null;
    }

    const profile = withId<UserProfile & { logo_url?: string | null }>(snapshot);
    return { ...profile, logo_url: profile.logo_url ?? undefined };
  } catch (err) {
    console.warn('Error fetching user profile:', err);
    return null;
  }
}

export async function updateUserProfile(profile: ProfileInput): Promise<UserProfile> {
  return saveUserProfile(profile);
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const uid = await currentUid();
    if (!uid) return [];

    const snapshot = await getDocs(query(userCollection(uid, 'customers'), orderBy('created_at', 'desc')));
    return snapshot.docs.map((d) => withId<Customer>(d));
  } catch (err) {
    console.warn('Error fetching customers:', err);
    return [];
  }
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  try {
    const uid = await requireUid();
    const customers = userCollection(uid, 'customers');

    if (customer.email) {
      const duplicate = await getDocs(query(customers, where('email', '==', customer.email), limit(1)));
      if (!duplicate.empty) {
        throw new Error('A customer with this email already exists');
      }
    }

    const timestamp = now();
    const data = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tax_id: customer.tax_id || null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const ref = await addDoc(customers, data);
    return { id: ref.id, ...data };
  } catch (err) {
    console.error('Error adding customer:', err);
    throw err;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const uid = await requireUid();
    await deleteDoc(userCollectionDoc(uid, 'customers', id));
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
    const uid = await requireUid();
    const ref = userCollectionDoc(uid, 'customers', id);

    await updateDoc(ref, {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tax_id: customer.tax_id || null,
      updated_at: now(),
    });

    return withId<Customer>(await getDoc(ref));
  } catch (err) {
    console.warn('Error updating customer:', err);
    throw err;
  }
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Logo must be smaller than 500 KB. Please choose a smaller image.');
  }

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
