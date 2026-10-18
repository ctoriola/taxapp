import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, LogOut, AlertCircle, ShieldCheck } from 'lucide-react';
import { adminCall, AdminAuthError } from '../services/adminService';
import AdminOverviewPanel from '../components/admin/AdminOverviewPanel';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import AdminUserDetail from '../components/admin/AdminUserDetail';

type View = { tab: 'overview' } | { tab: 'users' } | { tab: 'user'; uid: string };

// Admin console. Separate from customer accounts: signs in with ADMIN_EMAIL / ADMIN_PASSWORD.
export default function AdminPage() {
  const [session, setSession] = useState<'checking' | 'signed-out' | string>('checking');
  const [view, setView] = useState<View>({ tab: 'overview' });

  useEffect(() => {
    adminCall<{ email: string }>('session')
      .then((s) => setSession(s.email))
      .catch(() => setSession('signed-out'));
  }, []);

  // Any panel that gets a 401 sends the admin back to the login form
  const onAuthError = useCallback((err: unknown) => {
    if (err instanceof AdminAuthError) setSession('signed-out');
  }, []);

  const logout = async () => {
    await adminCall('logout').catch(() => {});
    setSession('signed-out');
  };

  if (session === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (session === 'signed-out') {
    return <AdminLogin onSignedIn={(email) => { setSession(email); setView({ tab: 'overview' }); }} />;
  }

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-semibold ${active ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-stone-100'}`;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <span className="text-lg font-bold text-emerald-900">VATClear Admin</span>
          </div>
          <nav className="flex gap-2" aria-label="Admin sections">
            <button type="button" className={tabClass(view.tab === 'overview')} onClick={() => setView({ tab: 'overview' })}>Overview</button>
            <button type="button" className={tabClass(view.tab !== 'overview')} onClick={() => setView({ tab: 'users' })}>Users</button>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">{session}</span>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view.tab === 'overview' && <AdminOverviewPanel onAuthError={onAuthError} />}
        {view.tab === 'users' && <AdminUsersPanel onAuthError={onAuthError} onOpenUser={(uid) => setView({ tab: 'user', uid })} />}
        {view.tab === 'user' && <AdminUserDetail uid={view.uid} onAuthError={onAuthError} onBack={() => setView({ tab: 'users' })} />}
      </main>
    </div>
  );
}

function AdminLogin({ onSignedIn }: { onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await adminCall<{ email: string }>('login', { email, password });
      onSignedIn(result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">VATClear Admin</h1>
          <p className="text-sm text-slate-600 mt-1">Administrator sign in</p>
        </div>
        <form onSubmit={submit} className="card p-8 space-y-5">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-900 mb-2">Admin email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
              <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-12" required />
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-900 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
              <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-12" required />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-6">
          Not an administrator? <Link to="/login" className="text-emerald-700 font-semibold">Go to the app</Link>
        </p>
      </div>
    </div>
  );
}
