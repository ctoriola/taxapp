import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkle, Package, Plug, Plane, Utensils, Monitor, Briefcase, CircleDollarSign } from 'lucide-react';
import type { Expense } from '../../services/expenseService';
import { MonthActivity, percentChange } from '../../lib/finance';
import { Panel, PanelTitle, compactNaira, formatChange, Money, withNaira } from './ui';

const CATEGORY_ICONS: Record<Expense['category'], React.ReactNode> = {
  office_supplies: <Package className="w-4 h-4" />,
  utilities: <Plug className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
  meals: <Utensils className="w-4 h-4" />,
  equipment: <Monitor className="w-4 h-4" />,
  services: <Briefcase className="w-4 h-4" />,
  other: <CircleDollarSign className="w-4 h-4" />,
};

// Ring geometry: lengths are in percent of the circumference (pathLength = 100)
const RADIUS = 70;
const STROKE = 14;
const GAP = 6; // includes room for the rounded caps

function Ring({ shares }: { shares: { label: string; share: number }[] }) {
  if (shares.length === 0) {
    return <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#E6E6E3" strokeWidth={STROKE} />;
  }
  const gap = shares.length > 1 ? GAP : 0;
  let offset = 0;
  return (
    <>
      {shares.map((s, i) => {
        const length = Math.max(s.share * 100 - gap, 0.01);
        const start = offset;
        offset += s.share * 100;
        return (
          <circle
            key={s.label}
            cx="90"
            cy="90"
            r={RADIUS}
            fill="none"
            pathLength={100}
            stroke={i === 0 ? '#B8EC82' : '#E2E2DF'}
            strokeWidth={STROKE}
            strokeLinecap={shares.length > 1 ? 'round' : 'butt'}
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={-(start + gap / 2)}
          >
            <title>{`${s.label}: ${Math.round(s.share * 100)}%`}</title>
          </circle>
        );
      })}
    </>
  );
}

interface Props {
  activity: MonthActivity;
  monthOptions: { key: string; label: string }[];
  onMonthChange: (key: string) => void;
  money: Money;
  hidden: boolean;
}

// Where the money went this month: a ring by category, the largest highlighted
export default function SpendingCard({ activity, monthOptions, onMonthChange, money, hidden }: Props) {
  const { categories, spent, spentPrevious } = activity;
  const change = percentChange(spent, spentPrevious);
  const shares = categories.map((c) => ({ label: c.label, share: spent > 0 ? c.total / spent : 0 }));

  // The most notable movement, for the chip under the ring
  const moves = categories
    .map((c) => ({ label: c.label, pct: percentChange(c.total, c.previous) }))
    .filter((m): m is { label: string; pct: number } => m.pct !== null && Math.abs(m.pct) >= 1)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const top = categories[0];
  const chip = moves[0]
    ? { text: `${moves[0].label} spending is ${moves[0].pct > 0 ? 'up' : 'down'}`, value: `${Math.abs(moves[0].pct).toFixed(1)}%`, up: moves[0].pct > 0 }
    : top
    ? { text: `${top.label} is your biggest cost`, value: `${Math.round((top.total / spent) * 100)}%`, up: false }
    : null;

  const monthSelect = (
    <label className="relative">
      <span className="sr-only">Month</span>
      <select
        value={activity.key}
        onChange={(e) => onMonthChange(e.target.value)}
        className="appearance-none h-10 pl-4 pr-4 rounded-full border border-brand-line bg-white text-sm font-medium text-brand-ink cursor-pointer hover:bg-brand-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest"
      >
        {monthOptions.map((m) => (
          <option key={m.key} value={m.key}>{m.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Panel className="flex flex-col">
      <PanelTitle icon={<ShoppingBag className="w-[18px] h-[18px]" />} title="Spending" action={monthSelect} />

      <div className="relative mx-auto w-[180px] h-[180px]">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90" role="img" aria-label={`Spending by category: ${shares.map((s) => `${s.label} ${Math.round(s.share * 100)}%`).join(', ') || 'none'}`}>
          <Ring shares={shares} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-semibold text-brand-ink">{withNaira(hidden ? '₦ •••' : compactNaira(spent))}</p>
          {change !== null && !hidden ? (
            <p className={`text-xs font-semibold mt-0.5 ${change > 0 ? 'text-brand-down' : 'text-brand-up'}`}>{formatChange(change)}</p>
          ) : (
            <p className="text-xs text-brand-muted mt-0.5">{spent > 0 ? 'this month' : 'No spending'}</p>
          )}
        </div>
      </div>

      {chip && (
        <p className="mx-auto mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-line text-xs text-brand-ink">
          <Sparkle className="w-3.5 h-3.5" />
          {chip.text} <span className={`font-semibold ${chip.up ? 'text-brand-down' : 'text-brand-ink'}`}>{chip.value}</span>
        </p>
      )}

      {categories.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-5 text-sm">
          {categories.slice(0, 4).map((c, i) => (
            <li key={c.category} className={`flex items-center gap-2 min-w-0 ${i === 0 ? 'text-brand-ink' : 'text-brand-muted'}`}>
              <span className="flex-shrink-0">{CATEGORY_ICONS[c.category]}</span>
              <span className="truncate">{c.label}</span>
              <span className={`ml-auto flex-shrink-0 tabular-nums ${i === 0 ? 'font-semibold' : ''}`}>{hidden ? '•••' : withNaira(compactNaira(c.total))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-brand-muted text-center mt-5">
          Nothing recorded for this month. <Link to="/expenses/create" className="font-semibold text-brand-forest hover:underline">Record an expense</Link>
        </p>
      )}
      <p className="sr-only">Total spent: {withNaira(money(spent))}</p>
    </Panel>
  );
}
