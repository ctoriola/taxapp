import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// For pages that only need a signed-in account (e.g. an accountant reviewing clients), not a
// business profile of their own
export default function SignedInRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas">
        <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin" role="status" aria-label="Loading"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  return <>{children}</>;
}
