import { collection, doc, DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// All of a user's data lives under users/{uid}: the profile is the document itself and
// customers, invoices and expenses are subcollections. Security rules key off that uid.
export type UserCollection = 'customers' | 'invoices' | 'expenses';

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

export function now(): string {
  return new Date().toISOString();
}
