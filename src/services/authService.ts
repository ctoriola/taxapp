import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '../lib/firebase';

export interface AuthUser {
  id: string;
  email: string;
}

function toAuthUser(user: User): AuthUser {
  return { id: user.uid, email: user.email || '' };
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

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
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
