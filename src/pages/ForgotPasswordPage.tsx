import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '../services/authService';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter the email you signed up with and we'll send you a reset link.">
        <div>
          {sent ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-brand-lime-deep/40 bg-brand-lime/40 p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-brand-forest flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-brand-forest">Check your inbox</p>
                  <p className="text-sm text-brand-forest/80">
                    If an account exists for {email}, a password reset link is on its way. It can take a few minutes, so check your spam folder too.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSent(false)} className="btn-secondary w-full h-12">
                Send to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-2xl border border-brand-down/20 bg-brand-down/5 p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-down flex-shrink-0 mt-0.5" />
                  <p className="text-brand-down text-sm">{error}</p>
                </div>
              )}
              <div>
                <label htmlFor="email" className="field-label">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    className="input-field pl-12 bg-white"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full h-12">
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-forest hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
    </AuthLayout>
  );
}
