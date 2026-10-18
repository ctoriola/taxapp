import React from 'react';
import { AlertCircle } from 'lucide-react';

// Shows why data failed to load, instead of silently rendering empty lists and ₦0 totals
export default function DataErrorBanner({ errors, className = '' }: { errors: (string | null | undefined)[]; className?: string }) {
  const messages = Array.from(new Set(errors.filter((e): e is string => !!e)));
  if (messages.length === 0) return null;

  return (
    <div role="alert" className={`bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        {messages.map((message) => (
          <p key={message} className="text-sm text-red-700">{message}</p>
        ))}
      </div>
    </div>
  );
}
