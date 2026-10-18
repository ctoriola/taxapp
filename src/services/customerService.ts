import {
  deleteDoc,
  doc,
  getDocs,
  getDocsFromCache,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  FirestoreError,
} from 'firebase/firestore';
import { currentUid, getDocFast, now, requireUid, settleWrite, userCollection, userCollectionDoc, userDoc, withId } from './db';

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
  // The business's own Tax Identification Number, shown on its VAT invoices
  tax_id?: string;
  created_at: string;
  updated_at: string;
}

type ProfileInput = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;

// Logos are stored inline on the profile document, which Firestore caps at 1 MB
const MAX_LOGO_BYTES = 500 * 1024;

function profileFields(profile: ProfileInput) {
  return {
    email: profile.email,
    full_name: profile.full_name,
    business_name: profile.business_name,
    business_type: profile.business_type,
    phone: profile.phone,
    location: profile.location,
    logo_url: profile.logo_url || null,
    tax_id: profile.tax_id?.trim() || null,
  };
}

// Creates the profile for a new account (signup, or first Google sign-in)
export async function saveUserProfile(profile: ProfileInput, userId?: string): Promise<UserProfile> {
  try {
    const uid = userId ?? (await requireUid());
    const timestamp = now();
    const data = { ...profileFields(profile), created_at: timestamp, updated_at: timestamp };

    await settleWrite(setDoc(userDoc(uid), data));
    return { id: uid, ...data, logo_url: data.logo_url ?? undefined, tax_id: data.tax_id ?? undefined };
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

    const snapshot = await getDocFast(userDoc(uid));
    return snapshot.exists() ? toProfile(snapshot) : null;
  } catch (err) {
    console.warn('Error fetching user profile:', err);
    return null;
  }
}

function toProfile(snapshot: Parameters<typeof withId>[0]): UserProfile {
  const profile = withId<UserProfile & { logo_url?: string | null; tax_id?: string | null }>(snapshot);
  return { ...profile, logo_url: profile.logo_url ?? undefined, tax_id: profile.tax_id ?? undefined };
}

// Live profile updates. Waits for the server before reporting "no profile", so a cold cache
// isn't mistaken for a user who hasn't set one up yet.
export function subscribeToUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: FirestoreError) => void
): () => void {
  return onSnapshot(
    userDoc(uid),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (snapshot.exists()) {
        onChange(toProfile(snapshot));
      } else if (!snapshot.metadata.fromCache) {
        onChange(null);
      }
    },
    onError
  );
}

// Updates an existing profile. Merging keeps created_at without reading the document first.
export async function updateUserProfile(profile: ProfileInput): Promise<UserProfile> {
  try {
    const uid = await requireUid();
    const ref = userDoc(uid);
    await settleWrite(setDoc(ref, { ...profileFields(profile), updated_at: now() }, { merge: true }));
    return toProfile(await getDocFast(ref));
  } catch (err) {
    console.warn('Error updating user profile:', err);
    throw err;
  }
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
  try {
    const uid = await requireUid();
    const customers = userCollection(uid, 'customers');

    if (customer.email) {
      // The customers listener keeps the cache complete, so check there first (instant)
      const duplicateQuery = query(customers, where('email', '==', customer.email), limit(1));
      const duplicate = await getDocsFromCache(duplicateQuery).catch(() => getDocs(duplicateQuery));
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

    const ref = doc(customers);
    await settleWrite(setDoc(ref, data));
    return { id: ref.id, ...data };
  } catch (err) {
    console.error('Error adding customer:', err);
    throw err;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    const uid = await requireUid();
    await settleWrite(deleteDoc(userCollectionDoc(uid, 'customers', id)));
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

    await settleWrite(updateDoc(ref, {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tax_id: customer.tax_id || null,
      updated_at: now(),
    }));

    return withId<Customer>(await getDocFast(ref));
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
