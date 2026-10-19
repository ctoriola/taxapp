import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Copy, Check, Eye, EyeOff, Plus, Upload, MoreHorizontal } from 'lucide-react';
import type { FinanceSummary } from '../../lib/finance';
import { Money, roundButton, withNaira } from './ui';

type View = 'received' | 'outstanding' | 'profit';

interface Props {
  summary: FinanceSummary;
  money: Money;
  hidden: boolean;
  onToggleHidden: () => void;
  tin?: string | null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The headline card: one big figure, switchable between money in, money owed and profit
export default function BalanceCard({ summary, money, hidden, onToggleHidden, tin }: Props) {
  const [view, setView] = useState<View>('received');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const views: Record<View, { tab: string; label: string; value: number; note: string }> = {
    received: {
      tab: 'Received',
      label: 'Payments received',
      value: summary.collected,
      note: `${summary.paidCount} of ${plural(summary.issuedCount, 'invoice')} fully paid, including VAT`,
    },
    outstanding: {
      tab: 'Owed',
      label: 'Owed to you',
      value: summary.outstanding,
      note: summary.overdueInvoices.length
        ? `${plural(summary.awaitingPaymentCount, 'invoice')} unpaid · ${money(summary.overdueAmount)} overdue`
        : `${plural(summary.awaitingPaymentCount, 'invoice')} awaiting payment`,
    },
    profit: {
      tab: 'Profit',
      label: 'Net profit',
      value: summary.profit,
      note: 'Payments received minus approved expenses, both excluding VAT',
    },
  };
  const current = views[view];

  const copyTin = async () => {
    if (!tin) return;
    try {
      await navigator.clipboard.writeText(tin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the TIN is still visible to copy by hand
    }
  };

  return (
    <section className="min-w-0 bg-white rounded-[28px] p-5 sm:p-6 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div role="tablist" aria-label="Headline figure" className="inline-flex p-1 rounded-full bg-brand-canvas">
          {(Object.keys(views) as View[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${view === key ? 'bg-white text-brand-ink font-semibold shadow-sm' : 'text-brand-muted font-medium hover:text-brand-ink'}`}
            >
              {views[key].tab}
            </button>
          ))}
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-brand-muted">Tax ID (TIN)</p>
          {tin ? (
            <p className="flex items-center sm:justify-end gap-1.5 text-lg font-semibold text-brand-ink tracking-wide">
              {tin}
              <button type="button" onClick={copyTin} aria-label={copied ? 'TIN copied' : 'Copy TIN'} className="p-1 rounded-md text-brand-ink hover:bg-stone-100">
                {copied ? <Check className="w-4 h-4 text-brand-up" /> : <Copy className="w-4 h-4" />}
              </button>
            </p>
          ) : (
            <Link to="/settings" className="text-sm font-semibold text-brand-forest hover:underline">Add your TIN</Link>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <p className="text-sm text-brand-muted">{current.label}</p>
        <div className="flex items-center gap-3 mt-1">
          <p className={`text-[40px] sm:text-6xl font-medium tracking-tight leading-tight break-all ${current.value < 0 ? 'text-brand-down' : 'text-brand-ink'}`} aria-live="polite">
            {withNaira(money(current.value))}
          </p>
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
            aria-pressed={hidden}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-brand-canvas text-brand-ink flex items-center justify-center hover:bg-stone-200 transition-colors"
          >
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-brand-muted mt-2">{withNaira(current.note)}</p>
      </div>

      <div className="flex items-end justify-between gap-4 mt-8 sm:mt-auto sm:pt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/invoices/create" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand-forest text-brand-lime text-sm font-semibold hover:bg-brand-forest-hover transition-colors">
            <Plus className="w-4 h-4" />
            Create invoice
          </Link>
          <Link to="/expenses/create" className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-brand-forest text-brand-forest text-sm font-semibold hover:bg-brand-canvas transition-colors">
            <Upload className="w-4 h-4" />
            Record expense
          </Link>
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions" aria-expanded={menuOpen} className={`${roundButton} text-brand-ink hover:bg-brand-canvas`}>
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-lg border border-brand-line py-2 z-20">
                {[
                  { to: '/customers/add', label: 'Add a customer' },
                  { to: '/reports', label: 'VAT reports' },
                  { to: '/settings', label: 'Business settings' },
                ].map((item) => (
                  <Link key={item.to} to={item.to} className="block px-4 py-2 text-sm text-brand-ink hover:bg-brand-canvas">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link
          to="/invoices"
          aria-label="View all invoices"
          title="View all invoices"
          className="hidden sm:inline-flex w-16 h-16 rounded-full bg-brand-lime text-brand-ink items-center justify-center flex-shrink-0 hover:scale-105 transition-transform"
        >
          <ArrowUpRight className="w-7 h-7" strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}
