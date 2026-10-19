import React from 'react';
import { Sparkle } from 'lucide-react';

// The VATClear mark: a lime circle with a four-point sparkle, then the wordmark
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight text-brand-ink ${className}`}>
      <span className="w-8 h-8 rounded-full bg-brand-lime text-brand-forest flex items-center justify-center" aria-hidden="true">
        <Sparkle className="w-4 h-4" fill="currentColor" />
      </span>
      VATClear
    </span>
  );
}
