import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import GlobalSearch from '../GlobalSearch';
import NotificationsBell from '../NotificationsBell';
import type { Insight } from '../../lib/finance';
import { roundButton } from './ui';

const TABS = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'Invoices', to: '/invoices' },
  { label: 'Expenses', to: '/expenses' },
  { label: 'Reports', to: '/reports' },
  { label: 'Customers', to: '/customers' },
];

interface Props {
  name: string;
  logoUrl?: string | null;
  insights: Insight[];
  onLogout: () => void;
}

export default function DashboardHeader({ name, logoUrl, insights, onLogout }: Props) {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const close = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setSearchOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [searchOpen]);

  return (
    <header className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-6 gap-y-4">
      <Link to="/settings" className="flex items-center gap-3 min-w-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest" title="Business profile">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-11 h-11 rounded-full object-cover bg-white flex-shrink-0" />
        ) : (
          <span className="w-11 h-11 rounded-full bg-brand-lime text-brand-forest font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-2xl sm:text-[28px] font-medium tracking-tight text-brand-ink truncate">Hello, {name}</span>
      </Link>

      <nav aria-label="Main" className="order-last lg:order-none w-full lg:w-auto overflow-x-auto">
        <ul className="flex items-center gap-1 min-w-max">
          {TABS.map((tab) => {
            const active = pathname === tab.to;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-5 py-2.5 rounded-full text-sm transition-colors ${
                    active ? 'bg-brand-lime text-brand-ink font-semibold' : 'text-brand-muted font-medium hover:text-brand-ink hover:bg-white'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <div ref={searchRef} className="relative">
          <button type="button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search" aria-expanded={searchOpen} className={`${roundButton} bg-white text-brand-ink hover:bg-stone-50`}>
            <Search className="w-[18px] h-[18px]" />
          </button>
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-lg border border-brand-line p-3 z-50">
              <GlobalSearch autoFocus />
            </div>
          )}
        </div>
        <NotificationsBell insights={insights} />
        <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className={`${roundButton} bg-white text-brand-ink hover:bg-stone-50`}>
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
