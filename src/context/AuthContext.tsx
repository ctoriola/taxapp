import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, signIn, signUp, signOut, signInWithGoogle, onAuthStateChange } from '../services/authService';
import { fetchUserProfile, UserProfile } from '../services/customerService';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  // Resolves to null if the user cancelled; hasProfile is false for first-time Google users
  signInWithGoogle: () => Promise<{ hasProfile: boolean } | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firebase reports the restored session (or none) first, then every sign-in/out.
    // The user is only published once their profile has loaded, so routes never see a
    // signed-in user whose profile is still in flight.
    const subscription = onAuthStateChange(async (authUser) => {
      const userProfile = authUser ? await fetchUserProfile() : null;
      setProfile(userProfile);
      setUser(authUser);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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
      const googleUser = await signInWithGoogle();
      if (!googleUser) return null;

      const userProfile = await fetchUserProfile();
      setProfile(userProfile);
      setUser(googleUser);
      return { hasProfile: userProfile !== null };
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

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut();
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
