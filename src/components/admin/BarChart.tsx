import React, { useState } from 'react';

interface Bar {
  label: string; // axis label
  detail: string; // tooltip label, e.g. full date
  value: number;
  secondary?: string; // extra tooltip line
}

// Single-series bar chart: one brand hue, thin bars with rounded tops anchored to the baseline,
// hover/focus tooltip with exact values, and a visually hidden table for screen readers.
export default function BarChart({ title, bars, unit }: { title: string; bars: Bar[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((t, b) => t + b.value, 0);

  return (
    <figure className="card-bento p-6">
      <figcaption className="flex items-baseline justify-between gap-2 mb-4">
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <span className="text-xs text-slate-500">{total.toLocaleString()} {unit} total</span>
      </figcaption>
      <div className="relative h-40 flex items-end gap-[2px]" role="presentation" onMouseLeave={() => setActive(null)}>
        {bars.map((bar, i) => (
          <div
            key={bar.label + i}
            className="relative flex-1 h-full flex items-end cursor-default outline-none"
            tabIndex={0}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`${bar.detail}: ${bar.value} ${unit}`}
          >
            <div
              className={`w-full rounded-t ${active === i ? 'bg-emerald-800' : 'bg-emerald-600'}`}
              style={{ height: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 2 : 0)}%` }}
            />
            {active === i && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg pointer-events-none">
                <div className="font-semibold">{bar.value.toLocaleString()} {unit}</div>
                <div className="text-slate-300">{bar.detail}</div>
                {bar.secondary && <div className="text-slate-300">{bar.secondary}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] mt-2 border-t border-slate-200 pt-1">
        {bars.map((bar, i) => (
          <span key={bar.label + i} className="flex-1 min-w-0 text-center text-[10px] text-slate-500 whitespace-nowrap">
            {i % Math.ceil(bars.length / 7) === 0 ? bar.label : ''}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((bar, i) => (
            <tr key={bar.label + i}><th>{bar.detail}</th><td>{bar.value}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
