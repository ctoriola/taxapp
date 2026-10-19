import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  onSnapshot,
  orderBy,
  query,
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// All of a user's data lives under users/{uid}: the profile is the document itself and
// customers, invoices, expenses and vatReturns are subcollections. Security rules key off that uid.
export type UserCollection = 'customers' | 'invoices' | 'expenses' | 'vatReturns' | 'branding' | 'recurringInvoices' | 'bankTransactions' | 'accountants';

export async function requireUid(): Promise<string> {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No authenticated user');
  return uid;
}

export async function currentUid(): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser?.uid ?? null;
}

export function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export function userCollection(uid: string, name: UserCollection) {
  return collection(db, 'users', uid, name);
}

export function userCollectionDoc(uid: string, name: UserCollection, id: string) {
  return doc(db, 'users', uid, name, id);
}

export function withId<T>(snapshot: DocumentSnapshot): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

// Read from the local cache first (kept fresh by the live listeners), else from the server
export async function getDocFast(ref: DocumentReference): Promise<DocumentSnapshot> {
  try {
    const cached = await getDocFromCache(ref);
    if (cached.exists()) return cached;
  } catch {
    // Not cached
  }
  return getDoc(ref);
}

export interface LiveSnapshot<T> {
  items: T[];
  // True while we only have an empty cache result and are waiting for the server
  isLoading: boolean;
}

// Subscribe to one of the user's collections, newest first. Fires immediately from cache
// when available, then again whenever anything changes (including local, unsynced writes).
export function subscribeToUserCollection<T>(
  uid: string,
  name: UserCollection,
  orderField: string,
  onChange: (snapshot: LiveSnapshot<T>) => void,
  onError: (error: FirestoreError) => void
): () => void {
  return onSnapshot(
    query(userCollection(uid, name), orderBy(orderField, 'desc')),
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange({
        items: snapshot.docs.map((d) => withId<T>(d)),
        isLoading: snapshot.empty && snapshot.metadata.fromCache,
      });
    },
    onError
  );
}

// Messages for errors from Firestore reads, most importantly misconfigured security rules
export function describeFirestoreError(error: FirestoreError, what: string): string {
  if (error.code === 'permission-denied') {
    return `Couldn't load your ${what}: the database security rules are blocking access. Publish the rules from firestore.rules in the Firebase console (Firestore Database > Rules).`;
  }
  if (error.code === 'unavailable') {
    return `Couldn't reach the server to load your ${what}. Check your connection; changes will sync when you're back online.`;
  }
  return `Couldn't load your ${what}: ${error.message}`;
}

// Writes are applied to the local cache immediately and queued for the server (persisted, so
// they survive reloads). Wait briefly for the server to confirm so errors still reach the form
// on a normal connection, but don't hang the UI on a slow one: after the timeout the write
// carries on in the background, and a late failure is reported through onBackgroundWriteError.
const WRITE_CONFIRM_TIMEOUT_MS = 2000;
const backgroundErrorListeners = new Set<(message: string) => void>();

export function onBackgroundWriteError(listener: (message: string) => void): () => void {
  backgroundErrorListeners.add(listener);
  return () => backgroundErrorListeners.delete(listener);
}

export function settleWrite(write: Promise<unknown>): Promise<void> {
  let timedOut = false;
  write.catch((err) => {
    if (!timedOut) return;
    console.error('Background save failed:', err);
    const message = 'A change you made could not be saved to the server and has been undone. Please try again.';
    backgroundErrorListeners.forEach((listener) => listener(message));
  });

  return Promise.race([
    write.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(() => { timedOut = true; resolve(); }, WRITE_CONFIRM_TIMEOUT_MS)),
  ]);
}

export function now(): string {
  return new Date().toISOString();
}
