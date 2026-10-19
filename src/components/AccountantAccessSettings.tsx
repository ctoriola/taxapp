import React, { useEffect, useState } from 'react';
import { UserCheck, Trash2, Mail, Eye } from 'lucide-react';
import { PanelTitle } from './dashboard/ui';
import { useAuth } from '../context/AuthContext';
import { AccountantInvite, inviteAccountant, removeAccountant, subscribeToMyAccountants } from '../services/accountantService';
import { openEmail } from '../lib/invoiceEmail';

function inviteEmail(accountant: string, business: string): string {
  const link = `${window.location.origin}/clients`;
  const subject = `View-only access to ${business}'s records on VATClear`;
  const body = [
    'Hello,',
    '',
    `I've given you view-only access to ${business}'s invoices, expenses, bank lines and VAT reports on VATClear.`,
    '',
    `Sign in or create a free account with this email address (${accountant}), then open:`,
    link,
    '',
    "If you sign up with email and password, you'll be asked to verify your email first.",
  ].join('\n');
  return `mailto:${encodeURIComponent(accountant)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Settings panel: give an accountant view-only access to this business's records
export default function AccountantAccessSettings() {
  const { user, profile } = useAuth();
  const [accountants, setAccountants] = useState<AccountantInvite[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [justInvited, setJustInvited] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => (user ? subscribeToMyAccountants(user.id, setAccountants) : undefined), [user]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setJustInvited('');
    setIsBusy(true);
    try {
      await inviteAccountant(email, profile);
      setJustInvited(email.trim().toLowerCase());
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't give access. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async (address: string) => {
    if (!window.confirm(`Remove ${address}'s access? They'll no longer be able to see your records.`)) return;
    setError('');
    try {
      await removeAccountant(address);
      if (justInvited === address) setJustInvited('');
    } catch {
      setError("Couldn't remove access. Please try again.");
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <PanelTitle icon={<UserCheck className="w-[18px] h-[18px]" />} title="Accountant access" />
      <p className="text-sm text-brand-muted -mt-2 mb-5">
        Let your accountant review your invoices, expenses, bank lines and VAT reports. Access is <strong className="text-brand-ink font-semibold">view only</strong>: they can't change anything, and you can remove it at any time.
      </p>

      {error && <p role="alert" className="mb-4 rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">{error}</p>}

      <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2" aria-label="Invite an accountant">
        <label htmlFor="accountant-email" className="sr-only">Accountant's email</label>
        <input
          id="accountant-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="accountant@firm.com"
          className="input-field flex-1"
        />
        <button type="submit" disabled={isBusy || !email.trim()} className="btn-primary">
          <Eye className="w-4 h-4" />
          {isBusy ? 'Giving access…' : 'Give view access'}
        </button>
      </form>

      {justInvited && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-lime/40 px-4 py-3">
          <p className="text-sm text-brand-forest flex-1">
            {justInvited} can now view your records once they sign in with that email.
          </p>
          <button type="button" onClick={() => openEmail(inviteEmail(justInvited, profile?.business_name || 'my business'))} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-forest hover:underline">
            <Mail className="w-4 h-4" />
            Email them the link
          </button>
        </div>
      )}

      {accountants.length > 0 && (
        <ul className="mt-5 divide-y divide-brand-line" aria-label="People with access">
          {accountants.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className="w-9 h-9 rounded-full border border-brand-line flex items-center justify-center text-sm font-semibold text-brand-ink flex-shrink-0" aria-hidden="true">
                {a.email.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-brand-ink truncate">{a.email}</p>
                <p className="text-xs text-brand-muted">View only · since {new Date(a.invited_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <button type="button" onClick={() => remove(a.id)} aria-label={`Remove ${a.email}`} className="w-9 h-9 rounded-full flex items-center justify-center text-brand-down hover:bg-brand-down/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
