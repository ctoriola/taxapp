import React, { Suspense, useMemo } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Repeat, X } from 'lucide-react';
import { useRecurringGenerator } from '../hooks/useRecurringGenerator';
import { useAuth } from '../context/AuthContext';
import { useCustomers, useExpenses, useInvoices, useVatReturns } from '../context/DataContext';
import { buildInsights } from '../lib/finance';
import AppHeader from './dashboard/AppHeader';

function ContentLoading() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <div className="w-10 h-10 border-4 border-brand-line border-t-brand-forest rounded-full animate-spin"></div>
    </div>
  );
}

// Layout for every signed-in page: the grey canvas, the header with tabs, then the page.
// The header stays on screen while a page's code loads.
export default function AppShell() {
  const { user, profile, signOut } = useAuth();
  const { customers } = useCustomers();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const { vatReturns, isLoading: vatReturnsLoading } = useVatReturns();
  const navigate = useNavigate();
  const recurring = useRecurringGenerator();

  const insights = useMemo(
    () =>
      buildInsights(invoices, expenses, customers, new Date(), {
        filedPeriods: new Set(vatReturns.map((r) => r.period)),
        filedPeriodsLoading: vatReturnsLoading,
        businessTin: profile?.tax_id,
      }),
    [invoices, expenses, customers, vatReturns, vatReturnsLoading, profile?.tax_id]
  );

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || profile?.business_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-brand-canvas">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        <AppHeader name={firstName} logoUrl={profile?.logo_url} insights={insights} onLogout={handleLogout} />
        {recurring.generated > 0 && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-[28px] bg-brand-lime/40 px-5 py-3">
            <Repeat className="w-4 h-4 text-brand-forest" />
            <p className="text-sm text-brand-ink flex-1">
              {recurring.generated} recurring invoice{recurring.generated === 1 ? ' is' : 's are'} ready as draft{recurring.generated === 1 ? '' : 's'}. Check and send when you're ready.
            </p>
            <Link to="/invoices" onClick={recurring.dismiss} className="text-sm font-semibold text-brand-forest hover:underline">Review drafts</Link>
            <button type="button" onClick={recurring.dismiss} aria-label="Dismiss" className="text-brand-forest/70 hover:text-brand-forest">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <Suspense fallback={<ContentLoading />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
