import { collection, doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { now, requireUid, settleWrite, userCollection, userCollectionDoc, userDoc } from './db';
import type { UserProfile } from './customerService';

// View-only accountant access. The owner invites an accountant by email; that writes two records
// in one batch: users/{owner}/accountants/{email} (the owner's list) and
// accountantClients/{email}/clients/{owner} (the accountant's list, which the security rules
// check before letting a verified account with that email read the owner's records).

export interface AccountantInvite {
  id: string; // the accountant's email, lower-case
  email: string;
  invited_at: string;
}

export interface ClientLink {
  id: string; // the owner's uid
  owner_uid: string;
  business_name: string;
  owner_email: string;
  invited_at: string;
}

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function clientRef(email: string, ownerUid: string) {
  return doc(db, 'accountantClients', email, 'clients', ownerUid);
}

export async function inviteAccountant(rawEmail: string, owner: Pick<UserProfile, 'business_name' | 'email'>): Promise<void> {
  const email = normaliseEmail(rawEmail);
  if (!EMAIL.test(email)) throw new Error('Enter a valid email address.');
  if (email === normaliseEmail(owner.email || '')) throw new Error("That's your own email. Invite your accountant's address.");
  const uid = await requireUid();
  const invitedAt = now();
  const batch = writeBatch(db);
  batch.set(userCollectionDoc(uid, 'accountants', email), { email, invited_at: invitedAt });
  batch.set(clientRef(email, uid), { owner_uid: uid, business_name: owner.business_name || 'A business', owner_email: owner.email || '', invited_at: invitedAt });
  await settleWrite(batch.commit());
}

export async function removeAccountant(email: string): Promise<void> {
  const uid = await requireUid();
  const batch = writeBatch(db);
  batch.delete(userCollectionDoc(uid, 'accountants', email));
  batch.delete(clientRef(email, uid));
  await settleWrite(batch.commit());
}

export function subscribeToMyAccountants(uid: string, onChange: (invites: AccountantInvite[]) => void): () => void {
  return onSnapshot(
    userCollection(uid, 'accountants'),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AccountantInvite, 'id'>) }))),
    (error) => {
      console.warn('Error loading accountants:', error);
      onChange([]);
    }
  );
}

// The businesses that have invited this (verified) email. Errors mean "not allowed yet", e.g.
// the email isn't verified, which the caller shows as such.
export function subscribeToMyClients(email: string, onChange: (clients: ClientLink[] | null, error?: string) => void): () => void {
  return onSnapshot(
    collection(db, 'accountantClients', normaliseEmail(email), 'clients'),
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientLink, 'id'>) }))),
    (error) => onChange(null, error.code)
  );
}

export async function fetchClientProfile(ownerUid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(userDoc(ownerUid));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as UserProfile) : null;
}

export async function leaveClient(email: string, ownerUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(clientRef(normaliseEmail(email), ownerUid));
  await settleWrite(batch.commit());
}

// ---------- Email verification (needed before an accountant can see client records) ----------

export function isEmailVerified(): boolean {
  return !!auth.currentUser?.emailVerified;
}

export async function sendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error('Please sign in again.');
  await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/clients` });
}

// After clicking the link in the email, refresh the account so the new status reaches the
// security rules (they read it from the sign-in token)
export async function refreshVerification(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload();
  if (user.emailVerified) await user.getIdToken(true);
  return user.emailVerified;
}
