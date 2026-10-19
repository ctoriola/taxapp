import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-canvas">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Accounts created with Google have no business profile until they fill one in
  if (!profile) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
}
