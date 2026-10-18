import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Insight, InsightSeverity } from '../lib/finance';
import type { AiFacts } from '../lib/aiFacts';
import AiAssistant from './AiAssistant';

const STYLES: Record<InsightSeverity, { box: string; title: string; text: string; icon: React.ReactNode }> = {
  urgent: { box: 'border-l-red-500 bg-red-50', title: 'text-red-900', text: 'text-red-800', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
  warning: { box: 'border-l-amber-500 bg-amber-50', title: 'text-amber-900', text: 'text-amber-800', icon: <AlertCircle className="w-4 h-4 text-amber-600" /> },
  info: { box: 'border-l-blue-500 bg-blue-50', title: 'text-blue-900', text: 'text-blue-800', icon: <Info className="w-4 h-4 text-blue-600" /> },
  success: { box: 'border-l-emerald-500 bg-emerald-50', title: 'text-emerald-900', text: 'text-emerald-800', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
};

const INITIALLY_SHOWN = 4;

export default function SmartInsights({ insights, aiFacts }: { insights: Insight[]; aiFacts: AiFacts }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? insights : insights.slice(0, INITIALLY_SHOWN);

  return (
    <div className="lg:col-span-2 card-bento p-6 sm:p-8">
      <h3 className="text-lg font-bold text-slate-900 mb-6">Smart Insights</h3>
      <div className="space-y-4">
        {visible.map((insight) => {
          const style = STYLES[insight.severity];
          return (
            <div key={insight.id} className={`p-4 rounded-2xl border-l-4 ${style.box}`}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">{style.icon}</span>
                <div className="min-w-0 flex-1">
                  <h4 className={`font-semibold text-sm mb-1 ${style.title}`}>{insight.title}</h4>
                  <p className={`text-xs leading-relaxed ${style.text}`}>{insight.description}</p>
                  {insight.action && (
                    <Link to={insight.action.to} className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${style.title} hover:underline`}>
                      {insight.action.label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {insights.length > INITIALLY_SHOWN && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-4 text-sm font-semibold text-emerald-700 hover:underline">
          {showAll ? 'Show fewer' : `Show all ${insights.length} insights`}
        </button>
      )}
      <p className="mt-6 text-xs text-slate-500">
        Calculated from your invoices and expenses. These are estimates, not tax advice; confirm figures with a tax professional before filing.
      </p>
      <AiAssistant facts={aiFacts} />
    </div>
  );
}
