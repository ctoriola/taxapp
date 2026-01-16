import { supabase } from '../lib/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
}

export async function signUp(email: string, password: string): Promise<AuthUser> {
  try {
    console.log('Starting signup for:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    console.log('Supabase response - Data:', data, 'Error:', error);

    if (error) {
      console.error('Error signing up:', error);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      
      // Provide user-friendly error messages
      if (error.message.includes('already registered')) {
        throw new Error('This email is already registered. Please sign in instead.');
      }
      if (error.message.includes('password')) {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        throw new Error('Connection error. Please check your internet and try again.');
      }
      if (error.message.includes('CORS') || error.message.includes('fetch')) {
        throw new Error('Server connection error. Please try again in a moment.');
      }
      throw new Error(error.message || 'Signup failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('No user returned from signup');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  } catch (err) {
    console.error('Signup error:', err);
    throw err;
  }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Connection error. Please check your internet and try again.');
      }
      throw new Error(error.message || 'Sign in failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('No user returned from signin');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  } catch (err) {
    console.error('Sign in error:', err);
    throw err;
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
  };
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
      });
    } else {
      callback(null);
    }
  });
  return data?.subscription;
}
