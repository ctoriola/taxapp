import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { Insight, InsightSeverity } from '../lib/finance';
import type { AiFacts } from '../lib/aiFacts';
import AiAssistant from './AiAssistant';
import { Panel, PanelTitle, withNaira } from './dashboard/ui';

const SEVERITY: Record<InsightSeverity, { dot: string; label: string }> = {
  urgent: { dot: 'bg-brand-down', label: 'Urgent' },
  warning: { dot: 'bg-brand-orange', label: 'Heads up' },
  info: { dot: 'bg-sky-500', label: 'Tip' },
  success: { dot: 'bg-brand-up', label: 'Good' },
};

const INITIALLY_SHOWN = 4;

export default function SmartInsights({ insights, aiFacts }: { insights: Insight[]; aiFacts: AiFacts }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? insights : insights.slice(0, INITIALLY_SHOWN);
  const needAction = insights.filter((i) => i.severity === 'urgent' || i.severity === 'warning').length;

  return (
    <Panel>
      <PanelTitle
        icon={<Sparkles className="w-[18px] h-[18px]" />}
        title="Smart Insights"
        action={
          needAction > 0 ? (
            <span className="px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-semibold">{needAction} need{needAction === 1 ? 's' : ''} attention</span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-brand-lime/50 text-brand-forest text-xs font-semibold">All clear</span>
          )
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
        <div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((insight) => {
              const style = SEVERITY[insight.severity];
              return (
                <li key={insight.id} className="p-4 rounded-2xl bg-brand-canvas">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} aria-hidden="true"></span>
                    {style.label}
                  </p>
                  <h3 className="font-semibold text-sm text-brand-ink mt-2">{withNaira(insight.title)}</h3>
                  <p className="text-xs leading-relaxed text-brand-ink/70 mt-1">{withNaira(insight.description)}</p>
                  {insight.action && (
                    <Link to={insight.action.to} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-forest hover:underline">
                      {insight.action.label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          {insights.length > INITIALLY_SHOWN && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 text-sm font-semibold text-brand-forest hover:underline">
              {showAll ? 'Show fewer' : `Show all ${insights.length} insights`}
            </button>
          )}
          <p className="mt-4 text-xs text-brand-muted">
            Calculated from your invoices and expenses. These are estimates, not tax advice; confirm figures with a tax professional before filing.
          </p>
        </div>
        <AiAssistant facts={aiFacts} />
      </div>
    </Panel>
  );
}
