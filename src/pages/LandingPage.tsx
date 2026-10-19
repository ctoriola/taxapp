import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Play,
  Plus,
  Check,
  Sparkle,
  CalendarClock,
  FileText,
  UserPlus,
  BarChart3,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { withNaira } from '../components/dashboard/ui';
import Logo from '../components/Logo';
import { CountUp, Reveal, usePointerParallax } from '../components/landing/motion';
import '../components/landing/landing-motion.css';

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

const TAGS = ['VAT returns', 'Invoices', 'Expenses', 'Reports', 'Smart insights', 'AI assistant'];

// Facts about how the app works, in the slot the reference uses for partner logos
const TAX_FACTS = ['7.5% VAT', 'Due on the 21st', 'TIN on invoices', 'Naira first', 'Lagos time'];

const STEPS = [
  { icon: <UserPlus className="w-5 h-5" />, title: 'Create your account.', text: 'Add your business details and TIN once. It takes about two minutes.' },
  { icon: <FileText className="w-5 h-5" />, title: 'Record invoices and expenses.', text: 'VAT is worked out as you go, at 7.5%, with VAT-free items flagged.' },
  { icon: <CalendarClock className="w-5 h-5" />, title: 'File on time, every month.', text: 'See what you owe before the 21st, then export the figures for your return.' },
];

function SectionLabel({ label, aside }: { label: string; aside: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
      <span className="px-4 py-1.5 rounded-full bg-brand-forest text-brand-lime text-sm font-semibold">{label}</span>
      <span className="text-sm text-brand-ink/70">{aside}</span>
    </div>
  );
}

// Splits a headline into words that rise in one after another
function HeadlineWords({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(' ').map((word, i, words) => (
        <React.Fragment key={i}>
          <span className="word-mask">
            <span className="word" style={{ '--delay': `${(offset + i) * 70}ms` } as React.CSSProperties}>{word}</span>
          </span>
          {i < words.length - 1 && ' '}
        </React.Fragment>
      ))}
    </>
  );
}

// Product preview for the hero: cards echoing the dashboard, around a thin ring. The cards
// assemble on load and drift slightly with the pointer, each at its own depth.
const BARS = [40, 62, 35, 80, 55, 92, 70];

