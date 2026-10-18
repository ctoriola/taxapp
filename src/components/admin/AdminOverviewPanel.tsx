import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminCall, AdminOverview } from '../../services/adminService';
import BarChart from './BarChart';

const LIVE_REFRESH_MS = 30_000;

function shortDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function longDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function Tile({ label, value, sub, highlight }: { label: string; value: React.ReactNode; sub?: string; highlight?: boolean }) {
  return (
    <div className={`card-bento p-5 ${highlight ? 'bg-gradient-to-br from-emerald-50 to-white' : ''}`}>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPanel({ onAuthError }: { onAuthError: (err: unknown) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await adminCall<AdminOverview>('overview'));
      setError('');
    } catch (err) {
      onAuthError(err);
      setError(err instanceof Error ? err.message : 'Could not load stats.');
    } finally {
      setIsLoading(false);
    }
  }, [onAuthError]);

  // Keep "live now" current while the overview is open
  useEffect(() => {
    load();
    const timer = window.setInterval(load, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!data) {
    return error ? <p role="alert" className="text-sm text-red-600">{error}</p> : <p className="text-slate-500">Loading…</p>;
  }

  const today = data.visitsByDay[data.visitsByDay.length - 1];
  const thisWeek = data.visitsByWeek[data.visitsByWeek.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-emerald-900">Overview</h1>
        <button type="button" onClick={load} disabled={isLoading} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Updated {new Date(data.generatedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          highlight
          label="Live now"
          value={<span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>{data.live.total}</span>}
          sub={`${data.live.signedIn} signed in · ${data.live.visitors} visitors`}
        />
        <Tile label="Visits today" value={today?.visits ?? 0} sub={`${today?.uniqueVisitors ?? 0} unique visitors`} />
        <Tile label="Visits this week" value={thisWeek?.visits ?? 0} sub={`${thisWeek?.uniqueVisitors ?? 0} unique visitors`} />
        <Tile label="Users" value={data.users.total} sub={`${data.users.active7} active in 7 days · ${data.users.disabled} disabled`} />
        <Tile label="Active (30 days)" value={data.users.active30} />
        <Tile label="Invoices" value={data.records.invoices} />
        <Tile label="Customers" value={data.records.customers} />
        <Tile label="Expenses" value={data.records.expenses} sub={`${data.records.filedReturns} VAT returns marked filed`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BarChart
          title="Visits per day (last 14 days)"
          unit="visits"
          bars={data.visitsByDay.map((d) => ({ label: shortDay(d.day), detail: longDay(d.day), value: d.visits, secondary: `${d.uniqueVisitors} unique` }))}
        />
        <BarChart
          title="Visits per week (last 8 weeks)"
          unit="visits"
          bars={data.visitsByWeek.map((w) => ({ label: shortDay(w.week), detail: `Week of ${longDay(w.week)}`, value: w.visits, secondary: `${w.uniqueVisitors} unique` }))}
        />
        <BarChart
          title="Sign-ups per week (last 8 weeks)"
          unit="sign-ups"
          bars={data.signupsByWeek.map((w) => ({ label: shortDay(w.week), detail: `Week of ${longDay(w.week)}`, value: w.signups }))}
        />
      </div>
      <p className="text-xs text-slate-500">
        Days and weeks are in Lagos time; weeks start on Monday. A visit is one browser session per day; "live" means a page was open in the last 2 minutes.
      </p>
    </div>
  );
}
