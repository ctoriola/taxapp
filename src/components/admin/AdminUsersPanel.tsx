import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { adminCall, AdminUserRow } from '../../services/adminService';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function providerLabel(providers: string[]) {
  if (providers.includes('google.com')) return 'Google';
  if (providers.includes('password')) return 'Email';
  return providers.join(', ') || '—';
}

export default function AdminUsersPanel({ onAuthError, onOpenUser }: { onAuthError: (err: unknown) => void; onOpenUser: (uid: string) => void }) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await adminCall<{ users: AdminUserRow[]; truncated: boolean }>('users');
      setUsers(result.users);
      setTruncated(result.truncated);
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : 'Could not load users.');
    }
  }, [onAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users || []).filter((u) => !q || u.email?.toLowerCase().includes(q) || u.businessName?.toLowerCase().includes(q));
  }, [users, query]);

  const run = async (uid: string, action: () => Promise<string>) => {
    setBusyUid(uid);
    setError('');
    setNotice('');
    try {
      const message = await action();
      await load();
      setNotice(message);
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : 'That didn\'t work. Please try again.');
    } finally {
      setBusyUid(null);
    }
  };

  const toggleDisabled = (user: AdminUserRow) => {
    const verb = user.disabled ? 'enable' : 'disable';
    if (!window.confirm(`${verb[0].toUpperCase()}${verb.slice(1)} ${user.email}?${user.disabled ? '' : ' They will be signed out and unable to sign in.'}`)) return;
    run(user.uid, async () => {
      await adminCall('setDisabled', { uid: user.uid, disabled: !user.disabled });
      return `${user.email} ${user.disabled ? 'enabled' : 'disabled'}.`;
    });
  };

  const sendReset = (user: AdminUserRow) => {
    if (!window.confirm(`Send a password-reset email to ${user.email}?`)) return;
    run(user.uid, async () => {
      await adminCall('sendPasswordReset', { uid: user.uid });
      return `Password-reset email sent to ${user.email}.`;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-900">Users {users && <span className="text-base font-medium text-slate-500">({users.length})</span>}</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or business" aria-label="Search users" className="input-field pl-9 py-2" />
        </div>
      </div>
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {truncated && <p className="text-xs text-amber-700">Showing the first 2,000 users.</p>}

      <div className="card-bento p-0 overflow-hidden">
        {!users ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-500">No users{query ? ` matching "${query}"` : ' yet'}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Last sign-in</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Invoices</th>
                  <th className="px-4 py-3 text-right">Customers</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {filtered.map((u) => (
                  <tr key={u.uid}>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onOpenUser(u.uid)} className="text-left">
                        <span className="block font-medium text-slate-900 hover:underline">{u.email || '(no email)'}</span>
                        <span className="block text-xs text-slate-500">{u.businessName || 'No business profile'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(u.lastSignInAt)}</td>
                    <td className="px-4 py-3">{providerLabel(u.providers)}</td>
                    <td className="px-4 py-3 text-right">{u.counts.invoices}</td>
                    <td className="px-4 py-3 text-right">{u.counts.customers}</td>
                    <td className="px-4 py-3 text-right">{u.counts.expenses}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${u.disabled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-3">
                      <button type="button" onClick={() => onOpenUser(u.uid)} className="text-xs font-semibold text-emerald-700 hover:underline">View</button>
                      {u.providers.includes('password') && (
                        <button type="button" disabled={busyUid === u.uid} onClick={() => sendReset(u)} className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50">Reset password</button>
                      )}
                      <button type="button" disabled={busyUid === u.uid} onClick={() => toggleDisabled(u)} className={`text-xs font-semibold hover:underline disabled:opacity-50 ${u.disabled ? 'text-emerald-700' : 'text-red-600'}`}>
                        {u.disabled ? 'Enable' : 'Disable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
