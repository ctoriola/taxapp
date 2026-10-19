import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useInvoices, useExpenses, useVatReturns } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import DataErrorBanner from '../components/DataErrorBanner';
import SmartInsights from '../components/SmartInsights';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import BalanceCard from '../components/dashboard/BalanceCard';
import VatReturnCard from '../components/dashboard/VatReturnCard';
import SpendingCard from '../components/dashboard/SpendingCard';
import EarningCard from '../components/dashboard/EarningCard';
import TransactionsCard, { ActivityItem } from '../components/dashboard/TransactionsCard';
import { makeMoney } from '../components/dashboard/ui';
import { balanceDue, buildInsights, daysBetween, monthActivity, periodKey, periodLabel, summarize, upcomingVatReturn } from '../lib/finance';
import { buildAiFacts } from '../lib/aiFacts';

const HIDE_KEY = 'vatclear:hideAmounts';

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
}

function relativeDay(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const { customers } = useCustomers();
  const { invoices, error: invoicesError } = useInvoices();
  const { expenses, error: expensesError } = useExpenses();
  const { vatReturns } = useVatReturns();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [hidden, setHidden] = useState(readHidden);
  const toggleHidden = () => {
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1');
      } catch {
        // Storage blocked: the choice just won't be remembered
      }
      return !h;
    });
  };
  const money = useMemo(() => makeMoney(hidden), [hidden]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const today = new Date();
  const summary = useMemo(() => summarize(invoices, expenses, new Date()), [invoices, expenses]);
  const filedPeriods = useMemo(() => new Set(vatReturns.map((r) => r.period)), [vatReturns]);
  const insights = useMemo(
    () => buildInsights(invoices, expenses, customers, new Date(), { filedPeriods, businessTin: profile?.tax_id }),
    [invoices, expenses, customers, filedPeriods, profile?.tax_id]
  );
  const aiFacts = useMemo(
    () => buildAiFacts(invoices, expenses, customers, vatReturns, profile, new Date()),
    [invoices, expenses, customers, vatReturns, profile]
  );
  const vatReturn = upcomingVatReturn(summary, today, filedPeriods);

  // Months to browse: the last 12, newest first
  const monthOptions = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const key = periodKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
      return { key, label: periodLabel(key) };
    });
  }, []);
  const [month, setMonth] = useState(monthOptions[0].key);
  const activity = useMemo(() => monthActivity(invoices, expenses, customers, month), [invoices, expenses, customers, month]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name || 'Customer';
  const recentActivity: ActivityItem[] = [
    ...invoices.map((inv): ActivityItem & { at: number } => {
      const outstanding = balanceDue(inv);
      const paid = inv.status !== 'draft' && outstanding === 0;
      const name = customerName(inv.customer_id);
      return {
        key: `invoice-${inv.id}`,
        to: `/invoices/${inv.id}`,
        title: `${name} · ${inv.invoice_number}`,
        subtitle: `${relativeDay(inv.created_at)} · ${inv.status === 'draft' ? 'Draft' : paid ? 'Paid' : inv.amount_paid > 0 ? 'Part paid' : 'Awaiting payment'}`,
        amount: paid ? inv.amount_paid : inv.total_amount,
        kind: inv.status === 'draft' ? 'draft' : paid ? 'income' : 'pending',
        initial: name.charAt(0).toUpperCase(),
        at: new Date(inv.created_at).getTime(),
      };
    }),
    ...expenses
      .filter((exp) => exp.status !== 'rejected')
      .map((exp): ActivityItem & { at: number } => ({
        key: `expense-${exp.id}`,
        to: `/expenses/${exp.id}`,
        title: exp.description || 'Expense',
        subtitle: `${relativeDay(exp.created_at)} · ${exp.status.charAt(0).toUpperCase()}${exp.status.slice(1)} expense`,
        amount: exp.total_amount || 0,
        kind: 'expense',
        initial: (exp.description || 'E').charAt(0).toUpperCase(),
        at: new Date(exp.created_at).getTime(),
      })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const firstName = (profile?.full_name || '').trim().split(/\s+/)[0] || profile?.business_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-brand-canvas">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        <DashboardHeader name={firstName} logoUrl={profile?.logo_url} insights={insights} onLogout={handleLogout} />

        <DataErrorBanner errors={[invoicesError, expensesError]} />

        <main className="space-y-4 sm:space-y-5">
          <h1 className="sr-only">Dashboard</h1>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            <div className="lg:col-span-7 grid min-w-0">
              <BalanceCard summary={summary} money={money} hidden={hidden} onToggleHidden={toggleHidden} tin={profile?.tax_id} />
            </div>
            <div className="lg:col-span-5 grid min-w-0">
              <VatReturnCard vatReturn={vatReturn} daysLeft={daysBetween(today, vatReturn.dueDate)} money={money} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            <SpendingCard activity={activity} monthOptions={monthOptions} onMonthChange={setMonth} money={money} hidden={hidden} />
            <EarningCard activity={activity} money={money} hidden={hidden} />
            <div className="md:col-span-2 xl:col-span-1 grid min-w-0">
              <TransactionsCard activity={recentActivity} pendingExpenses={summary.pendingExpenses} money={money} />
            </div>
          </div>

          <SmartInsights insights={insights} aiFacts={aiFacts} />
        </main>
      </div>
    </div>
  );
}
