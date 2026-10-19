import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkle, Check, CalendarClock, Eye } from 'lucide-react';
import Logo from './Logo';
import { withNaira } from './dashboard/ui';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const POINTS = ['VAT worked out on every invoice and expense', 'Know what you owe before the 21st', 'Smart insights and an AI assistant'];

// Sign-in screens: the form on the left, a lime brand panel with a product preview on the right
export default function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-screen bg-brand-canvas text-brand-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col min-h-screen px-4 sm:px-8 lg:px-14 py-6 sm:py-8">
        <Link to="/" aria-label="VATClear home" className="self-start rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest">
          <Logo />
        </Link>

        <main className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-tight">{title}</h1>
            {subtitle && <p className="text-brand-muted mt-2">{subtitle}</p>}
            <div className="auth-form mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-brand-muted">{footer}</div>}
          </div>
        </main>

        <p className="flex items-center justify-center gap-2 text-xs text-brand-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-lime-deep" aria-hidden="true"></span>
          Secure sign-in. Your data is encrypted and private to your business.
        </p>
      </div>

      {/* Brand panel (desktop) */}
      <aside className="hidden lg:block p-4" aria-hidden="true">
        <div className="relative h-full min-h-[640px] overflow-hidden rounded-[36px] bg-brand-lime p-12 flex flex-col">
          <svg viewBox="0 0 100 100" className="absolute -top-10 -right-10 w-80 text-white/25">
            <path fill="currentColor" d="M50 0 C55 35 65 45 100 50 C65 55 55 65 50 100 C45 65 35 55 0 50 C35 45 45 35 50 0 Z" />
          </svg>
          <p className="absolute inset-x-0 -bottom-[0.2em] text-center font-bold tracking-tighter leading-none text-white/20 text-[11vw] select-none">VATClear</p>

          <div className="relative">
            <span className="inline-flex items-center gap-3 h-10 pl-4 pr-1.5 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold uppercase tracking-wider">
              Built for Nigerian SMEs
              <span className="w-7 h-7 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center">
                <Sparkle className="w-3.5 h-3.5" fill="currentColor" />
              </span>
            </span>
            <h2 className="mt-8 text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05] max-w-md">See your VAT before the taxman does</h2>
            <ul className="mt-6 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-brand-ink/80">
                  <span className="w-6 h-6 rounded-full bg-brand-forest text-brand-lime flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview, echoing the dashboard */}
          <div className="relative mt-auto pt-10 flex items-end gap-4">
            <div className="w-[58%] rounded-3xl bg-brand-ink text-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full border border-white/20 text-xs">Payments received</span>
                <Eye className="w-4 h-4 text-white/60" />
              </div>
              <p className="text-3xl font-semibold tracking-tight mt-6">{withNaira('₦4,257,000.00')}</p>
              <p className="text-xs text-white/60 mt-1">3 of 7 invoices fully paid</p>
            </div>
            <div className="w-[42%] rounded-3xl bg-white p-5 shadow-xl -mb-2">
              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span>Next return</span>
                <CalendarClock className="w-4 h-4 text-brand-ink" />
              </div>
              <p className="text-2xl font-semibold tracking-tight mt-4">{withNaira('₦86,250')}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-brand-lime/60 text-[11px] font-semibold text-brand-forest">Due 21 Oct</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
