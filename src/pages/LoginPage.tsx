import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import SigningInScreen from '../components/SigningInScreen';
import AuthLayout from '../components/AuthLayout';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signIn, isLoading, user, profile, isCompletingGoogleSignIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    }
  };

  // Already signed in, e.g. returning from a Google redirect sign-in
  if (user && !isLoading) {
    return <Navigate to={profile ? '/dashboard' : '/complete-profile'} replace />;
  }

  if (isCompletingGoogleSignIn) {
    return <SigningInScreen />;
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your VAT, invoices and expenses."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-forest hover:underline">
            Create Account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
            <p className="text-brand-down text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="field-label">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              autoComplete="email"
              className="input-field pl-12 bg-white"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="text-sm font-medium text-brand-ink">Password</label>
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-forest hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="input-field pl-12 pr-12 bg-white"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full h-12">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-brand-line"></div>
        <span className="text-sm text-brand-muted">or</span>
        <div className="flex-1 h-px bg-brand-line"></div>
      </div>

      <GoogleSignInButton onError={setError} disabled={isLoading} />
    </AuthLayout>
  );
}
