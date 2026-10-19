import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkle, MoreHorizontal, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { VatPeriod } from '../../lib/finance';
import { Money, withNaira } from './ui';

interface Props {
  vatReturn: VatPeriod;
  daysLeft: number;
  money: Money;
}

// The highlighted lime card: the VAT return the business should be preparing now
export default function VatReturnCard({ vatReturn, daysLeft, money }: Props) {
  const due = vatReturn.dueDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  const when = daysLeft < 0 ? `${-daysLeft} day${daysLeft === -1 ? '' : 's'} late` : daysLeft === 0 ? 'due today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const isCredit = vatReturn.netVat < 0;

  return (
    <section className="min-w-0 relative overflow-hidden bg-brand-lime rounded-[28px] p-5 sm:p-6 flex flex-col text-brand-ink">
      {/* Decorative four-point star, as in the reference */}
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute -top-2 right-2 w-40 sm:w-48 text-white/25 pointer-events-none">
        <path fill="currentColor" d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0 Z" />
      </svg>

      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-3 h-11 pl-5 pr-1.5 rounded-full bg-brand-forest text-brand-lime text-sm font-semibold uppercase tracking-wider">
          Next return
          <span className="w-8 h-8 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center">
            <Sparkle className="w-4 h-4" fill="currentColor" />
          </span>
        </span>
        <Link to="/reports" aria-label="Open VAT reports" className="w-11 h-11 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </Link>
      </div>

      <div className="relative mt-8">
        <p className="text-sm text-brand-ink/75">{isCredit ? 'VAT credit' : 'VAT to pay'} · {vatReturn.label}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <p className="text-[40px] sm:text-5xl font-medium tracking-tight leading-tight">{withNaira(money(Math.abs(vatReturn.netVat)))}</p>
          <span className={`px-3 py-1 rounded-full bg-white text-xs font-semibold ${daysLeft < 0 ? 'text-brand-down' : 'text-brand-up'}`}>
            Due {due} · {when}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 mt-6 sm:mt-auto sm:pt-6">
        {[
          { label: 'VAT charged', value: vatReturn.outputVat, icon: <ArrowUpRight className="w-4 h-4" />, sub: `${vatReturn.invoiceCount} invoice${vatReturn.invoiceCount === 1 ? '' : 's'}` },
          { label: 'VAT on expenses', value: vatReturn.inputVat, icon: <ArrowDownLeft className="w-4 h-4" />, sub: `${vatReturn.expenseCount} expense${vatReturn.expenseCount === 1 ? '' : 's'}` },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl bg-white/35 p-4">
            <div className="flex items-center justify-between text-xs text-brand-ink/75">
              <span>{tile.label}</span>
              {tile.icon}
            </div>
            <p className="text-lg sm:text-xl font-semibold mt-2 truncate">{withNaira(money(tile.value))}</p>
            <p className="text-xs text-brand-ink/65 mt-0.5">{tile.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
