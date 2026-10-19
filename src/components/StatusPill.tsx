import React from 'react';

export type PillTone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';

const TONES: Record<PillTone, string> = {
  good: 'bg-brand-lime/60 text-brand-forest',
  warn: 'bg-brand-orange/10 text-brand-orange',
  bad: 'bg-brand-down/10 text-brand-down',
  neutral: 'bg-brand-canvas text-brand-muted',
  info: 'bg-sky-100 text-sky-800',
};

// Small rounded status label; pass an icon for meaning beyond colour
export default function StatusPill({ tone, icon, children }: { tone: PillTone; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
