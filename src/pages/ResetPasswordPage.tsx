import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { verifyResetCode, resetPassword } from '../services/authService';
import AuthLayout from '../components/AuthLayout';

type LinkState = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkError, setLinkError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Firebase reset emails link here as /reset-password?mode=resetPassword&oobCode=...
  const oobCode = new URLSearchParams(window.location.search).get('oobCode') || '';

  useEffect(() => {
    if (!oobCode) {
      setLinkState('invalid');
      return;
    }

    verifyResetCode(oobCode)
      .then((accountEmail) => {
        setEmail(accountEmail);
        setLinkState('ready');
      })
      .catch((err) => {
        setLinkError(err instanceof Error ? err.message : '');
        setLinkState('invalid');
      });
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle={email ? `for ${email}` : undefined}>
        <div>
          {linkState === 'checking' && (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-brand-muted">Verifying your reset link...</p>
            </div>
          )}

          {linkState === 'invalid' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-brand-down">This reset link is invalid or has expired</p>
                  {linkError && !linkError.startsWith('This reset link is invalid') && <p className="text-sm text-brand-down">{linkError}</p>}
                </div>
              </div>
              <Link to="/forgot-password" className="btn-primary w-full h-12">
                Request a new link
              </Link>
            </div>
          )}

          {linkState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
                  <p className="text-brand-down text-sm">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-2xl border border-brand-lime-deep/40 bg-brand-lime/40 p-4 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-brand-forest">Password updated</p>
                    <p className="text-sm text-brand-forest/80">Taking you to sign in...</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="field-label">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="input-field pl-12 pr-12 bg-white"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="field-label">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field pl-12 bg-white"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting || success} className="btn-primary w-full h-12">
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
    </AuthLayout>
  );
}
