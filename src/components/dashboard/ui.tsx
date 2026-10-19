import React from 'react';

// Building blocks for the dashboard's card style: white panels with generous rounding,
// titles led by an outlined icon circle, and round icon buttons.

export function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`min-w-0 bg-white rounded-[28px] p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function IconCircle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-brand-line text-brand-ink flex-shrink-0 ${className}`}>
      {children}
    </span>
  );
}

export function PanelTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <IconCircle>{icon}</IconCircle>
        <h2 className="text-lg font-semibold text-brand-ink truncate">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export const roundButton =
  'inline-flex items-center justify-center w-11 h-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:ring-offset-2';

// Formats naira amounts, or masks them when the user has hidden amounts
export type Money = (amount: number, decimals?: number) => string;

export function makeMoney(hidden: boolean): Money {
  return (amount, decimals = 2) => {
    if (hidden) return '₦ ••••••';
    const formatted = Math.abs(amount).toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${amount < 0 ? '-' : ''}₦${formatted}`;
  };
}

// Short form for tight spaces: ₦950, ₦12.4K, ₦3.1M
export function compactNaira(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${sign}₦${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}₦${abs.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function formatChange(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}

// Renders text with every ₦ drawn in the page font (see .naira in index.css)
export function withNaira(text: string): React.ReactNode {
  if (!text.includes('₦')) return text;
  return (
    <span>
      {text.split('₦').map((part, i) =>
        i === 0 ? (
          part
        ) : (
          <React.Fragment key={i}>
            <span className="naira"><span className="naira-text">₦</span></span>
            {part}
          </React.Fragment>
        )
      )}
    </span>
  );
}
