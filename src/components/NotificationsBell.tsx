import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { Insight } from '../lib/finance';

// Shows the insights that need action (urgent or warning). The dot only appears when there are some.
export default function NotificationsBell({ insights }: { insights: Insight[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const alerts = insights.filter((i) => i.severity === 'urgent' || i.severity === 'warning');
  const hasUrgent = alerts.some((i) => i.severity === 'urgent');

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 hover:bg-stone-100 rounded-xl transition-all duration-200 relative"
        aria-label={alerts.length ? `Notifications (${alerts.length})` : 'Notifications'}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {alerts.length > 0 && (
          <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${hasUrgent ? 'bg-red-600' : 'bg-amber-500'}`}></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-50">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Needs your attention</h3>
          </div>
          {alerts.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-200">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    to={alert.action?.to || '/dashboard'}
                    onClick={() => setIsOpen(false)}
                    className="flex gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === 'urgent' ? 'bg-red-600' : 'bg-amber-500'}`}></span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{alert.title}</span>
                      <span className="block text-xs text-slate-500 mt-1">{alert.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
