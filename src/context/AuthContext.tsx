import React, { createContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthUser,
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  onAuthStateChange,
  isReturningFromGoogle,
  clearGoogleRedirectMarker,
} from '../services/authService';
import { fetchUserProfile, subscribeToUserProfile, UserProfile } from '../services/customerService';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  // True until Firebase has restored the session (or finished a returning Google sign-in)
  isInitializing: boolean;
  // This tab is coming back from Google sign-in and it hasn't completed yet
  isCompletingGoogleSignIn: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  // Navigates away to Google; the user returns signed in. Rejects only if it can't start.
  signInWithGoogle: () => Promise<void>;
  // Clears this device's cached data and reloads the app at redirectTo (default '/')
  signOut: (redirectTo?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCompletingGoogleSignIn] = useState(isReturningFromGoogle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firebase reports the restored session (or none) first, then every sign-in/out.
    // The user is only published once their profile is known, so routes never see a
    // signed-in user whose profile is still in flight. The profile is a live listener:
    // it answers instantly from the device cache on reload and picks up edits anywhere.
    let unsubscribeProfile: (() => void) | null = null;

    const finishLoading = () => {
      setIsLoading(false);
      setIsInitializing(false);
      // Firebase has finished any returning Google sign-in by the time it reports auth state
      clearGoogleRedirectMarker();
    };

    const subscription = onAuthStateChange((authUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      if (!authUser) {
        setProfile(null);
        setUser(null);
        finishLoading();
        return;
      }

      unsubscribeProfile = subscribeToUserProfile(
        authUser.id,
        (userProfile) => {
          setProfile(userProfile);
          setUser(authUser);
          finishLoading();
        },
        (err) => {
          console.error('Error loading profile:', err);
          setProfile(null);
          setUser(authUser);
          finishLoading();
        }
      );
    });

    return () => {
      unsubscribeProfile?.();
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      setUser(user);
      
      // Fetch user profile after sign in
      const userProfile = await fetchUserProfile();
      setProfile(userProfile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      throw err;
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signUp(email, password);
      setUser(user);
      
      // Note: Profile will be saved after this in SignupPage
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async (redirectTo = '/') => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut(redirectTo);
      setUser(null);
      setProfile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      const userProfile = await fetchUserProfile();
      setProfile(userProfile);
    } catch (err) {
      console.warn('Error refreshing profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isInitializing,
        isCompletingGoogleSignIn: isCompletingGoogleSignIn && isInitializing,
        error,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        refreshProfile: handleRefreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