function HeroVisual() {
  const ref = usePointerParallax<HTMLDivElement>();
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[520px] aspect-square" aria-hidden="true">
      <svg className="absolute inset-[4%] w-[92%] h-[92%] -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="49.75" fill="none" strokeWidth="0.5" pathLength={1} className="ring-draw stroke-brand-lime-deep/50" />
      </svg>
      <div className="absolute inset-[22%] rounded-full bg-brand-lime/40 blur-3xl"></div>

      {/* Statistics mini card */}
      <div className="parallax absolute left-[14%] top-[8%] w-[38%]" style={{ '--depth': '10px' } as React.CSSProperties}>
        <div className="enter bg-white rounded-2xl shadow-lg p-3 sm:p-4" style={{ '--delay': '450ms' } as React.CSSProperties}>
          <p className="text-[11px] sm:text-xs font-semibold text-brand-ink">VAT by month</p>
          <div className="mt-2 flex items-end gap-1 h-12 sm:h-16">
            {BARS.map((h, i) => (
              <span
                key={i}
                className={`bar flex-1 rounded-t-sm ${i === 5 ? 'bg-brand-forest' : 'bg-brand-lime'}`}
                style={{ height: `${h}%`, '--delay': `${800 + i * 70}ms` } as React.CSSProperties}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* Lime "next return" card */}
      <div className="parallax absolute right-[2%] top-[13%] w-[58%]" style={{ '--depth': '18px' } as React.CSSProperties}>
        <div className="enter rounded-3xl bg-gradient-to-br from-brand-lime to-brand-lime-deep p-4 sm:p-5 shadow-xl text-brand-ink" style={{ '--delay': '250ms' } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 h-7 pl-3 pr-1 rounded-full bg-brand-forest text-brand-lime text-[10px] font-semibold uppercase tracking-wider">
              Next return
              <span className="w-5 h-5 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center"><Sparkle className="w-3 h-3" fill="currentColor" /></span>
            </span>
            <CalendarClock className="w-4 h-4" />
          </div>
          <p className="text-[11px] sm:text-xs text-brand-ink/70 mt-4">VAT to pay · September</p>
          <p className="text-xl sm:text-3xl font-semibold tracking-tight"><CountUp value={86250} start="mount" delay={500} /></p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold text-brand-up">Due 21 Oct · in 2 days</span>
        </div>
      </div>

      {/* Dark balance card */}
      <div className="parallax absolute left-[6%] top-[54%] w-[60%]" style={{ '--depth': '26px' } as React.CSSProperties}>
        <div className="enter rounded-3xl bg-brand-ink p-4 sm:p-5 shadow-2xl text-white" style={{ '--delay': '650ms' } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full border border-white/20 text-[10px] sm:text-xs">Payments received</span>
            <Eye className="w-4 h-4 text-white/60" />
          </div>
          <p className="text-xl sm:text-3xl font-semibold tracking-tight mt-5"><CountUp value={4257000} start="mount" delay={900} duration={1600} /></p>
          <p className="text-[10px] sm:text-xs text-white/60 mt-1">3 of 7 invoices fully paid</p>
        </div>
      </div>

      {/* Floating chips */}
      <div className="parallax absolute right-[2%] top-[58%] sm:right-[4%] sm:top-[50%]" style={{ '--depth': '34px' } as React.CSSProperties}>
        <div className="pop" style={{ '--delay': '1300ms' } as React.CSSProperties}>
          <div className="float inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur shadow-md text-xs font-medium text-brand-ink">
            <span className="w-6 h-6 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5" /></span>
            Earning +18%
          </div>
        </div>
      </div>
      <div className="parallax absolute right-[16%] bottom-[12%]" style={{ '--depth': '30px' } as React.CSSProperties}>
        <div className="pop" style={{ '--delay': '1550ms' } as React.CSSProperties}>
          <div className="float w-11 h-11 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center shadow-lg" style={{ '--float-delay': '-3s' } as React.CSSProperties}>
            <Check className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Each card shows the real dashboard component it describes (public/landing, captured from a demo account)
const FEATURES = [
  { title: 'Spending at a glance', text: 'Every expense grouped by category, month by month, with the biggest changes called out.', image: '/landing/spending.webp', alt: 'Spending card: a ring chart of expenses by category', tone: 'from-brand-lime-soft to-brand-lime' },
  { title: 'Real-time VAT tracking', text: 'VAT charged, VAT on expenses and what you owe, updated as you record each sale and cost.', image: '/landing/vat.webp', alt: 'Next return card showing VAT to pay and its due date', tone: 'from-brand-lime-deep to-[#6FB83C]' },
  { title: 'Invoices and expenses', text: 'Invoices with your TIN, part payments, and expenses you approve in one tap.', image: '/landing/transactions.webp', alt: 'Transactions card with an expense awaiting approval and recent invoices', tone: 'from-brand-lime to-brand-lime-deep' },
  { title: 'Smart insights and AI', text: 'Overdue invoices and unfiled returns flagged, and an assistant that explains your figures.', image: '/landing/insights.webp', alt: 'Smart insights flagging an unfiled VAT return and overdue invoices', tone: 'from-brand-lime-soft to-brand-lime' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const primaryCta = user ? { to: '/dashboard', label: 'Open dashboard' } : { to: '/signup', label: 'Get started free' };

  return (
    <div className="min-h-screen bg-brand-canvas text-brand-ink">
      {/* Navbar */}
      <header className={`sticky top-0 z-50 bg-brand-canvas/85 backdrop-blur border-b transition-colors duration-300 ${scrolled ? 'border-brand-ink/10' : 'border-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" aria-label="VATClear home"><Logo /></Link>
          <nav aria-label="Sections" className="hidden md:flex items-center gap-8 text-sm text-brand-ink/80">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-brand-ink">{item.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <>
                <button type="button" onClick={handleLogout} className="text-sm font-semibold text-brand-green hover:underline">Sign out</button>
                <Link to="/dashboard" className="h-10 px-5 inline-flex items-center rounded-full border border-brand-forest text-sm font-semibold text-brand-forest hover:bg-white transition-colors">Dashboard</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-brand-green hover:underline">Log in</Link>
                <Link to="/signup" className="h-10 px-5 inline-flex items-center rounded-full border border-brand-forest text-sm font-semibold text-brand-forest hover:bg-white transition-colors">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center">
          <div>
            <h1 className="text-[40px] sm:text-6xl font-semibold leading-[1.05] tracking-tight">
              <HeadlineWords text="See your VAT" />{' '}
              <span className="text-brand-green"><HeadlineWords text="before the taxman does" offset={3} /></span>
            </h1>
            <p className="enter mt-6 text-base sm:text-lg text-brand-ink/70 max-w-md leading-relaxed" style={{ '--delay': '550ms' } as React.CSSProperties}>
              Invoices, expenses and VAT in one place, built for Nigerian SMEs. Know what you owe, when it's due, and what to do next.
            </p>
            <div className="enter mt-8 flex flex-wrap items-center gap-4" style={{ '--delay': '700ms' } as React.CSSProperties}>
              <Link to={primaryCta.to} className="h-12 px-7 inline-flex items-center gap-2 rounded-full bg-brand-lime text-brand-ink font-semibold hover:bg-brand-lime-deep transition-colors">
                {primaryCta.label}
                <ArrowUpRight className="cta-arrow w-4 h-4" />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center gap-3 font-semibold text-brand-ink group">
                <span className="ripple relative w-12 h-12 rounded-full bg-brand-forest text-brand-lime flex items-center justify-center group-hover:bg-brand-forest-hover transition-colors">
                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                </span>
                See how it works
              </a>
            </div>
            <div className="enter mt-10 pt-6 border-t border-brand-ink/15 max-w-md" style={{ '--delay': '850ms' } as React.CSSProperties}>
              <ul className="flex flex-wrap gap-2" aria-label="What's included">
                {TAGS.map((tag) => (
                  <li key={tag} className="px-3.5 py-1 rounded-full border border-brand-ink/25 text-xs text-brand-ink/80">{tag}</li>
                ))}
              </ul>
            </div>
          </div>
          <HeroVisual />
        </section>

        {/* Tax facts strip, in place of partner logos */}
        <section aria-label="Built for Nigerian tax" className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <p className="text-center text-sm text-brand-green font-medium">Built around Nigerian tax rules</p>
          <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4 items-center">
            {TAX_FACTS.map((fact, i) => (
              <Reveal as="li" key={fact} delay={i * 90} className="text-center text-xl sm:text-2xl font-bold tracking-tight text-brand-ink/45">
                <span className="fact" style={{ '--delay': `${2 + i * 2}s` } as React.CSSProperties}>{fact}</span>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 scroll-mt-24">
          <Reveal><SectionLabel label="Features" aside="Everything you need, nothing you don't." /></Reveal>
          <Reveal as="h2" delay={100} className="text-2xl sm:text-4xl font-semibold leading-snug tracking-tight max-w-4xl">
            Get <span className="highlight text-brand-green" style={{ '--delay': '500ms' } as React.CSSProperties}>VAT clarity</span> and take control of your business with tools that simplify invoicing, track every expense, and keep your{' '}
            <span className="highlight text-brand-green" style={{ '--delay': '900ms' } as React.CSSProperties}>tax returns</span> on time, all in one secure app.
          </Reveal>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(({ title, text, image, alt, tone }, i) => (
              <Reveal key={title} delay={i * 110} className={`feature-card relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} h-[400px] sm:h-[420px] p-5`}>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-brand-ink/75 leading-relaxed">{text}</p>
                <img
                  src={image}
                  alt={alt}
                  loading="lazy"
                  width={640}
                  className="absolute left-1/2 -translate-x-1/2 top-[44%] w-[88%] max-w-[300px] rounded-[18px] shadow-2xl shadow-brand-forest/20 ring-1 ring-black/5"
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* How it works: full-bleed lime band */}
        <Reveal as="section" id="how-it-works" className="relative overflow-hidden bg-brand-lime scroll-mt-16 !opacity-100 !transform-none">
          <p aria-hidden="true" className="watermark absolute inset-x-0 bottom-[-0.18em] text-center font-bold tracking-tighter leading-none text-white/25 text-[22vw] select-none pointer-events-none">
            VATClear
          </p>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Dark balance card */}
            <Reveal className="w-full max-w-md mx-auto lg:mx-0 rounded-[28px] bg-brand-ink text-white p-6 shadow-2xl" aria-hidden="true">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 text-sm">
                  <span className="w-5 h-5 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center text-[11px] font-bold">₦</span>
                  Naira
                </span>
                <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center"><Eye className="w-4 h-4 text-white/70" /></span>
              </div>
              <p className="text-sm text-white/60 mt-12">Owed to you</p>
              <p className="text-4xl sm:text-5xl font-semibold tracking-tight mt-1"><CountUp value={1252375} delay={300} duration={1600} /></p>
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
                <span className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-white/20 text-sm"><ArrowDownLeft className="w-4 h-4" />Expense</span>
                <span className="inline-flex items-center gap-2 h-11 px-4 rounded-full border border-white/20 text-sm"><ArrowUpRight className="w-4 h-4" />Invoice</span>
                <span className="ml-auto w-12 h-12 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center"><Plus className="w-5 h-5" strokeWidth={2.5} /></span>
              </div>
            </Reveal>

            <div>
              <Reveal as="h2" className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight max-w-md">Start managing your VAT in 3 easy steps</Reveal>
              <ol className="relative mt-8 space-y-6">
                <span aria-hidden="true" className="step-line absolute left-[21px] top-6 bottom-6 w-0.5 rounded-full bg-brand-forest/25"></span>
                {STEPS.map((step, i) => (
                  <Reveal as="li" key={step.title} delay={200 + i * 180} className="relative flex gap-4 max-w-md">
                    <span className="w-11 h-11 rounded-full bg-brand-forest text-brand-lime flex items-center justify-center flex-shrink-0">{step.icon}</span>
                    <p className="text-sm sm:text-base leading-relaxed text-brand-ink/85">
                      <span className="font-semibold text-brand-ink">{step.title}</span> {step.text}
                    </p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-16">
          <Reveal><SectionLabel label="Pricing" aside="Free during early access." /></Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Everything included, <span className="highlight text-brand-green">free while we're in early access</span>
              </h2>
              <p className="mt-4 text-brand-ink/70 max-w-md leading-relaxed">
                No card needed. Early users keep their data and get plenty of notice before any paid plan starts.
              </p>
            </Reveal>
            <Reveal delay={150} className="rounded-[28px] bg-white p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-lg font-semibold">Early access</p>
                <p className="text-4xl font-semibold tracking-tight">{withNaira('₦0')}<span className="text-base font-medium text-brand-muted"> / month</span></p>
              </div>
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {['Unlimited invoices', 'Expense tracking and approval', 'Monthly VAT reports and CSV export', 'Smart insights and reminders', 'AI assistant', 'Secure cloud backup'].map((item, i) => (
                  <li key={item} className="flex items-center gap-2">
                    <span style={{ '--delay': `${500 + i * 110}ms` } as React.CSSProperties} className="tick w-5 h-5 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3" strokeWidth={3} /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={primaryCta.to} className="mt-8 h-12 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-forest text-brand-lime font-semibold hover:bg-brand-forest-hover transition-colors">
                {primaryCta.label}
                <ArrowUpRight className="cta-arrow w-4 h-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-ink/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <Logo />
          <p className="flex items-center gap-2 text-sm text-brand-ink/70">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            Estimates to help you plan, not tax advice. Confirm figures with a tax professional before filing.
          </p>
          <p className="text-sm text-brand-ink/60">&copy; {new Date().getFullYear()} VATClear</p>
        </div>
      </footer>
    </div>
  );
}
