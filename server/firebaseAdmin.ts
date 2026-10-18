import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

declare const process: { env: Record<string, string | undefined> };

// Server-side Firebase with full access (bypasses security rules), for the admin console and
// visit tracking. Configured from FIREBASE_SERVICE_ACCOUNT: the JSON key from Firebase console >
// Project settings > Service accounts > Generate new private key. When the emulator env vars are
// set (local testing), no credentials are needed.

export interface AdminServices {
  auth: Auth;
  db: Firestore;
  projectId: string;
  privateKey: string; // used to derive the admin session secret; empty under the emulator
}

let cached: AdminServices | null = null;

export function getAdminServices(): AdminServices | null {
  if (cached) return cached;

  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let app: App;
  let projectId: string;
  let privateKey = '';

  if (raw) {
    let account: { project_id: string; client_email: string; private_key: string };
    try {
      account = JSON.parse(raw);
    } catch {
      console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      return null;
    }
    projectId = account.project_id;
    privateKey = account.private_key;
    app = getApps()[0] ?? initializeApp({
      credential: cert({ projectId, clientEmail: account.client_email, privateKey: account.private_key }),
      projectId,
    });
  } else if (usingEmulator) {
    projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'demo-vatclear';
    app = getApps()[0] ?? initializeApp({ projectId });
  } else {
    return null;
  }

  cached = { auth: getAuth(app), db: getFirestore(app), projectId, privateKey };
  return cached;
}
