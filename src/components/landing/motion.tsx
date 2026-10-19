import React, { useEffect, useRef, useState } from 'react';
import { withNaira } from '../dashboard/ui';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// True once the element has scrolled into view (and stays true)
export function useInView<T extends Element>(threshold = 0.2): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, inView]);
  return [ref, inView];
}

type RevealProps = {
  as?: keyof JSX.IntrinsicElements;
  delay?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>;

// Fades and lifts its content in when it scrolls into view
export function Reveal({ as = 'div', delay = 0, className = '', children, style, ...rest }: RevealProps) {
  const [ref, inView] = useInView<HTMLElement>();
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={{ ...style, '--delay': `${delay}ms` } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const naira = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A naira amount that counts up from zero once it's visible (or on mount, with start="mount")
export function CountUp({ value, duration = 1400, delay = 0, start = 'view' }: { value: number; duration?: number; delay?: number; start?: 'view' | 'mount' }) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.4);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const go = start === 'mount' || inView;

  useEffect(() => {
    if (!go || prefersReducedMotion()) {
      if (prefersReducedMotion()) setShown(value);
      return;
    }
    let frame = 0;
    let begin = 0;
    const tick = (time: number) => {
      if (!begin) begin = time + delay;
      const t = Math.min(1, Math.max(0, (time - begin) / duration));
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [go, value, duration, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {withNaira(`₦${naira.format(shown)}`)}
    </span>
  );
}

// Sets --px/--py (-1..1) on the element from the pointer position, for gentle depth on desktop
export function usePointerParallax<T extends HTMLElement>(): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia?.('(pointer: fine)').matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        el.style.setProperty('--px', Math.max(-1, Math.min(1, x)).toFixed(3));
        el.style.setProperty('--py', Math.max(-1, Math.min(1, y)).toFixed(3));
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    };
    const section = el.closest('section') || el;
    section.addEventListener('pointermove', move as EventListener);
    section.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener('pointermove', move as EventListener);
      section.removeEventListener('pointerleave', leave);
    };
  }, []);
  return ref;
}
