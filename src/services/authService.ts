import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

function toAuthUser(user: User): AuthUser {
  return { id: user.uid, email: user.email || '', displayName: user.displayName || '' };
}

// Turn Firebase error codes into messages users can act on
function friendlyAuthError(err: unknown, fallback: string): Error {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new Error('This email is already registered. Please sign in instead.');
    case 'auth/invalid-email':
      return new Error('Please enter a valid email address.');
    case 'auth/weak-password':
      return new Error('Password must be at least 8 characters long.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new Error('Invalid email or password. Please try again.');
    case 'auth/user-disabled':
      return new Error('This account has been disabled. Please contact support.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Please wait a few minutes and try again.');
    case 'auth/network-request-failed':
      return new Error('Connection error. Please check your internet and try again.');
    case 'auth/account-exists-with-different-credential':
      return new Error('An account already exists with this email. Sign in with your email and password instead.');
    case 'auth/unauthorized-domain':
      return new Error('Google sign-in is not enabled for this website yet. Please use email and password.');
    case 'auth/web-storage-unsupported':
      return new Error('Your browser is blocking the storage Google sign-in needs. Allow cookies for this site, or sign in with email and password.');
    case 'auth/operation-not-allowed':
      return new Error('This sign-in method is not enabled. Please use email and password.');
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return new Error('This reset link is invalid or has expired. Please request a new one.');
    default:
      return new Error(fallback);
  }
}

export async function signUp(email: string, password: string): Promise<AuthUser> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    return toAuthUser(user);
  } catch (err) {
    console.error('Signup error:', err);
    throw friendlyAuthError(err, 'Signup failed. Please try again.');
  }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return toAuthUser(user);
  } catch (err) {
    console.error('Sign in error:', err);
    throw friendlyAuthError(err, 'Sign in failed. Please try again.');
  }
}

// Resolves with the signed-in user, or null if the user closed the Google popup
export async function signInWithGoogle(): Promise<AuthUser | null> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const { user } = await signInWithPopup(auth, provider);
    return toAuthUser(user);
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return null;
    }
    // Some browsers block popups; fall back to a full-page redirect, which the auth
    // state listener picks up when the user returns
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    console.error('Google sign in error:', err);
    throw friendlyAuthError(err, 'Google sign-in failed. Please try again.');
  }
}

// After a redirect sign-in (the fallback when popups are blocked), Firebase holds the outcome
// until it's read. Reading it surfaces failures that would otherwise vanish silently.
export async function completeRedirectSignIn(): Promise<AuthUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? toAuthUser(result.user) : null;
  } catch (err) {
    console.error('Google redirect sign in error:', err);
    throw friendlyAuthError(err, 'Google sign-in failed. Please try again.');
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`,
    });
  } catch (err) {
    // Don't reveal whether an account exists for this email
    if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
      return;
    }
    console.error('Error requesting password reset:', err);
    throw friendlyAuthError(err, 'Could not send reset email. Please try again.');
  }
}

// Returns the email the reset code belongs to, or throws if the code is invalid/expired
export async function verifyResetCode(code: string): Promise<string> {
  try {
    return await verifyPasswordResetCode(auth, code);
  } catch (err) {
    throw friendlyAuthError(err, 'This reset link is invalid or has expired. Please request a new one.');
  }
}

export async function resetPassword(code: string, newPassword: string): Promise<void> {
  try {
    await confirmPasswordReset(auth, code, newPassword);
  } catch (err) {
    console.error('Error resetting password:', err);
    throw friendlyAuthError(err, 'Could not update password. Please try again.');
  }
}

// Signs out and wipes this device's cached copy of the user's data (it's financial data,
// and the next person on a shared computer shouldn't see it). Clearing the cache requires
// shutting Firestore down, so the app reloads at redirectTo afterwards.
export async function signOut(redirectTo = '/'): Promise<void> {
  await firebaseSignOut(auth);
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (err) {
    console.warn('Could not clear cached data:', err);
  }
  window.location.assign(redirectTo);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  await auth.authStateReady();
  return auth.currentUser ? toAuthUser(auth.currentUser) : null;
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    callback(user ? toAuthUser(user) : null);
  });
  return { unsubscribe };
}
