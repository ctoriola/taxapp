import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, signIn, signUp, signOut, getCurrentUser, onAuthStateChange } from '../services/authService';
import { fetchUserProfile, UserProfile } from '../services/customerService';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Fetch user profile
        if (currentUser) {
          const userProfile = await fetchUserProfile();
          setProfile(userProfile);
        }
      } catch (err) {
        console.warn('Error checking auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    let subscription: any;
    try {
      subscription = onAuthStateChange(async (authUser) => {
        setUser(authUser);
        
        // Fetch user profile when auth changes
        if (authUser) {
          const userProfile = await fetchUserProfile();
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      });
    } catch (err) {
      console.warn('Error setting up auth listener:', err);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing from auth changes:', err);
      }
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
