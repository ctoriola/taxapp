import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowUpRight, MailCheck, RefreshCw } from 'lucide-react';
import ClientsLayout from '../components/ClientsLayout';
import PageHeader from '../components/PageHeader';
import { Panel } from '../components/dashboard/ui';
import { useAuth } from '../context/AuthContext';
import { ClientLink, isEmailVerified, refreshVerification, sendVerificationEmail, subscribeToMyClients } from '../services/accountantService';

// The accountant's list of businesses that have given them view-only access
export default function ClientsPage() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(isEmailVerified());
  const [clients, setClients] = useState<ClientLink[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!user?.email || !verified) return;
    return subscribeToMyClients(user.email, (list, code) => {
      setClients(list);
      setLoadError(code ? "Couldn't load your clients. Please refresh the page." : '');
    });
  }, [user?.email, verified]);

  const send = async () => {
    setIsBusy(true);
    setMessage('');
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch {
      setMessage("Couldn't send the email. Wait a minute and try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const check = async () => {
    setIsBusy(true);
    setMessage('');
    try {
      const ok = await refreshVerification();
      setVerified(ok);
      if (!ok) setMessage("Not verified yet. Click the link in the email, then try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <ClientsLayout>
      <PageHeader title="Your clients" description="Businesses that have given you view-only access to their records." />

      {!verified ? (
        <Panel className="max-w-xl">
          <span className="inline-flex w-12 h-12 rounded-full bg-brand-lime items-center justify-center text-brand-forest mb-4">
            <MailCheck className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-brand-ink">Verify your email to see client records</h2>
          <p className="text-sm text-brand-muted mt-1">
            Clients give access to an email address, so we need to confirm that <span className="font-semibold text-brand-ink">{user?.email}</span> is yours.
          </p>
          {message && <p role="status" className="mt-3 text-sm text-brand-orange">{message}</p>}
          {sent && <p role="status" className="mt-3 text-sm text-brand-forest">Verification email sent. Check your inbox (and spam folder).</p>}
          <div className="flex flex-wrap gap-2 mt-5">
            <button type="button" onClick={send} disabled={isBusy} className="btn-primary">
              <MailCheck className="w-4 h-4" />
              {sent ? 'Send again' : 'Send verification email'}
            </button>
            <button type="button" onClick={check} disabled={isBusy} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              I've verified
            </button>
          </div>
        </Panel>
      ) : loadError ? (
        <p role="alert" className="rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">{loadError}</p>
      ) : clients === null ? (
        <div className="flex justify-center py-16" role="status" aria-label="Loading">
          <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
        </div>
      ) : clients.length === 0 ? (
        <Panel className="text-center py-12">
          <span className="inline-flex w-12 h-12 rounded-full bg-brand-lime items-center justify-center text-brand-forest mb-4">
            <Briefcase className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-brand-ink">No clients yet</h2>
          <p className="text-sm text-brand-muted mt-1 max-w-md mx-auto">
            Ask your client to add <span className="font-semibold text-brand-ink">{user?.email}</span> in VATClear under Settings → Accountant access. They'll appear here straight away.
          </p>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <li key={c.id}>
              <Link to={`/clients/${c.owner_uid}`} className="group block bg-white rounded-[28px] p-5 sm:p-6 hover:ring-2 hover:ring-brand-lime transition">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-11 h-11 rounded-full bg-brand-lime text-brand-forest font-bold flex items-center justify-center" aria-hidden="true">
                    {c.business_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="w-9 h-9 rounded-full bg-brand-canvas flex items-center justify-center text-brand-ink group-hover:bg-brand-lime transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-brand-ink truncate">{c.business_name}</h2>
                <p className="text-sm text-brand-muted truncate">{c.owner_email}</p>
                <p className="text-xs text-brand-muted mt-3">View only · since {new Date(c.invited_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ClientsLayout>
  );
}
