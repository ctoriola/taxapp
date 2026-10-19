import React from 'react';
import { Link } from 'react-router-dom';
import { Coins, Target } from 'lucide-react';
import { MonthActivity, percentChange, periodLabel } from '../../lib/finance';
import { Panel, PanelTitle, compactNaira, formatChange, Money, withNaira } from './ui';

const MAX_ROWS = 4;

interface Props {
  activity: MonthActivity;
  money: Money;
  hidden: boolean;
}

// What the month brought in: invoices issued, split by customer, with how much has been paid
export default function EarningCard({ activity, money, hidden }: Props) {
  const { invoiced, invoicedPrevious, paidOnInvoiced } = activity;
  const change = percentChange(invoiced, invoicedPrevious);
  const paidShare = invoiced > 0 ? Math.min(paidOnInvoiced / invoiced, 1) : 0;
  const month = periodLabel(activity.key).split(' ')[0];

  // Top customers, the rest folded into "Others"
  const rows = activity.customers.length > MAX_ROWS
    ? [...activity.customers.slice(0, MAX_ROWS - 1), { name: 'Others', total: activity.customers.slice(MAX_ROWS - 1).reduce((t, c) => t + c.total, 0) }]
    : activity.customers;

  const target = (
    <div className="text-right" title={`${Math.round(paidShare * 100)}% of ${month}'s invoices paid`}>
      <p className="inline-flex items-center gap-1.5 text-base font-semibold text-brand-ink">
        <Target className="w-4 h-4" />
        {withNaira(hidden ? '₦ •••' : compactNaira(paidOnInvoiced))}
        <span className="sr-only">paid of {withNaira(money(invoiced))} invoiced</span>
      </p>
      <div className="mt-1 w-24 h-1.5 rounded-full bg-brand-orange/20 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-orange" style={{ width: `${paidShare * 100}%` }}></div>
      </div>
    </div>
  );

  return (
    <Panel className="flex flex-col">
      <PanelTitle icon={<Coins className="w-[18px] h-[18px]" />} title="Earning" action={target} />

      <p className="text-[34px] sm:text-[40px] font-medium tracking-tight leading-tight text-brand-ink break-all">{withNaira(money(invoiced))}</p>
      <p className="text-xs text-brand-muted mt-1">
        {change !== null && !hidden && <span className={`font-semibold ${change >= 0 ? 'text-brand-up' : 'text-brand-down'}`}>{formatChange(change)} </span>}
        {change !== null ? 'vs last month' : `Invoiced in ${month}`}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-brand-muted mt-6">
          No invoices issued in {month}. <Link to="/invoices/create" className="font-semibold text-brand-forest hover:underline">Create one</Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row, i) => {
            const share = invoiced > 0 ? row.total / invoiced : 0;
            const highlight = i === 0 && rows.length > 1;
            return (
              <li key={row.name + i}>
                <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
                  <span className={`truncate ${highlight ? 'text-brand-ink font-medium' : 'text-brand-muted'}`}>{row.name}</span>
                  <span className={`tabular-nums flex-shrink-0 ${highlight ? 'text-brand-ink' : 'text-brand-muted'}`}>{withNaira(money(row.total))}</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-brand-canvas">
                  <div className={`h-full rounded-full ${highlight ? 'bg-brand-lime' : 'bg-[#DADAD6]'}`} style={{ width: `${Math.max(share * 100, 2)}%` }}></div>
                  {highlight && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-full px-2.5 py-0.5 rounded-full bg-brand-forest text-brand-lime text-[11px] font-semibold"
                      style={{ left: `max(3.25rem, ${share * 100}%)` }}
                    >
                      {Math.round(share * 100)}%
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
