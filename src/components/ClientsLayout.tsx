import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { roundButton } from './dashboard/ui';

// Frame for the accountant's client pages: logo, a link back to their own business (if they
// have one), and sign out
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-brand-canvas">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/clients" aria-label="Your clients"><Logo /></Link>
            <span className="hidden sm:inline px-3 py-1 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold uppercase tracking-wider">Accountant view</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-sm text-brand-muted mr-2">{user?.email}</span>
            {profile && (
              <Link to="/dashboard" className="btn-secondary h-11">
                <LayoutDashboard className="w-4 h-4" />
                My business
              </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              aria-label="Sign out"
              title="Sign out"
              className={`${roundButton} bg-white text-brand-ink hover:bg-stone-50`}
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
